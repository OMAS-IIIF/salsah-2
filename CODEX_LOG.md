# CODEX_LOG

### Update 2026-08-24 22:46

- Decisions: Keep OpenSeadragon behind a generic SALSAH component and keep authorized delivery data separate from ontology-derived display fields. Apply the short-lived media capability to both IIIF metadata and every tile request so the same viewer also works for non-public assets.
- Implementation: Confirmed the real HEIC attachment, pyramidal TIFF, and IIIF Image API 3 level-2 delivery at 9944 × 3700 pixels. Added typed MediaObject delivery resolution, an accessible localized OpenSeadragon viewer, external-image composition, capability URL tests, and a mocked IIIF end-to-end path. Verified the live `chama:IMG_1751` panorama visually and interactively in SALSAH. `svelte-check`, targeted ESLint, production build, 40 unit tests, and both resource-detail browser tests pass.
- Open: Perform an optional owner review at narrow viewport size, then begin the independent archive-first `PICT0111.jpg` record experiment. Token renewal during an exceptionally long open viewer session and IIIF Presentation manifests remain later increments.
- Risks/Assumptions: OpenSeadragon 6.1.0 is dynamically loaded only on IIIF pages. The existing query-capability contract necessarily places short-lived media credentials on tile URLs. Full-project Prettier still reports unrelated pre-existing environment and documentation files; all changed source files pass targeted formatting and lint checks.

### Update 2026-08-24 22:34

- Decisions: Require a successful real binary/IIIF round trip before adding the viewer dependency or UI component.
- Implementation: Rebuilt and restarted only the local Mediahelper with the tested existing-resource attachment contract; its health endpoint reports version 0.2.4. Added reviewed multipart evidence and an idempotent password-prompting Chama attachment script that verifies source checksum, OLDAP delivery facts, media-capability authorization, and IIIF `info.json` without printing credentials.
- Open: Run `/private/tmp/attach_chama_img1751_media.py`, record its verification output, and then implement the first OpenSeadragon-backed generic viewer.
- Risks/Assumptions: The binary has not yet been imported. Cantaloupe and Caddy were left running; production release still needs an immutable Mediahelper version bump.

### Update 2026-08-24 22:30

- Decisions: Accept Baldwin as manufacturer and D&RGW plus C&TS as unqualified biographical operators of locomotive 488. Keep binary attachment and UI viewing as the next separate vertical increment.
- Implementation: Created and read back all three public Organization resources and their locomotive links. Verified live generic SALSAH rendering and navigation from locomotive 488 to each public organization page. Prepared the cross-repository media path by adding a backward-compatible Mediahelper mode for attaching a generated local asset to an existing MediaObject without changing its descriptive metadata or permissions.
- Open: Rebuild the local mediahelper, attach `demo-data/IMG_1751.HEIC`, verify IIIF delivery, then implement the first generic image-viewer component.
- Risks/Assumptions: `chama:operator` still has no temporal qualification. The new Mediahelper path is locally test-complete but not yet deployed into the running container; no media binary has been imported.

### Update 2026-08-24 22:18

- Decisions: Model Baldwin Locomotive Works, Denver & Rio Grande Western Railroad, and Cumbres & Toltec Scenic Railroad as public Organization resources. Link Baldwin as locomotive 488's manufacturer and both railroads as operators, while explicitly treating the current unqualified operator values as biographical rather than simultaneous.
- Implementation: Added exact organization-create and locomotive-update payload evidence plus an idempotent password-prompting script. The script creates only absent organizations, preserves existing expected values, additively links missing organizations, and verifies names, classes, permissions, manufacturer, and operators after the update.
- Open: Run `/private/tmp/add_chama_locomotive488_organizations.py`, inspect its output and live SALSAH links, then start the separate binary-ingest/IIIF delivery increment.
- Risks/Assumptions: The current ontology cannot qualify an operator relationship by period or role. Organization descriptions and source-backed historical assertions remain deferred; no media binary has been imported.

### Update 2026-08-24 22:11

- Decisions: Accept the complete owner annotation as the first verified KnowledgeContribution and accept the canonical-only relationship strategy: store `chama:describes`, rely on ontology reasoning for `chama:hasKnowledgeContribution`.
- Implementation: Created and read back public `chama:Annotation_IMG_1751_2026_08_21` with every authored/provenance field verified. Confirmed that no explicit photograph update occurred and that the photograph API nevertheless exposes the inverse contribution relation. Verified both navigation directions in live SALSAH and made generic scalar metadata preserve paragraph breaks for readable long-form contributions. Updated experiment and stable project context.
- Open: Choose manufacturer/operator or binary media/IIIF as the next bounded increment.
- Risks/Assumptions: Inverse navigation depends on the configured OLDAP/GraphDB reasoning behavior. Historical and technical statements remain contributor-attributed pending source verification.

### Update 2026-08-24 22:10

