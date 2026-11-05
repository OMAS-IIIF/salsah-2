"""Read-only SALSAH contract probe, run inside the home OLDAP API container.

Uses the container's existing bootstrap account without exposing credentials.
No resources, roles or configuration are changed. Search POSTs only read data.
This checks live API shapes; browser workflows have separate Playwright tests.
"""
import json
import os
from urllib.parse import quote
import requests
from oldap_api.backend import create_connection

con = create_connection(userId=os.environ['OLDAP_AUTH_ADMIN_USER'],
                        credentials=os.environ['OLDAP_AUTH_ADMIN_PASSWORD'])
session = requests.Session()
session.headers['Authorization'] = 'Bearer ' + con.token
base = 'http://127.0.0.1:8000'
report = {'backend': con.__class__.__name__, 'projects': {}, 'failures': []}


def call(method, path, payload=None):
    """Retain only statuses and decoded resource data; never log tokens."""
    response = session.request(method, base + path, json=payload, timeout=90)
    if response.status_code != 200:
        report['failures'].append({'path': path, 'status': response.status_code,
                                   'body': response.text[:250]})
        return None
    return response.json()


for project in ('chama', 'fasnacht'):
    entry = report['projects'][project] = {}
    model = call('GET', '/admin/datamodel/' + project)
    entry['model_type'] = type(model).__name__
    if isinstance(model, dict):
        entry['model_keys'] = list(model)
        entry['inverse_properties'] = [p for resource in model.get('resources', []) for p in resource.get('properties', []) if p.get('inverseOf')]
    entry['shared_model_ok'] = isinstance(call('GET','/admin/datamodel/shared'), dict)
    recent = call('POST', '/data/search/' + project, {
        'resClass': 'oldap:Thing', 'includeProperties': ['schema:name','oldap:lastModificationDate'],
        'sortBy': [{'property':'oldap:lastModificationDate','direction':'desc'}], 'limit':8})
    entry['recent_count'] = len(recent) if isinstance(recent,list) else None
    roots = call('POST', '/data/search/' + project, {'resClass':'shared:ArchiveUnit',
        'includeProperties':['schema:name','shared:archiveLevel','shared:parentArchiveUnit','shared:hasMediaObject','schema:position'],
        'filter':[{'property':'shared:parentArchiveUnit','op':'NOT_EXISTS'}], 'limit':100,'offset':0})
    entry['archive_roots'] = len(roots) if isinstance(roots,list) else None
    hits = call('GET', '/data/text/' + project + '?q=' + ('Chama' if project=='chama' else 'Fasnacht') + '&limit=24')
    entry['text_hits'] = len(hits) if isinstance(hits,list) else None
    if isinstance(recent,list) and recent:
        entry['sample_iri'] = recent[0]['iri']
        record = call('GET', '/data/' + project + '/' + quote(recent[0]['iri'], safe=''))
        entry['record_type'] = type(record).__name__
        entry['record_keys'] = list(record) if isinstance(record,dict) else []
    if isinstance(recent, list) and recent:
        summaries=call('POST','/data/summaries/'+project, {
            'iris':[r['iri'] for r in recent], 'includeProperties':['schema:name','shared:hasMediaObject',
            'shared:mediaAccessMode','shared:protocol','shared:serverUrl','shared:assetId','shared:mediaUrl','shared:thumbnailUrl'],
            'includeMediaDelivery':True})
        entry['summary_count']=len(summaries.get('resources',[])) if isinstance(summaries,dict) else None
        entry['media_delivery_count']=sum(bool(r.get('mediaDelivery')) for r in summaries.get('resources',[])) if isinstance(summaries,dict) else None
    staging=call('POST','/data/search/'+project, {'resClass':'shared:StagingArea',
        'includeProperties':['schema:name','shared:mediaPath','shared:stagingDefaultRole','shared:stagingQuotaBytes'],
        'filter':[], 'limit':100,'offset':0})
    entry['staging_areas']=len(staging) if isinstance(staging,list) else None
    caps=call('GET','/archive/'+project+'/structure/capabilities')
    entry['archive_capabilities'] = caps
# Inventory project axioms separately: UI compatibility is not OWL inference.
report['chama_owl_axioms'] = con.query('''PREFIX owl:<http://www.w3.org/2002/07/owl#>
SELECT ?g ?s ?p ?o WHERE {GRAPH ?g {?s ?p ?o}
VALUES ?p {owl:inverseOf owl:equivalentClass owl:equivalentProperty}
FILTER(CONTAINS(STR(?g),"chama"))}''')['results']['bindings']
links=con.query('''PREFIX c:<https://chama.salsah.org/ns/> SELECT ?annotation ?target WHERE {
GRAPH c:data {?annotation c:describes ?target}} LIMIT 5''')['results']['bindings']
report['contribution_navigation']=[]
for link in links:
    target=link['target']['value']
    data=call('GET','/data/chama/'+quote(target,safe=''))
    report['contribution_navigation'].append({'annotation':link['annotation']['value'],'target':target,
        'inverse_field_returned': bool(data and data.get('chama:hasKnowledgeContribution'))})
report['status'] = 'passed' if not report['failures'] else 'failed'
print(json.dumps(report,indent=2))
raise SystemExit(0 if not report['failures'] else 1)
