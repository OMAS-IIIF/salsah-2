# Minimal Data Model v0.1

## Status and Purpose

This is a working model derived from six reviewed Chama photographs. It identifies the smallest useful semantic boundaries for the first SALSAH 2 vertical slice without yet defining final IRIs, SHACL cardinalities, import mappings, or user-interface components.

The document is intentionally provisional. Chama is evidence for the model, not the product domain. Every generic concept must remain useful for materially different assets from art, culture, history, and research.

## Evidence Base

The first slice uses these reviewed records:

| Record | Evidence introduced |
| --- | --- |
| `file-photo-1508` | Multiple depicted locomotives, a facility, maintenance activity, view direction, sensory memory, and an uncertain machine identification |
| `file-photo-1520` | A historic building, functional space, route history, restoration, personal attachment, and a visual observation distinct from contributor knowledge |
| `file-photo-1521` | Naming history, associated person and organization, approximate construction date, renovation event, and repeated personal visits |
| `file-photo-1751` | Locomotive identity and class, manufacturer and operators, technical characteristics, operating context, and panoramic file dimensions |
| `file-photo-0171` | Building history and function, current activity, personal evaluation, public-display clearance, and a possible depicted-person review |
| `file-photo-1981-trip` | Distinct photographer and digitizer roles, slide original, digital representation, invalid embedded date, requested credit, and related Super-8 documentation |

The source annotations in `../../demo-data/annotations/` preserve the evidence from which this model is derived.

## Three Deliberate Layers

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Generic archival semantics | Durable concepts that recur across institutions and domains | Described resource, archival unit, media representation, agent, place, date, provenance, rights, contribution, subject, depiction |
| Project-domain semantics | Concepts and relationships supplied by a project's ontology | Locomotive, locomotive class, railroad, station, trestle, route segment, gradient, operator |
| Presentation configuration | Decisions about how data is labelled, ordered, emphasized, and exposed | Card title, field groups, preferred thumbnail, public caption, featured relationships, specialist terminology, public/internal visibility |

SALSAH application code must not know what a locomotive or trestle is. It should render and edit resource classes and properties according to OLDAP semantics and project presentation configuration.

## Minimal Generic Conceptual Model

### 1. Described Resource

`Described Resource` is a SALSAH product concept, not yet a proposed ontology class. It means any OLDAP resource that a project configures for discovery, viewing, or editing. Depending on the project, it may be an archival item, artwork, photograph, building, person, event, scientific object, or another domain resource.

The generic SALSAH core should therefore depend on `oldap:Thing` plus ontology and shape metadata, not on one universal `Asset` subclass.

The Chama photo slice exposes two credible patterns that must be tested before choosing one:

- **archive-first:** a `shared:ArchiveUnit` at level `shared:Item` describes the photograph and links to one or more `shared:MediaObject` files;
- **media-first:** a project media class derived from `shared:MediaObject` is itself the searchable catalogue resource, as in the Fasnacht ontology.

The archive-first pattern expresses the 1981 slide, its JPEG digitization, and future derivatives clearly. The media-first pattern may be proportionate for a born-digital HEIC photograph and avoids creating a nearly empty wrapper resource. Version 0.1 therefore keeps this choice open until one analogue-derived and one born-digital photograph have been instantiated both ways.

Minimum descriptive needs:

- stable identifier;
- multilingual title;
- multilingual normalized description;
- date or date range, including precision and basis where known;
- links to media representations;
- subjects and depicted resources;
- creation and contribution agents with distinguishable roles;
- capture or creation place where applicable;
- provenance and rights information.

### 2. Media Resource and Representation

A digital file's technical identity is not identical to the intellectual content it carries. That distinction must remain expressible, although it does not require two resource records in every project. `shared:MediaObject` already provides a useful technical boundary and supports media type, access mode, original filename, MIME type, checksum, server identifiers, protocol, paths, and derivatives.

This distinction supports:

- one photograph with an original scan and later derivatives;
- a Super-8 work with a preservation master and a Chama excerpt;
- replacement or regeneration of IIIF derivatives without changing descriptive identity;
- fixity checks on files independently of catalogue text.

Open boundaries:

- `shared:hasMediaObject` currently has `shared:ArchiveUnit` as its domain. A future museum object may need media without being an archive unit.
- A media-first catalogue resource combines technical file identity with descriptive content. This is useful but may be insufficient when an analogue original, multiple scans, or several derivatives need distinct identities.

Do not change the shared ontology yet. First instantiate the two Chama cases and determine whether the existing relations, a project relation, or a backward-compatible shared broadening is the sound OLDAP design.

### 3. Agent and Role

People and organizations are reusable resources. The role must be explicit enough to distinguish:

- photographer;
- digitizer;
- contributor of descriptive knowledge;
- manufacturer;
- operator;
- rights holder;
- depicted or associated person.

Version 0.1 does not require a general participation/event framework. Use existing standard creator and contributor relations where their meaning is accurate, and add narrowly justified role properties in the project ontology. Introduce a reusable role or event pattern only when multiple projects demonstrate the same need.

### 4. Place and Time

Capture place, depicted place, and a place mentioned in historical context are different relationships. Likewise, the date of capture, construction date of a depicted building, renovation date, and digitization date must not share one undifferentiated field.

Version 0.1 needs:

- an OLDAP place resource or suitable external place class;
- capture or creation place where applicable;
- subject/about relationships to other places;
- `oldap:Dating` for exact, approximate, ranged, or otherwise qualified dates;
- a textual date basis when machine metadata and human knowledge differ.

View direction is useful for photographs but is not an application-core concept. It belongs in the photographic project model or a later reusable media-description module.

### 5. Subject and Depiction

The six photographs prove that broad subject matter and direct visual depiction should remain distinguishable:

- `about`: the resource concerns a topic or entity;
- `depicts`: the entity is visually present in the photograph or film.

`schema:about` is already available in the shared archive shape. A generic `depicts` relation is a candidate shared addition, but it must be checked against existing vocabularies and a second collection before implementation.

The target of either relationship should be an ordinary OLDAP resource. SALSAH can then show the same linked locomotive, building, person, or event in search facets and contextual navigation without hard-coded domain logic.

### 6. Knowledge Contribution

The owner annotations demonstrate a generic need to preserve supplied knowledge before normalization. A minimal knowledge contribution should retain:

- the resource it describes;
- contributor;
- contribution date;
- language;
- source context;
- original wording;
- normalized public description;
- uncertainty or editorial note;
- documented normalization decisions.

Version 0.1 should keep one contribution as a coherent source record. It should **not** reify every sentence as a separate claim. Claim-level provenance becomes justified when sources conflict, assertions need individual citations, or research workflows must compare competing interpretations.

`Knowledge Contribution` is a conceptual name only. Before adding it to `shared`, compare it with Dublin Core provenance resources, Web Annotation, PROV-O, RiC-O, and the practical needs of a second project. Standards should inform the smallest usable design rather than dictate a complete framework.

### 7. Rights, Access, and Attribution

These facts must remain separate:

- copyright or other rights status;
- identified rights holder, if known;
- permission for public display;
- requested credit line;
- access restrictions;
- review state and evidence or basis.

The `PICT0111.jpg` record shows why a requested joint credit must not be treated as proof of joint authorship or copyright. Similarly, creator permission does not remove a proportionate depicted-person review where necessary.

For the first slice, use existing rights-holder and access-condition semantics where possible and add only the missing project properties required for public-display status, credit line, and review note. A separate rights resource is deferred until multiple permissions, licences, territories, or time-dependent conditions make grouped properties inadequate.

### 8. Narrative Context

Personal recollections are evidence and storytelling material, but they are not neutral catalogue descriptions. Version 0.1 keeps them within the attributed knowledge contribution and may display them separately.

A standalone `Story` resource, editorial sequencing, and reusable story blocks belong to a later narrative vertical slice. The current model must preserve enough attribution and links to support that work without implementing a content-management system now.

## Chama Project-Domain Model

The following concepts belong in the Chama ontology or its controlled vocabularies, never in generic SALSAH components:

| Candidate resource class | Examples |
| --- | --- |
| Photograph | The six reviewed intellectual photographic records |
| Locomotive | C&TS 488 and 489 |
| Locomotive class | K-36 and K-37 |
| Railway organization | C&TS and D&RGW |
| Railway structure | Lobato Trestle, Chama station, engine house, coaling tower |
| Rolling stock | Converted boxcars and other cars when individually identified |
| Route or route segment | Chama–Cumbres and former Chama–Durango continuation |
| Building or business | Foster's Hotel and Saloon, Shamrock Hotel / The Hotel & Shops |
| Railway activity or event | Departure preparation, overnight fire maintenance, train arrival |

Possible project relationships include locomotive class, manufacturer, operator, former operator, railway route, and historical function. Exact properties should be introduced only when the first records are instantiated; readable descriptions are sufficient for details that are not yet independently useful for search or linking.

Names over time require care. `Shamrock Hotel` and `The Hotel & Shops` may be names of one building in different periods, not necessarily separate building resources. Version 0.1 should prefer one resource with time-qualified names unless evidence shows distinct businesses or institutional identities that users need to navigate separately.

## Presentation Configuration

The following choices belong to project configuration rather than ontology semantics or generic component code:

- display labels such as `Photograph`, `Locomotive`, or `Personal recollection`;
- field ordering and grouping;
- compact card fields and primary thumbnail;
- whether a resource class appears in global navigation or search filters;
- which relationships are featured as contextual links;
- public caption versus specialist descriptive fields;
- visibility of uncertainty and editorial notes to public or internal audiences;
- terminology such as `Nr. 488`, `#488`, `C&TS`, or the expanded organization name;
- project-specific visual identity and narrative composition.

Presentation configuration may hide or emphasize ontology fields, but it must never weaken OLDAP validation or authorization.

## Comparison with the Fasnacht Ontology

The current Fasnacht ontology in `../../oldap-tools/fasnacht/fasnacht-onto.yaml` is the first real cross-project comparison. It is domain-specific, but several of its modelling decisions directly inform SALSAH 2.

### Patterns that Confirm the v0.1 Direction

| Fasnacht pattern | Lesson for SALSAH 2 |
| --- | --- |
| `CarnivalThing` / `ArchiveObject` is distinct from `ArchiveMediaObject` | The represented cultural object or event must not be confused with its digital media |
| `ArchiveMediaObject` derives from `shared:MediaObject` and can carry title, description, date, creator, location, topics, rights, and publication status | A media-first catalogue workflow is a genuine requirement and must remain possible |
| The link from media to a `CarnivalThing` is optional in the current YAML, while topics and organizations can be attached directly to media | A photograph must remain cataloguable even when no separately modelled depicted object exists |
| `contributingAgent` is distinct from `dcterms:creator` | File provider or depositor must not be confused with authorship |
| `creationDating` explicitly concerns original analogue or born-digital content, not later digitization | Capture or creation date and digitization date need distinct semantics |
| `Place` supports alternate names, hierarchy, types, and WKT geometry | Places should be reusable linked resources rather than repeated text labels |
| `Story` is separate from archive objects and links author, lead media, narrative text, publication state, keywords, and related things | Narrative contextualization deserves its own later vertical slice rather than extra catalogue fields |
| Search follows property chains between media and represented things | Cross-resource indexing is essential to approachable discovery |
| Project taxonomies classify objects, places, events, topics, organizations, media roles, publication state, and licences | Controlled vocabularies belong to project semantics and configuration, not hard-coded UI logic |

### Patterns Not to Copy Unchanged

| Current Fasnacht pattern | Risk or limitation exposed by Chama |
| --- | --- |
| `CarnivalThing` is a common project umbrella for objects and events | Useful inside Fasnacht, but it must not become a generic SALSAH `Asset` class |
| `archiveMediaObjectOf` covers items depicted, digitized, or otherwise represented | These meanings differ; Chama needs direct depiction, digitization source, and broader subject/about relationships to remain distinguishable |
| `MediaLibraryObject.schema:dateCreated` may mean captured, digitized, or recorded | This can collapse materially different dates; the more precise `ArchiveMediaObject.creationDating` wording is the better direction |
| A broad creator field covers created, photographed, filmed, or otherwise produced | Ruedi Singer's photograph and Lukas Rosenthaler's digitization prove that more precise roles are sometimes necessary |
| `CarnivalThing.location` can mean event location or current object location | Capture place, depicted place, event place, and current custody location must not be silently merged |
| Creative Commons is mandatory for the two media classes | This cannot represent unknown copyright, all-rights-reserved material, permission pending, a requested credit line, or the evidence for a display decision |
| `MediaLibraryObject` and `ArchiveMediaObject` are separate media classes, and a story lead image must be the former | SALSAH should first test whether media roles and presentation configuration avoid an unnecessarily rigid division |
| `Story` requires one lead image and one date | Suitable for FasnachtsPage, but too specific to impose on a generic narrative model before other story forms are tested |

### Concrete Consistency Finding

The current YAML and the `oldap-tools` project context describe `fasnacht:archiveMediaObjectOf` as optional, supporting independent media records. The generated Markdown documentation still calls it mandatory. The YAML is the declared ground truth, so this appears to be documentation drift in the Fasnacht project. It should be corrected there separately; SALSAH 2 must not silently choose semantics from the stale description.

### Result of the Comparison

The comparison strengthens most v0.1 boundaries but reopens the catalogue identity decision. SALSAH must support both domain-object-first and media-first projects. It should not force every media item through an archive-unit wrapper, nor should it prevent a project from distinguishing a photographic work, its analogue original, a digital master, and derivatives when that distinction matters.

## Cross-Domain Check: Historical Museum Basel

Consider a hypothetical digitized photograph of Basel's Marktplatz around 1900, held by the Historical Museum Basel:

| Requirement | Generic model | Project-specific model or configuration |
| --- | --- | --- |
| Catalogue identity and hierarchy | Described resource; optionally an archive item | Museum collection and accession conventions |
| Glass-plate negative and IIIF image | Media representations and derivatives | Local preservation workflow |
| Unknown photographer; museum digitizer | Agents with distinct roles | Local agent records |
| Marktplatz as capture place | Place and capture-place relationship | Basel place vocabulary |
| Rathaus and market stalls visible | Generic `depicts` relation | Building and object classes from the museum ontology |
| Approximate date based on visual evidence | Qualified dating plus date basis | Local dating vocabulary if needed |
| Curator's original note and normalized caption | Knowledge contribution | Project editorial workflow |
| Uncertain identification of a person | Contribution uncertainty; claim-level modelling deferred | Person record only if identification becomes useful |
| Public use and required museum credit | Rights, display permission, and credit line | Museum rights policy and wording |
| A story about urban change | Preserved narrative text and linked resources | Later story presentation configuration |

The check does not require a railway concept or Chama-specific component. It does expose the same generic needs for file identity, agents and roles, place, dating, depiction, knowledge provenance, uncertainty, rights, and narrative context. Version 0.1 therefore passes this conceptual cross-domain check.

## Provisional OLDAP Reuse and Gaps

| Need | Existing candidate | Current conclusion |
| --- | --- | --- |
| Archival description | `shared:ArchiveUnit` and `shared:Item` | Candidate archive-first pattern for Chama; compare with media-first instantiation before choosing |
| Digital media | `shared:MediaObject`; Fasnacht media subclasses | Reuse the technical base; decide whether descriptive media is a project subclass or a separate described resource per workflow |
| File link | `shared:hasMediaObject` | Reuse for archive units; assess broader generic media linking separately |
| Title and description | `schema:name`, `schema:description` | Reuse |
| Date or range | `dcterms:temporal` with `oldap:Dating` | Reuse and test approximate-date handling |
| Agent | `dcterms:Agent`, `schema:Person` | Reuse where appropriate; organization and role patterns need confirmation |
| Provenance text | `dcterms:provenance` | Reuse for simple custodial history; insufficient alone for a structured contribution |
| Subject | `schema:about` | Reuse |
| Direct visual depiction | No selected shared property yet | Evaluate a standard relation before adding anything |
| Public-display decision and credit line | Not yet represented adequately | Add only after the concrete rights workflow is specified |
| Knowledge contribution | No selected shared class yet | Prototype in the Chama ontology or import layer before promoting to `shared` |

No `oldaplib` or `oldap-api` change is authorized by this document. Any shared addition must be backward-compatible whenever possible and justified by implementation evidence plus cross-domain validation.

## Explicit Deferrals

Version 0.1 deliberately does not settle:

- final ontology names, namespaces, IRIs, or SHACL cardinalities;
- full OAIS package modelling or preservation-event history;
- a complete RiC-O mapping;
- claim-level provenance and competing interpretations;
- general event participation and role ontologies;
- geospatial geometry and map alignment;
- authority-file reconciliation;
- a complete rights-expression vocabulary;
- story authoring and publication structures;
- import formats and migration scripts.

## Acceptance Criteria for the Next Increment

Before implementing the first Chama ontology, review this document and confirm that:

1. a photograph and its digital file remain distinct;
2. original contributed knowledge is not overwritten by normalized text;
3. creator, photographer, digitizer, contributor, operator, and rights holder are not collapsed into one role;
4. capture place, depicted place, and contextual place can be distinguished;
5. `about` and `depicts` serve different discovery needs;
6. public-display permission, copyright, and requested credit remain separate;
7. uncertain statements can remain uncertain without a claim-reification framework;
8. no Chama class or label is required by generic SALSAH code;
9. the Basel museum example can use the same generic boundaries.

For criterion 1, “distinct” means semantically distinguishable when required. It does not mandate two OLDAP resources for every born-digital media item.

Once reviewed, the next small implementation step is to express only the confirmed portion as a Chama OLDAP ontology. Instantiate `PICT0111.jpg` and one born-digital HEIC photograph as small archive-first and media-first experiments before selecting the default pattern.

That experiment is now documented in `../experiments/catalogue-patterns/README.md`, with inspectable RDF in `../experiments/catalogue-patterns/patterns.trig`. It supports an adaptive default: media-first for standalone media assets and archive-first when a separately meaningful work, carrier, hierarchy item, or compound resource exists. The experiment uses placeholder IRIs and does not establish final ontology names.

The proposed placement and lifecycle rules for reusable archive semantics are documented in `architecture/generic-archive-foundation.md`. The proposal keeps the first generic foundation in `shared:shacl` and `shared:onto`, applies strict cross-domain admission criteria, and defers a dependency-managed ontology-module graph mechanism until independently versioned modules create a concrete need.