- Decisions: Preserve the complete owner annotation as one KnowledgeContribution, retaining original wording separately from normalization and uncertainty. Store only the canonical `chama:describes` direction so the increment genuinely tests the ontology's inverse relationship.
- Implementation: Added a reviewed public KnowledgeContribution payload with contributor, contribution date/language, source context, verbatim original text, normalized description, uncertainty note, and normalization note. Prepared and syntax-checked an idempotent script; verified that its in-memory payload exactly matches the recorded JSON evidence. The script creates only when absent, verifies every authored field, does not update the photograph explicitly, and fails clearly if OLDAP does not expose the inverse relation.
- Open: Run `/private/tmp/add_chama_img1751_contribution.py`, inspect inverse-link verification, and test both navigation directions in live SALSAH.
- Risks/Assumptions: Historical, technical, gradient, operating, and object-identification claims remain contributor-supplied expert knowledge pending source verification. The contribution is publicly readable because it is linked from a public photograph.

### Update 2026-08-24 22:04

- Decisions: Accept the minimal K-36/#488 subject chain as the next verified content increment. Continue to defer manufacturer and operator resources.
- Implementation: Created and read back public `chama:K36` and `chama:Locomotive488`; verified identifier `488`, `chama:locomotiveClass chama:K36`, and additive `chama:IMG_1751 chama:depicts chama:Locomotive488`. Verified the complete photograph → locomotive → class navigation and K-36 description in live SALSAH, then updated experiment and stable project context.
- Open: Select either KnowledgeContribution or manufacturer/operator as the next bounded enrichment.
- Risks/Assumptions: The K-36 description is concise owner-supplied domain knowledge, not yet a source-cited historical claim. No media binary has been imported.

### Update 2026-08-24 21:55

- Decisions: Make the first depicted-subject increment a minimal photograph → locomotive → locomotive-class chain. Defer Baldwin and railway-operator resources so this remains independently verifiable.
- Implementation: Added reviewed payload evidence for public `chama:K36`, public `chama:Locomotive488` with identifier `488` and its class link, and the additive `chama:IMG_1751 chama:depicts chama:Locomotive488` update. Prepared and syntax-checked an idempotent password-prompting script that creates only absent resources, refuses unexpected existing values, and verifies every read back.
- Open: Run `/private/tmp/add_chama_locomotive488.py`, inspect its verification output, then verify the three-resource navigation in live SALSAH.
- Risks/Assumptions: The concise K-36 description is derived from the owner's supplied annotation. Manufacturer and operator are intentionally not yet modelled as resources; no binary media is imported.

### Update 2026-08-24 21:50

- Decisions: Make the first resource discoverability path project-neutral and permission-aware. Query the `oldap:Thing` root through structured search instead of embedding `chama:IMG_1751` or a Chama class in UI code; clearly label the result area as live while other workspace sections remain fixtures.
- Implementation: Added a typed recent-resource search client, a responsive `LiveResourceList` component, canonical detail links, localized loading/error/empty states, and workspace integration. Removed the former fixture-based “recently opened” panel. Added unit and end-to-end coverage for search and workspace-to-detail navigation. Verified live that OLDAP returns the Chama photograph, place, and person and that the photograph link opens its detail page.
- Open: Review the live workspace presentation, then choose between adding locomotive `#488` or replacing another bounded fixture area with real data.
- Risks/Assumptions: Project-wide discovery relies on GraphDB reasoning exposing project subclasses through `oldap:Thing`. The remaining statistics, archive hierarchy, tabs, and activity cards are still prototype fixtures and must not be mistaken for live Chama data.

### Update 2026-08-24 21:40

- Decisions: Accept the day-precision content date as the third verified enrichment of the first media-first record. Preserve the source camera timestamp and unknown timezone separately rather than claiming unsupported precision.
- Implementation: Added `2018-07-10` to `chama:IMG_1751` through `chama:creationDating`; the idempotent update script verified the normalized API round trip as `2018-07-10 - 2018-07-10 (GREGORIAN, DAY)`. Updated the experiment status and stable repository context.
- Open: Refresh the live SALSAH page and visually confirm the scalar Dating presentation. Then choose workspace discoverability or the first locomotive-domain relation as the next small increment.
- Risks/Assumptions: The HEIC binary remains unimported. The normalized Dating string is an API presentation of a qualified RDF structure, not a durable generic interchange representation.

### Update 2026-08-24 21:34

- Decisions: Treat `oldap:Dating` as an OLDAP-managed qualified value structure at the current API boundary, not as a navigable relation. Although stored as an RDF resource, the instance API intentionally returns its normalized human-readable scalar form.
- Implementation: Excluded `oldap:Dating` from linked-resource resolution and rendered it through the generic scalar metadata path; added unit and browser coverage for the exact day-precision representation. Recorded the reviewed date-update payload and prepared an idempotent password-prompting script that refuses to overwrite an unexpected existing value and verifies the photograph round trip.
- Open: Run `/private/tmp/add_chama_img1751_dating.py` against the live API, refresh the resource page, and record the verified live result before selecting the next increment.
- Risks/Assumptions: The current explicit `oldap:Dating` exception is required because the data-model response does not distinguish navigable resource classes from embedded value classes. A future generic API marker or structured Dating JSON would allow this platform knowledge to move out of the UI layer.

