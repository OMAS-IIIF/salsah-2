# Minimal Chama Ontology

## Status

This directory contains the reviewed minimal ontology for the Chama demonstration project. The project and ontology have been created in OLDAP, and user `rosenth` has project-administration permission.

The draft translates only the concepts required to represent:

- `IMG_1751.HEIC` as a media-first catalogued photograph;
- the 1981 Lobato photograph as an archive-first photographic work with an analogue slide and a JPEG digital representation.

## Files

- `chama-onto.yaml`: structurally valid `oldap-tools` ontology YAML with the approved Chama project identity.

Actual instance creation is deferred until the ontology classes and properties have been reviewed. The earlier `../catalogue-patterns/patterns.trig` remains the evidence-level comparison and is not an OLDAP import file.

## Classification Rule

Every concept in the draft belongs to one of four categories:

| Category | Meaning |
| --- | --- |
| Existing Shared reuse | Already available to every OLDAP project |
| External reuse | Established class or property from Dublin Core or schema.org |
| Chama experiment | Required now, but not yet proven generic enough for Shared |
| Later Shared candidate | Project-local experiment with plausible cross-domain value |

## Class Inventory

| Class | Superclass or basis | Classification | Why it exists now |
| --- | --- | --- | --- |
| `chama:Agent` | `dcterms:Agent` | Chama experiment | Common target for people and organizations until a reusable Agent constraint is proven |
| `chama:Person` | `schema:Person`, `chama:Agent` | Chama experiment using external semantics | Creates photographer, digitizer, and contributor instances |
| `chama:Organization` | `schema:Organization`, `chama:Agent` | Chama experiment using external semantics | Represents Baldwin, D&RGW, and C&TS when structured relationships are added |
| `chama:Place` | `schema:Place` | Chama experiment using external semantics | Represents Chama station and Lobato Trestle as linked places |
| `chama:LocomotiveClass` | `oldap:Thing` | Chama domain | Represents K-36 independently of locomotive 488 |
| `chama:Locomotive` | `oldap:Thing` | Chama domain | Represents locomotive 488 as a depicted resource |
| `chama:AnalogueCarrier` | `oldap:Thing` | Later Shared candidate | Keeps Ruedi Singer's slide distinct from its JPEG scan |
| `chama:KnowledgeContribution` | `oldap:Thing` | Later Shared candidate | Preserves original owner knowledge, normalized text, and uncertainty |
| `chama:DigitalRepresentation` | `shared:MediaObject` | Later Shared candidate | Adds source-carrier and digitizer semantics to a technical media object |
| `chama:PhotographicWork` | `shared:ArchiveUnit` | Chama experiment | Archive-first identity for the 1981 photograph |
| `chama:CataloguedPhotograph` | `shared:MediaObject` | Later Shared candidate | Media-first identity for the born-digital panorama |

The project wrappers around external Person, Organization, and Place classes are practical OLDAP resource classes, not claims that Chama owns those general concepts.

## Property Inventory

| Property | Classification | Notes |
| --- | --- | --- |
| `schema:name`, `schema:description`, `schema:identifier` | External reuse | Human-readable identity and description |
| `dcterms:creator`, `dcterms:contributor`, `dcterms:created`, `dcterms:temporal` | External reuse | Existing standard relationships and dates where their meanings fit |
| `shared:archiveLevel`, `shared:hasMediaObject`, Shared media fields | Existing Shared reuse | Archive hierarchy and technical media identity |
| `chama:locomotiveClass`, `chama:manufacturer`, `chama:operator` | Chama domain | Railway-specific structured relationships |
| `chama:capturePlace` | Later Shared candidate | Kept distinct from depicted or contextual places |
| `chama:depicts` | Later Shared candidate | Temporary project property pending external-vocabulary evaluation |
| `chama:sourceCarrier`, `chama:digitizedBy` | Later Shared candidate | Separate analogue source and digitization responsibility |
| `chama:hasKnowledgeContribution` and contribution fields | Later Shared candidate | Coherent source-level knowledge record; no claim reification |
| `chama:publicDisplayPermission`, `chama:creditLine`, `chama:rightsNote` | Later Shared candidate | Minimal rights workflow; copyright and permission remain distinct in prose until a fuller model is justified |
| `chama:creationDating` | Later Shared candidate | Original media-content creation date, following the precise Fasnacht pattern |

## Deliberate Omissions

The draft does not yet define:

- a universal Asset or DescribedResource class;
- Story resources;
- publication workflow states;
- claim-level assertions;
- general role or activity modelling;
- detailed locomotive history events;
- preservation events or OAIS packages;
- a complete rights vocabulary;
- project taxonomies;
- UI-only field groups or presentation configuration.

## Accepted Project and Modelling Decisions

1. Project shortname: `chama`.
2. Project label: `SALSAH 2 Chama Demo`.
3. Project IRI: `https://chama.salsah.org`.
4. Namespace IRI: `https://chama.salsah.org/ns/`. HTTPS is used consistently for stable resource identity; namespace IRIs do not need to resolve as web pages.
5. Keep the first names `PhotographicWork` and `CataloguedPhotograph` until hands-on use reveals clearer terminology.
6. Use one `KnowledgeContribution` resource per supplied annotation in the first slice.
7. Keep `publicDisplayPermission` as a nullable boolean: absent means unknown or not assessed, `true` means allowed, and `false` means not allowed. A separate workflow state can be added later if pending review becomes operationally necessary.

`chama:describes` and `chama:hasKnowledgeContribution` are declared inverse properties so that one semantic relationship can support contributor-oriented and resource-oriented navigation without two unrelated links.

## Live Status and Next Gate

The project-creation and ontology-loading gate is complete. Before creating demonstration instances:

1. read back the live project and ontology metadata to confirm the expected target;
2. prepare and review one standalone media-first `CataloguedPhotograph` for `IMG_1751.HEIC` without importing or publishing the media file;
3. create and read back that record before incrementally adding its Person, Place, Dating, Locomotive, LocomotiveClass, Organization, and KnowledgeContribution links;
4. add the archive-first example only after the enriched media-first record has been verified.

The live project and ontology were created by the project owner. The first demonstration instance, `chama:IMG_1751`, has since been created and verified as a standalone media-first record; see `../chama-data/`.

The first public demonstration record attaches `oldap:Unknown` with `DATA_VIEW`. This makes anonymous viewing explicit at the instance-permission boundary; project administration and editorial permissions remain separate concerns.
