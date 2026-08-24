# Generic Archive Foundation Placement

## Status

**Accepted**, 2026-08-23. The architectural direction is accepted; individual additions to `shared`, `oldaplib`, or `oldap-api` still require evidence-based review and implementation approval.

## Context

Every ordinary OLDAP project owns four named graphs:

| Graph | Responsibility |
| --- | --- |
| `<project>:shacl` | SHACL shapes for future validation and the semantic template used to construct user interfaces |
| `<project>:onto` | OWL definitions used for reasoning |
| `<project>:lists` | Hierarchical lists and taxonomies, which sit between schema and instance data |
| `<project>:data` | Project instances |

The special `oldap:shacl` and `oldap:onto` graphs provide engine-level definitions. `shared:shacl` and `shared:onto` provide reusable definitions that every project can reference automatically.

The implementation reflects this architecture directly:

- resource-class superclass resolution recognizes the current project, `oldap`, and `shared` as special local model sources;
- `ResourceInstanceFactory` loads the requested project data model and the Shared data model;
- project and connection queries explicitly include `oldap:onto` and `shared:onto` where platform definitions are required;
- model caches are keyed by project SHACL graph.

Adding another automatically available schema graph would therefore require more than storing triples in a new named graph. It would introduce ontology-module dependency resolution throughout model loading, inheritance, instance construction, querying, caching, API responses, versioning, and administration.

## Decision

Place the first generic archive foundation in `shared:shacl` and `shared:onto`.

Treat Shared as OLDAP's stable library of optional, cross-project semantic building blocks. Availability does not imply that every project must inherit or instantiate every Shared class. A museum project may use generic media and rights building blocks without using `shared:ArchiveUnit`; an archival project may use the complete archive hierarchy.

Do not introduce a separate automatically inherited archive graph now. Reconsider dependency-managed ontology modules only when several reusable modules need genuinely independent installation or version lifecycles.

Build this foundation bottom-up. Start with the smallest real Chama workflows, keep experimental concepts in the project ontology, and promote only demonstrated cross-domain semantics into Shared. KISS applies to the ontology as well as to the application.

Media-first is a first-class, proportionate default, especially for small institutions whose collections are primarily photographs, scans, audio, or video. It is not a restriction on richer archival modelling:

- a media resource may be catalogued independently;
- an archive or cultural object may exist without any media representation;
- an archive or cultural object may link to any number of heterogeneous media representations;
- media may be added, replaced, or regenerated without changing the identity of the represented object;
- projects may combine media-first and object-first patterns according to their actual holdings.

## Logical Modules Without New Runtime Graphs

Shared can remain modular in source and documentation while continuing to load into the same two runtime graphs. For example:

- Shared media;
- Shared archive structure;
- Shared staging and ingest;
- Shared provenance and contributions;
- Shared rights and access;
- Shared narrative foundations, if later justified.

These may be maintained as separate source fragments, generated sections, tests, and documentation pages while being assembled into `shared:shacl` and `shared:onto` during system initialization. This improves human maintainability without changing project dependency semantics. The exact source-file split is an implementation decision for `oldaplib`, not a reason to expose additional named graphs.

## Layer Contract

### `oldap`

Contains only definitions required for the OLDAP engine and its invariants, including users, projects, permissions, base resource behavior, and fundamental value structures such as dating.

A concept does not belong in `oldap` merely because many applications use it. It belongs there only when OLDAP itself cannot function correctly without it.

### `shared`

Contains stable, domain-neutral building blocks that projects may reuse without copying their semantics:

- archive structure;
- media representation and ingest preparation;
- cross-project descriptive or provenance patterns after validation;
- narrowly defined relationships that are not adequately supplied by established external vocabularies.

Shared classes should be useful to art, museum, library, historical, and research collections. They may be optional in practice while remaining globally available.

### Project Ontologies

Contain domain meaning and project workflow constraints:

- Chama locomotives, railway structures, routes, and operating activities;
- Fasnacht objects, events, organizations, and project taxonomies;
- museum-specific object classes, accession semantics, and local authority links;
- stricter cardinalities, controlled lists, labels, field grouping, and editorial states where these are project decisions.

### External Vocabularies

Established external terms should be reused when their semantics fit. Dublin Core, schema.org, SKOS, GeoSPARQL, and later evaluated provenance, annotation, depiction, and rights vocabularies should not be duplicated in Shared merely to give them an OLDAP namespace.

OLDAP SHACL shapes may constrain external classes and properties for a concrete workflow while OWL retains their established semantics.

## Shared Admission Criteria

A class or property should enter Shared only when all applicable criteria are satisfied:

1. **Cross-domain evidence:** it is required by at least two materially different project contexts, or it is foundational to the generic archive workflow itself.
2. **Domain neutrality:** its meaning does not contain Chama, Fasnacht, museum-specific, or institution-specific assumptions.
3. **Semantic precision:** it represents one stable concept rather than combining convenient but different meanings such as depicted, digitized, and broadly related.
4. **External-vocabulary check:** no established vocabulary already provides an adequate term with acceptable semantics and maintenance prospects.
5. **Minimal base constraints:** Shared SHACL expresses only invariants that are safe for every inheriting project. Project shapes may add stricter requirements and UI-specific conventions.
6. **Backward-compatible evolution:** additions are preferred; tightening cardinalities, changing domains or ranges, and deleting terms require explicit migration analysis.
7. **Independent usefulness:** a project can use the building block without importing an unrelated application workflow.
8. **Documented lifecycle:** semantics, examples, tests, version impact, and deprecation behavior are maintained as part of the OLDAP platform contract.