### Update 2026-08-24 00:51

- Decisions: Make the first visible production-data increment a generic, read-only, ontology-driven resource page. Keep media ingest separate and show missing media explicitly rather than substituting fixture content. Preserve resource deep links across authentication.
- Implementation: Added a single-flight authenticated fetch boundary; generic resource/model loaders and presentation transformation; inherited ontology-property resolution; localized labels; linked-resource loading and navigation; and the `/p/[project]/resource/[...iri]` detail route. Rendered live `chama:IMG_1751` with creator and capture-place links, fixed a sole-project login redirect race, added four-language UI messages, unit tests, and a mocked end-to-end vertical test.
- Open: Perform the owner's visual live-data review, then add `oldap:Dating` and verify that the relationship appears without project-specific UI code. Binary media/IIIF integration, resource discovery from the workspace, edits, and archive-first UI validation remain separate increments.
- Risks/Assumptions: The page resolves only direct ontology-declared object links and currently has no binary media URL. The full project lint command still traverses unrelated/pre-existing generated or environment files; changed source files pass targeted ESLint, while `svelte-check` reports zero errors plus generated Paraglide declaration warnings.

### Update 2026-08-24 00:33

- Decisions: Add the photograph's capture place as the second independently verified linked-resource increment. Keep the reusable Place publicly readable and defer richer geographic modelling until a concrete need appears.
- Implementation: Created and read back `chama:ChamaStation` as `chama:Place` with German and English names plus `oldap:Unknown` `DATA_VIEW`; additively linked it from `chama:IMG_1751` through `chama:capturePlace`; verified both resources; and recorded the exact non-secret create and update payloads.
- Open: Add and verify a day-precision `oldap:Dating` resource for 2018-07-10 plus the `chama:creationDating` link before locomotive-domain entities or KnowledgeContribution.
- Risks/Assumptions: The embedded camera time has an unknown timezone and is deliberately not represented by the day-level Dating resource. No coordinates or broader place hierarchy are asserted yet.

### Update 2026-08-24 00:26

- Decisions: Continue enriching the first media-first record through one independently verified linked-resource increment at a time. Make the creator Person anonymously readable because the public photograph resolves to it.
- Implementation: Created and read back `chama:LukasRosenthaler` as `chama:Person` with `oldap:Unknown` `DATA_VIEW`, additively linked it from `chama:IMG_1751` through `dcterms:creator`, and verified both resources. Recorded the exact non-secret Person-create and creator-update payloads.
- Open: Add and verify `chama:ChamaStation` plus the `chama:capturePlace` link before introducing Dating, locomotive-domain entities, or KnowledgeContribution.
- Risks/Assumptions: The Person is a project-domain descriptive resource distinct from the OLDAP user account `rosenth`. Its single German-tagged name reflects the ontology's `rdf:langString` field and may later receive additional language variants.

### Update 2026-08-24 00:22

- Decisions: Accept the first live Chama record as a successful media-first vertical data experiment. Keep binary media ingest separate and enrich the record one linked resource at a time, starting with its creator.
- Implementation: Created and read back `chama:IMG_1751` as `chama:CataloguedPhotograph` with core descriptive and technical metadata, `publicDisplayPermission=true`, credit line, and `oldap:Unknown` `DATA_VIEW`. Added the exact non-secret create payload and documented that max-one string properties currently round-trip as singleton arrays while the max-one boolean is scalar.
- Open: Create and verify the Lukas Rosenthaler Person resource, link it as creator, and use this evidence to shape—but not yet implement—the generic `oldap-tools data` interchange format.
- Risks/Assumptions: The HEIC binary and IIIF derivatives are not imported. The current payload is experiment evidence rather than a stable interchange schema; serializers must not infer cardinality solely from the API's JSON container shape.

### Update 2026-08-24 00:11

- Decisions: Grant `oldap:Unknown` `DATA_VIEW` on the first public Chama demonstration record. Keep instance authorization distinct from `publicDisplayPermission`, which records the descriptive/legal publication decision rather than enforcing OLDAP access.
- Implementation: Recorded the permission decision in the ontology experiment guide and stable project architecture context.
- Open: Review and create the standalone `IMG_1751.HEIC` metadata record. Consider a later generic, ontology-driven `oldap-tools data` YAML/JSON round-trip based on the existing archive-import safety patterns.
- Risks/Assumptions: Anonymous read permission is intentional for the demo record; future non-public or embargoed records require different role attachments even if they use the same ontology class.

### Update 2026-08-24 00:06

- Decisions: Mark the project-creation and ontology-loading gate complete. Keep the next increment deliberately small: read back the live model and create one standalone media-first `CataloguedPhotograph` for `IMG_1751.HEIC`; add linked entities incrementally and defer the archive-first example until the enriched record has been verified.
- Implementation: Recorded the owner's confirmation that project `chama` exists, the ontology is loaded, and user `rosenth` has project-administration permission. Updated the ontology experiment guide, repository state, roadmap, and immediate next step accordingly.
- Open: Verify the live project/model read-only, review the standalone photograph payload and its instance permission, then create and read it back without importing or publishing the media file. Add linked entities only in subsequent increments.
- Risks/Assumptions: The live state is recorded from the project owner's report and has not yet been independently read back. Ontology availability does not by itself establish a media-ingest or public-publication workflow.

### Update 2026-08-23 23:52

- Decisions: Treat the reviewed Chama ontology as the final local input for project setup, while keeping the live ontology load as a separate controlled step.
- Implementation: Revalidated `chama-onto.yaml` with the official OLDAP validator; verified the approved project identity, all 11 classes, both catalogue patterns, the inverse knowledge-contribution relationship, and the absence of the former draft file; removed the stale "Draft" heading from the experiment guide.
- Open: Create the matching OLDAP project, confirm model-administration permission, and then perform the backed-up ontology load.
- Risks/Assumptions: Validation proves local structural consistency, not compatibility with the current live project state; no live OLDAP or GraphDB data was changed.

### Update 2026-08-23 23:41

- Decisions: Approve project shortname `chama`, label `SALSAH 2 Chama Demo`, project IRI `https://chama.salsah.org`, and HTTPS namespace `https://chama.salsah.org/ns/`. Retain the initial class names, use one KnowledgeContribution per supplied annotation, and model public-display permission as a nullable boolean for the first slice.
- Implementation: Promoted `chama-onto.draft.yaml` to `chama-onto.yaml`, replaced placeholder identity with the approved project metadata, documented exact nullable-boolean semantics and the loading gate, and aligned project context. The ontology remains local and unloaded pending project creation.
- Open: Create or confirm the matching OLDAP project, verify model-administration permission, then perform a reviewed backed-up ontology load before creating instances.
- Risks/Assumptions: Absence of `publicDisplayPermission` currently combines unknown and not-yet-assessed states. This is accepted for the first slice and must be revisited only when an explicit review workflow requires the distinction.

### Update 2026-08-23 23:30

- Decisions: Draft the first Chama ontology locally before creating or changing an OLDAP project. Use placeholder project identity and keep all unproven generic concepts in the Chama namespace; reuse Shared and external terms where their semantics already fit.
- Implementation: Added `experiments/chama-ontology/chama-onto.draft.yaml` with minimal Agent, Person, Organization, Place, LocomotiveClass, Locomotive, AnalogueCarrier, KnowledgeContribution, DigitalRepresentation, PhotographicWork, and CataloguedPhotograph classes. The draft supports the media-first panorama and archive-first Lobato work/slide/scan, optional repeated media through inherited Shared semantics, inverse source-contribution navigation, basic display permission, credit lines, and project-domain relationships. Added a classification and review guide, linked the experiment from project context, and passed official `oldap-tools ontology validate` plus focused inheritance/property consistency checks.
- Open: Review semantic coverage and naming, decide the real project shortname/IRI/namespace, then create or select the OLDAP project before any load. Public-display boolean versus explicit state vocabulary remains open.
- Risks/Assumptions: The `chama` project identity and `example.org` IRIs are placeholders. The class/property names are project-local experiments, not Shared API. Structural YAML validation cannot prove OLDAP inheritance, data compatibility, or successful live loading.

### Update 2026-08-23 23:22

- Decisions: Accept the Shared placement architecture and build the generic archive foundation bottom-up under KISS. Make media-first a first-class simple default, especially for small institutions, while allowing archive and cultural objects to exist with zero, one, or many heterogeneous media representations.
- Implementation: Changed `docs/architecture/generic-archive-foundation.md` from proposed to accepted and added the bottom-up promotion rule plus media multiplicity semantics. Promoted these durable principles into `FOUNDATIONS.md` and aligned the project context, architectural decisions, roadmap, and immediate ontology step.
- Open: Draft the smallest Chama ontology with one media-first photograph and one archive-first photographic work, classify each concept by reuse/promotion status, and verify that the object-first media relation remains optional and repeatable.
- Risks/Assumptions: Media-first is a default path, not a universal class hierarchy. Generic SALSAH code must not assume that every described resource is media, that every archive object has media, or that one object has only one representation.

### Update 2026-08-23 23:16

- Decisions: Propose `shared:shacl` and `shared:onto` as the home of stable, optional, cross-domain archive building blocks; retain `oldap` for engine invariants and project graphs for domain semantics and stricter workflow constraints. Defer a separate automatically inherited ontology-module graph until independent module lifecycle requirements justify full dependency resolution.
- Implementation: Added `docs/architecture/generic-archive-foundation.md` with the current graph architecture, verified oldaplib composition behavior, a layer contract, strict Shared admission criteria, initial existing/candidate/deferred inventory, SHACL/UI guidance, schema-versus-instance separation, compatibility rules, and conditions for a future module system. Linked the proposal from the data model, README, project context, and roadmap.
- Open: Review and accept or amend the proposal; decide the first Chama project-local candidates and external vocabulary choices; only then draft ontology YAML. Potential Shared promotion remains a later, separately reviewed oldaplib change.
- Risks/Assumptions: Shared is globally available and therefore behaves like a platform API. Premature additions or tightened base constraints could affect every project. Conversely, introducing a new graph type now would require broad changes to superclass resolution, data-model factories, caches, queries, API behavior, and version management.