An experimental or merely plausible concept remains in a project ontology until these criteria are met.

## Initial Foundation Inventory

### Existing Shared Building Blocks to Retain

| Building block | Current role | Assessment |
| --- | --- | --- |
| `shared:ArchiveUnit` and archive levels | Hierarchical archival description | Good generic archive module; projects opt into it |
| `shared:parentArchiveUnit` | Archive hierarchy | Retain |
| `shared:MediaObject` | Technical identity and access metadata for media | Essential generic base |
| `shared:hasMediaObject` | Media attached to an archive unit | Retain for compatibility; current archive-specific domain needs review |
| `shared:StagingArea`, folders, and staging media | Generic ingest preparation | Retain as an optional workflow module |
| `oldap:Dating` | Qualified date or date range | Reuse across projects; it remains an engine-level value structure |

### High-Value Candidates for the First Chama Ontology

These concepts are needed for the experiment but should initially be tested in the Chama project namespace or represented with suitable external terms:

| Candidate | Current evidence | Promotion condition |
| --- | --- | --- |
| Generic relation from any described resource to a media representation | Archive-first Chama, museum example, current archive-only `hasMediaObject` boundary | Confirm semantics and whether a new superproperty is safer than broadening the existing domain |
| Descriptive media base class | Fasnacht `ArchiveMediaObject` and Chama media-first panorama | Compare the exact common property intersection and avoid inheriting Fasnacht workflow constraints |
| Direct visual depiction relation | All six Chama photographs and Fasnacht's broad representation relation | Select an established external property if suitable; keep depiction distinct from digitization and `about` |
| Knowledge contribution | All six Chama annotations | Exercise create/edit/read workflows and compare with a second real institutional contribution workflow |
| Public-display decision, credit line, and rights-review note | All Chama photographs; Fasnacht publication and licence fields | Specify the rights workflow and evaluate established rights vocabularies before promotion |
| Precise creation and digitization roles | `PICT0111.jpg`; Fasnacht creator/provider distinction | Test whether explicit properties are sufficient or a reusable activity/role pattern is justified |

### Concepts to Keep Outside Shared for Now

- a universal `Asset` or `DescribedResource` ontology class;
- Chama railway classes and relationships;
- Fasnacht's `CarnivalThing`, taxonomies, and publication conventions;
- a fixed Creative Commons requirement;
- a generic Story class before Chama and at least one other narrative workflow are compared;
- claim-level assertion reification;
- a general event-participation framework;
- project presentation configuration;
- shared instance data such as project agents, places, locomotives, or museum objects.

## SHACL and UI Implications

Because SHACL is both a future validation source and a UI template, Shared shapes need particular restraint:

- Shared defines semantic properties, human-readable multilingual labels, and genuinely universal constraints.
- Project subclasses define domain-specific required fields, allowed lists, ordering, field groups, editor choices, and stricter cardinalities.
- SALSAH presentation configuration decides compact cards, featured fields, public/internal visibility, and narrative emphasis without overriding validation or authorization.
- A Shared class must not require a licence, workflow state, lead image, institution-specific identifier, or other field merely because one current application requires it.

This keeps the globally available base useful without making all OLDAP projects look or behave alike.

## Shared Data Versus Shared Definitions

This proposal concerns reusable schema definitions. Project instance data remains in `<project>:data`.

Do not place agents, places, authority records, collection objects, or project taxonomies in a global Shared data graph merely because several projects might mention them. Cross-project instance identity, edit authority, visibility, provenance, and reconciliation require a separate governance design.

Small closed enumerations that are part of the semantic contract, such as archive levels, may remain ontology individuals. Project-controlled vocabularies continue to belong in `<project>:lists`.

## Evolution Rules

Shared behaves like a public platform API because every project can reference it automatically.

- Prefer additive releases.
- Do not tighten existing base-shape cardinalities without checking all dependent projects and data.
- Deprecate before removal.
- Record the Shared schema version and migration notes.
- Test existing Fasnacht and future Chama models against every Shared change.
- Keep oldaplib and oldap-api changes backward-compatible whenever reasonably possible.
- Promote a project pattern only after its generic semantics, not merely its code, have stabilized.

## When a Separate Module Graph Becomes Justified

A new module mechanism becomes worthwhile when Shared contains several large optional domains that need independent release cycles, dependency versions, installation choices, or administrative ownership.

That future feature would need an explicit project declaration such as “uses ontology module,” plus:

- dependency and version resolution;
- deterministic SHACL and OWL graph closure;
- superclass and property lookup across modules;
- merged resource-factory models;
- cache keys and invalidation based on module versions;
- query and reasoning integration;
- API exposure and authorization;
- upgrade, deprecation, and migration behavior.

Until that requirement is concrete, a separate archive graph would add structural machinery without improving the semantics available to projects.

## Consequence for the Next Increment

Draft the minimal Chama ontology against the existing `oldap` and `shared` foundations. Keep uncertain generic candidates in the Chama namespace or use external terms. For every candidate, record whether it is:

1. an existing Shared reuse;
2. a project-local experiment;
3. an external-vocabulary reuse;
4. a potential later Shared promotion.

No Shared change should be made merely to make the first Chama import convenient.