### Update 2026-08-23 22:56

- Decisions: Adopt an adaptive catalogue default: media-first when a media item is itself the standalone described asset, archive-first when a separately meaningful work, physical carrier, hierarchy item, or compound resource exists. Require generic SALSAH components to support both patterns through one described-resource boundary.
- Implementation: Added `experiments/catalogue-patterns/README.md` and syntactically valid `patterns.trig`. Modelled `PICT0111.jpg` and `IMG_1751.HEIC` in both archive-first and media-first graphs using their real titles, dates, creators, digitizer, source carrier, filenames, MIME types, checksums, dimensions, places, depicted resources, contribution evidence, display decisions, and credit lines. Documented the comparison, application consequences, OLDAP questions, and recommended Chama choices; linked the experiment from the model, README, project context, and roadmap.
- Open: Review the adaptive default, choose non-experimental class/property names and standard depiction semantics, then create the minimal Chama ontology and exercise one instance of each pattern through the same UI and API workflow.
- Risks/Assumptions: The experiment uses placeholder IRIs and is not an OLDAP import or SHACL-valid production dataset. `shared:protocol "custom"` marks pre-ingest local source files; final IIIF/media-server metadata will be assigned only during real ingest.

### Update 2026-08-23 00:12

- Decisions: Treat the Fasnacht ontology as a real cross-project comparator; keep both archive-first and media-first catalogue patterns viable until one analogue-derived and one born-digital Chama photograph are instantiated. Reuse Fasnacht's proven object/media, provider/creator, place, story, taxonomy, and cross-resource search ideas without promoting `CarnivalThing` or other project semantics into the SALSAH core.
- Implementation: Extended `docs/minimal-data-model-v0.1.md` with a systematic Fasnacht comparison. Recorded aligned patterns and cautions around conflated representation relations, dates, agent roles, locations, mandatory Creative Commons licensing, separate media-library/archive-media classes, and story cardinalities. Revised the earlier archive-unit-first assumption into a concrete two-pattern experiment and aligned project context and roadmap.
- Open: Prototype `PICT0111.jpg` and a born-digital HEIC both archive-first and media-first; select standard depiction semantics; decide which Fasnacht patterns merit backward-compatible promotion to `shared`. Correct the separate Fasnacht Markdown statement that still calls `archiveMediaObjectOf` mandatory although current YAML and project context make it optional.
- Risks/Assumptions: The comparison is based on the current Fasnacht YAML as declared ground truth plus its documentation and project context. SALSAH must not inherit Fasnacht-specific workflow constraints merely because they already exist.

### Update 2026-08-23 00:03

- Decisions: Keep the first model conceptual and evidence-based; treat any configured OLDAP resource as a SALSAH described resource rather than introducing a universal `Asset` class; reuse the existing archive/media boundary for Chama while refusing to force museum objects into it. Preserve owner knowledge as a coherent contribution and defer claim-level reification, general event participation, and a standalone rights resource until concrete complexity requires them.
- Implementation: Added `docs/minimal-data-model-v0.1.md`, derived from all six reviewed photographs. It separates generic archival semantics, Chama-domain semantics, and presentation configuration; identifies reuse of `shared:ArchiveUnit`, `shared:MediaObject`, dating, provenance, and subject relations; records gaps around depiction, role-aware contributions, public-display status, and credit lines; and validates the generic boundary against a hypothetical Historical Museum Basel photograph. Linked the document from the README and aligned project context and roadmap.
- Open: Review the nine acceptance criteria with the project owner, select standard vocabulary for direct depiction, decide the smallest contribution and rights representation, then implement only the confirmed subset in a Chama ontology and instantiate one photograph.
- Risks/Assumptions: `shared:hasMediaObject` is currently archive-unit-specific and may not suit arbitrary museum resources. No shared ontology or API change has been made; any later broadening must remain backward-compatible and be justified across domains.

### Update 2026-08-21 01:07

- Decisions: Establish Chama as a validation corpus rather than the SALSAH 2 product domain; require generic capabilities to survive comparison with materially different art, cultural, and historical collections without a core-code fork.
- Implementation: Added durable genericity guardrails to `FOUNDATIONS.md`, including the separation of project ontology from generic application concepts, cross-domain validation before stabilizing reusable contracts, and explicit non-goals against railway-specific core behavior. Recorded the Friends of the Cumbres & Toltec Scenic Railroad and the Historical Museum Basel as potential validation contexts rather than assumed customers, and aligned `codex.md`, the roadmap, and the immediate modelling step.
- Open: When deriving the first ontology, classify each concept as generic archival semantics, Chama-domain semantics, or presentation configuration and test the boundary against a contrasting museum example.
- Risks/Assumptions: Enthusiasm and rich domain knowledge can bias architecture toward the demo corpus; the new decision check must be applied during modelling and component design, not merely documented.

### Update 2026-08-21 01:06

- Decisions: Model creation, digitization, and related parallel documentation as distinct provenance roles; do not treat requested display credit as a substitute for authorship and rights metadata.
- Implementation: Updated `PICT0111.jpg` from an ambiguous joint attribution to photographer Ruedi Singer and digitizer Lukas Rosenthaler. Recorded the slide original, Kern SLR capture, Lukas Rosenthaler's simultaneous Super-8 filming, his limited-quality digitization assessment, and the unchanged requested display credit `Lukas Rosenthaler / Ruedi Singer`; synchronized inventory and first-selection metadata.
- Open: Identify the Kern camera model and document the formal copyright and public-permission basis; determine whether the related Super-8 film survives and belongs in a later accession.
- Risks/Assumptions: The contributor's typo `Das Die` is interpreted as `Das Dia`. Mention of the Super-8 film does not imply that it is currently held in the demo collection.

### Update 2026-08-21 01:05

- Decisions: Keep requested display credit distinct from photographer and copyright assertions when contributor roles are not yet disambiguated; model historic rolling stock and infrastructure as related entities without prematurely identifying the locomotive or train.
- Implementation: Recorded the `PICT0111.jpg` annotation for the 1981 Lobato Trestle scene, including the K-36 class, converted boxcar passenger stock, four-percent approaches, nearly level bridge, moving-train viewpoint, personal recollection, public permission, and exact requested credit `Lukas Rosenthaler / Ruedi Singer`. Updated the inventory and completed all six photographs in the first selection.
- Open: Identify the locomotive, train, exact date, original photographic medium, individual photographer, and rights-holder roles; verify the bridge geometry, route grade, and early C&TS rolling-stock context against suitable sources.
- Risks/Assumptions: The embedded 1970 date remains invalid and must not be propagated. The contributor cleared public display, but the joint credit alone does not establish distinct authorship or copyright roles.

### Update 2026-08-21 00:55

- Decisions: Treat personal evaluations as narrative context rather than neutral catalogue claims; retain creator clearance while separately recording a proportionate depicted-person review gate for public presentation.
- Implementation: Resolved the submitted `IMG_1771.HEIC` reference to the existing `IMG_0171.HEIC` and recorded Lukas Rosenthaler's Foster's Hotel and Saloon annotation, including the circa-1881 lodging history, Main Street viewpoint, active evening bar, personal dining and atmosphere recollection, public permission, and attribution. Updated the inventory and completed the sixth photograph in the first selection.
- Open: Verify the preferred historical spelling, construction date, and lodging history against suitable sources; review whether any patrons are identifiable before public presentation.
- Risks/Assumptions: The file correction is based on the absent `IMG_1771.HEIC`, the existing `IMG_0171.HEIC`, and its prior visual identification. Historical details currently derive from owner knowledge.

### Update 2026-08-21 00:45

- Decisions: Represent a locomotive photograph as relationships among the visual asset, locomotive, class, manufacturer, operators, route segment, operating activity, and personal recollection; keep technical expert knowledge attributed pending source verification.
- Implementation: Recorded Lukas Rosenthaler's annotation for panoramic `IMG_1751.HEIC`, including K-36 locomotive 488, its Baldwin and D&RGW history, distinguishing running-gear features, preparation for the four-percent Cumbres climb, visible cars and switch stand, sensory recollection, public permission, and attribution. Updated the inventory and first selection and documented the panorama dimensions without assuming a particular stitching process.
- Open: Identify the train or excursion represented by the cars and verify the locomotive history, K-36/K-37 comparison, and route gradient against suitable sources.
- Risks/Assumptions: The technical and operational account currently derives from owner expertise. The northward view interprets the supplied `Mainstreen` as Main Street.

### Update 2026-08-21 00:33

- Decisions: Resolve image annotations against explicit owner corrections and retain the correction trail in provenance; keep contributor-supplied building history distinct from externally verified facts.
- Implementation: Recorded Lukas Rosenthaler's annotation for `IMG_1521.HEIC` after final correction of earlier copy-and-paste and digit-transposition references. Added the normalized description, hotel naming history, Roger Hogan association, 2025 renovation, personal stays since 1987, public permission, and attribution; updated the inventory and first selection while restoring `IMG_1512.HEIC` to its previous unannotated state.
- Open: Verify the circa-1939 construction date, Shamrock Hotel naming history, Roger Hogan association, and 2025 renovation against suitable sources; identify `IMG_1512.HEIC` separately before cataloguing it.
- Risks/Assumptions: Historical details currently derive from owner knowledge. The assessment that the renovation preserved the hotel's historic character is attributed and must not be presented as an independently verified conservation finding.

### Update 2026-08-21 00:13

- Decisions: Keep contributor-supplied historical interpretation distinct from direct visual observations and from institutionally verified facts; retain the claimed 1950s/1960s appearance as an attributed assessment.
- Implementation: Recorded Lukas Rosenthaler's annotation for `IMG_1520.HEIC`, including the station building and ticket office, westward view, evening arrival context, former continuation toward Durango, C&TS restoration, public permission, and personal attachment. Added a normalized description, recorded visible D&RGW freight car 3231 as a separate visual observation, and updated the inventory and first selection.
- Open: Verify the restoration chronology and the building's resemblance to its 1950s/1960s appearance when suitable sources become available; continue with the remaining four selected photographs.
- Risks/Assumptions: The restoration and route-history statements currently derive from owner knowledge rather than cited institutional records; their provenance is explicit and they must not be silently relabelled as externally verified facts.

### Update 2026-08-21 00:05

- Decisions: Preserve project-owner knowledge as dated source annotations distinct from normalized catalogue text and structured relationships; document every interpretation and uncertainty instead of silently correcting or promoting it to fact.
- Implementation: Recorded Lukas Rosenthaler's first photograph annotation for `IMG_1508.HEIC`, preserved the original German contribution, added a normalized public description and personal recollection, documented the `49` to `489` normalization and uncertain machine identification, updated the inventory and first selection, and documented the repeatable annotation convention.
- Open: Continue with the remaining five selected photographs; decide how multilingual titles, descriptions, contributor assertions, certainty, publication permission, and requested attribution map into the minimal OLDAP ontology.
- Risks/Assumptions: The machine at the far left is not identified. The current public-display permission and attribution are recorded from the project owner's contribution but are not yet represented by a formal rights vocabulary.

### Update 2026-08-20 23:36

- Decisions: Let a small reviewed Chama corpus drive the first OLDAP ontology; distinguish intellectual works from their file representations now, but defer a richer archival model until concrete records require it. Treat forum rights statements as provenance leads rather than final institutional determinations.
- Implementation: Added `../demo-data/metadata.csv` with one record for each of 48 source files, preliminary map identifications and rights states, embedded dates and dimensions for owner photographs, explicit unknowns, and work-level grouping. Added collection guidance, a verified SHA-256 fixity manifest for all source media, generated year-grouped visual contact sheets without modifying the originals, and documented a provisional ten-record selection with identification questions and concrete modelling evidence.
- Open: Review and correct the six provisional photograph descriptions; confirm the preferred creator credit line; verify Richardson Library catalogue data, attribution, and rights; derive the minimal ontology from the reviewed selection.
- Risks/Assumptions: Four historical map files are only public-domain candidates based on a knowledgeable forum contributor's statement. Nine files remain reference-only or on hold, and no item in the working directory is automatically cleared for public presentation.

### Update 2026-08-19 14:22

- Decisions: Establish a durable foundation for SALSAH 2 around three product pillars: pragmatic standards-informed archive work, approachable discovery and public presentation, and narrative contextualization. Govern development through KISS, modular increments, deliberate dependencies, long-term maintainability, and backward-compatible OLDAP evolution.
- Implementation: Added `FOUNDATIONS.md` as the primary product and engineering reference, including scope, OAIS/RiC guidance, reuse and future-library strategy, system boundaries, functional capabilities, decision criteria, non-goals, and document governance. Linked it from `README.md` and `codex.md`, corrected the recorded repository state, and recorded successful live login and interactive project-selection testing.
- Open: Verify live zero-project and sole-project account behavior. Apply the decision checklist to the first production resource workflow and refine the foundations only when concrete product learning changes the durable direction.
- Risks/Assumptions: A standalone component library remains an extraction target rather than a current package boundary; stable reusable APIs must first be demonstrated by SALSAH 2 and at least one project-specific application.

### Update 2026-08-19 00:50

- Decisions: Complete the pre-commit `$final-check` against `HEAD`/`origin/main`; keep project authorization server-authoritative while preventing unvalidated project routes from mounting project-scoped UI; reject ambiguous login return paths; make async project loads generation-safe.
- Implementation: Closed the backslash open-redirect path, preserved authenticated deep-link queries and fragments, gated project content on exact route-to-membership validation, redirected project-load failures to a retryable error view, prevented stale loads from overwriting a newer session, and withheld the login form until refresh-session restoration completes. Retained project-local workspace fragments, added mobile project switching, preserved URLs across locale changes, and closed persistent header menus after navigation. Added security and concurrency regression tests plus mocked browser flows for zero, one, and multiple domain projects; replaced the generated README with project-specific development and verification guidance. Svelte checks, formatting/lint, 30 Vitest tests, production build, and 4 Playwright E2E tests pass.
- Open: Exercise zero-, one-, and multi-project accounts against a live OLDAP API.
- Risks/Assumptions: OLDAP remains the authorization authority for every data operation; frontend route gating is defense-in-depth and prevents incorrect UI/data lifecycles but does not replace backend permission checks. `npm audit` reports three low-severity findings in SvelteKit's transitive `cookie@0.6.0`; no compatible fixed SvelteKit release is currently available and SALSAH does not use that server-side cookie API for its OLDAP refresh cookie.

### Update 2026-08-19 00:30

- Decisions: Make the OLDAP project the explicit runtime working context; hide `oldap:SystemProject` and `oldap:SharedProject` from workspace selection without altering their authorization role; use canonical `/p/[projectShortName]` routes instead of a browser-global project choice; automatically open exactly one project and require a deliberate choice when several are available.
- Implementation: Added typed project metadata loading from user memberships and `/admin/project/get`, exact infrastructure-project filtering, membership deduplication, localized label fallback, project-context state, selection and empty/error views, project-bound workspace routing, guarded deep links, and a header project switcher. Project-scoped component state is reset when the working project changes. Moved the workspace prototype into a reusable component and removed the obsolete static tenant placeholder. Added unit coverage and verified Svelte checks plus a production build.
- Open: Exercise zero-, one-, and multi-project accounts against a running OLDAP API; add single-flight access-token renewal to a shared authenticated API boundary; replace demo workspace data with the first project-bound resource workflow.
- Risks/Assumptions: The OLDAP project response may expose the short name as `projectShortName` or the OpenAPI-documented `shortName`; both are accepted. The full browser-test suite still requires the matching local Playwright browser binary, while all 26 Node-based tests pass.

### Update 2026-08-19 00:08

- Decisions: Implement authentication before archive navigation; follow the existing OLDAP browser-session contract exactly; retain access tokens only in memory and rely on the API's scoped `HttpOnly` refresh cookie; load the authoritative user profile after login or refresh; protect application routes in the root shell while leaving `/login` public.
- Implementation: Added environment-based API origin resolution, typed authentication state, named-user login, one-time session restoration, profile loading, global logout, safe return-path validation, a responsive branded login page, authenticated shell identity, and unit coverage for JWT subject parsing and navigation safety.
- Open: Configure `PUBLIC_API_URL`, ensure the SALSAH origin is present in `OLDAP_AUTH_ALLOWED_ORIGINS`, and exercise login, reload/refresh, invalid credentials, backend outage, and logout against a running OLDAP API. Add single-flight access-token renewal before the first general protected API workflow.
- Risks/Assumptions: Backend logout globally increments `authVersion`, so it revokes the user's refresh sessions across browsers as designed by the current API. French, Italian, and English login messages currently fall back to German.

### Update 2026-08-18 23:57

- Decisions: Introduce a small typed boundary for deployment identity before implementing runtime tenant configuration; keep illustrative archive records in an explicitly named demo module; model open-resource tabs as reusable local UI state without implying persistence or OLDAP integration.
- Implementation: Added static tenant and user configuration, separated recent-resource fixtures, made primary navigation hash-aware, added selectable and closable resource tabs, derived the greeting from the user's local time, covered greeting boundaries with unit tests, and ignored local JetBrains IDE state.
- Open: Review these interactions, decide whether the next vertical slice should be archive navigation or search, and replace static identity/configuration only when its OLDAP and deployment contracts are defined.
- Risks/Assumptions: Tab state is intentionally session-local and resets on reload. Remaining illustrative statistics, collections, and activities still live in the prototype page and should move only when their first real data contract is defined.

### Update 2026-08-18 23:40

- Decisions: Use the horizontal SALSAH 2.0 logo as the top-left home anchor; derive the visual language from its navy, copper, teal, and parchment palette; combine a persistent header with a compact left navigation, resource tabs, and an optional contextual column; transform navigation into a bottom bar on small screens.
- Implementation: Replaced the starter page with a responsive static application-shell and archive workspace prototype, introduced global design tokens and base styles, added German Paraglide messages, and verified desktop and mobile renderings in a browser.
- Open: Review the visual baseline with the project owner, refine the shell from feedback, translate the stabilized messages into French, Italian, and English, and replace remaining generated demo routes.
- Risks/Assumptions: All displayed archive data and controls are illustrative and intentionally have no backend behavior. The current personalized greeting and tenant identity are placeholders for later authenticated and configured values.

### Update 2026-08-18 23:23

- Decisions: Track application source, configuration, translations, documentation, the npm lockfile, brand assets, and shared editor recommendations. Exclude installed dependencies, generated SvelteKit and Paraglide output, local environment files, caches, coverage, and browser-test reports.
- Implementation: Reviewed the initial SvelteKit repository contents, hardened `.gitignore`, excluded generated Inlang metadata from formatting checks, and prepared the first reproducible Git commit.
- Open: Replace the generated demo content with the first static application-shell prototype.
- Risks/Assumptions: The generated SvelteKit demo routes and tests are intentionally retained in the initial scaffold commit so the unmodified baseline remains reproducible.

### Update 2026-08-18 23:18

- Decisions: Establish `salsah-2` as the project root for a project-neutral OLDAP archive management application and VRE. Use SvelteKit, TypeScript, Paraglide, custom CSS, one configured tenant per deployment initially, and a tab-based multi-resource workspace instead of free-floating windows.
- Implementation: Documented the initial architecture, repository state, engineering conventions, incremental roadmap, and brand-asset location; prepared the initial horizontal SALSAH 2 SVG for `static/brand/`.
- Open: Initialize Git, remove or replace generated demo content, and implement the first static application-shell prototype for visual review.
- Risks/Assumptions: The current directory is a generated SvelteKit scaffold but is not yet a Git repository. Shared components must not be extracted from FasnachtsPage until concrete reuse proves a stable generic boundary.
