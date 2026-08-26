# SALSAH 2 Project Context

## Purpose

SALSAH 2 is a project-neutral, configurable archive management application and Virtual Research Environment for the OLDAP backend. It is intended to support multiple organizations and research contexts without embedding Fasnacht-specific concepts in the application core.

The application will reuse proven interaction patterns and selected implementation ideas from FasnachtsPage while keeping tenant configuration, OLDAP ontology semantics, and generic user-interface behavior clearly separated.

The durable product vision, its three pillars (archive work, discovery and public presentation, and narrative contextualization), and the governing engineering principles are defined in `FOUNDATIONS.md`. Architectural and product decisions must remain consistent with that document.

## Current Repository State

- The repository contains a minimal SvelteKit application written in TypeScript.
- Svelte 5, SvelteKit, the Node adapter, Vite, Vitest, Playwright, ESLint, and Prettier are configured.
- Paraglide is configured for German, French, Italian, and English.
- A responsive application shell provides the global header, runtime project context, primary navigation, and project overview. The overview deliberately renders only live OLDAP content; non-functional demo statistics, archive trees, activities, notes, resource tabs, and create/import actions have been removed from this route until their real modules exist.
- Illustrative records remain isolated in an explicit demo fixture for component experiments, but no fixture is rendered in the project workspace.
- Generated demo routes and test examples are still present outside the new root workspace.
- Browser authentication now uses the OLDAP cookie-backed login, refresh, profile-loading, and global-logout contract. The authenticated user's working projects are loaded from OLDAP memberships and project metadata. A general authenticated fetch boundary keeps access tokens in memory, performs one shared refresh after a `401`, and retries each failed request once.
- A first production-data read path is available at `/p/[project]/resource/[...iri]`. The generic detail component loads the project and Shared data models, derives inherited property labels and link targets from the ontology, and presents the live record without Chama-specific rendering logic. Directly linked labels and authorized media delivery now use the additive OLDAP resource-summary batch instead of per-link/per-medium HTTP requests. Attached IIIF images open in a reusable OpenSeadragon viewer, external images use the direct representation, and absent binary media remains an honest placeholder. A non-media archive resource automatically uses its sole readable `shared:hasMediaObject` representation; SALSAH deliberately does not guess when several representations exist.
- The project workspace exposes a responsive live “recently catalogued” card overview backed by OLDAP's structured search. It queries up to eight readable `oldap:Thing` instances, orders them by last modification, obtains class labels from the live project model, and builds canonical resource links without project-specific IRIs. One resource-summary batch enriches card names and direct media; a second batch is issued only for archive-first representation IRIs. Preview failure degrades to a neutral resource symbol without hiding the search hit.
- The existing global search field is functional and project-bound. It routes to the deep-linkable `/p/[project]/search?q=...` page, uses OLDAP's permission-aware broad text search for the first baseline, deduplicates repeated property-level matches by resource IRI, and enriches up to 24 unique results with live names, ontology class labels, generic resource links, and the same optional media previews as the workspace. `Cmd/Ctrl+K` focuses the desktop field; mobile navigation opens the dedicated search page. Search states are localized in all four configured languages.
- The Archiv navigation now opens the real read-only `/p/[project]/archive` route. Its project-neutral tree searches `shared:ArchiveUnit`, loads only visible roots initially and direct children on demand, orders siblings by `schema:position`, displays title and archive level, and links every unit to the generic resource detail. Expanding a unit also resolves its readable `shared:hasMediaObject` contents through the bounded summary API and renders them as linked media rows with authorized thumbnails, making media-first Files and archive-first representations visible without conflating them with structural ArchiveUnits. It embeds no Chama IRIs or hierarchy assumptions.
- A first real demonstration corpus is being prepared in the sibling `../demo-data/` directory around Chama, New Mexico and the Cumbres & Toltec Scenic Railroad. Its working inventory distinguishes intellectual works from file representations and records provenance, rights uncertainty, technical metadata, and SHA-256 fixity without yet committing to an OLDAP ontology.
- Chama is strictly a concrete validation corpus, not the SALSAH 2 product domain. The resulting model and UI boundaries must remain applicable to materially different art, cultural, and historical collections; the Friends of the Cumbres & Toltec Scenic Railroad and the Historical Museum Basel are potential future validation contexts, not assumed customers.
- All six photographs in the first Chama selection now have reviewed owner annotations. `docs/minimal-data-model-v0.1.md` derives a provisional three-layer model from them, compares it with the real Fasnacht ontology, documents existing OLDAP reuse and gaps, and checks the generic boundary against a hypothetical Historical Museum Basel photograph without yet defining an ontology. The comparison leaves archive-first versus media-first catalogue identity deliberately open for a two-record experiment.
- `experiments/catalogue-patterns/` now represents `PICT0111.jpg` and `IMG_1751.HEIC` in both archive-first and media-first RDF graphs. The comparison supports an adaptive default: media-first for standalone media assets and archive-first for a separately meaningful work, physical carrier, archival hierarchy item, or compound resource. Its placeholder vocabulary is not an ontology contract or GraphDB import.
- `experiments/chama-ontology/` contains the reviewed and validated minimal ontology YAML for the two selected patterns. The live OLDAP project has shortname `chama`, project IRI `https://chama.salsah.org`, namespace `https://chama.salsah.org/ns/`, and label `SALSAH 2 Chama Demo`; its ontology is loaded, user `rosenth` has project-administration permission, and the first demonstration instance has been created.
- `experiments/chama-data/` records the exact non-secret API payloads and round-trip observations for the first live data increments. `chama:IMG_1751` has been created and verified as a media-first `chama:CataloguedPhotograph`; `chama:LukasRosenthaler` is its creator, `chama:ChamaStation` its capture place, its day-precision creation date is 2018-07-10, and it depicts `chama:Locomotive488`, which belongs to `chama:K36`. `chama:Annotation_IMG_1751_2026_08_21` preserves the owner's first complete KnowledgeContribution; only its canonical `chama:describes` relation is stored, while OLDAP reasoning exposes the inverse relation on the photograph. Baldwin is now its verified manufacturer and D&RGW plus C&TS are its verified operators; live generic navigation to all three public Organization resources succeeds. The current multivalued `chama:operator` relation is not temporally qualified, so its values describe operators across the locomotive biography rather than simultaneous operation. All directly addressable resources grant anonymous `DATA_VIEW`. The original HEIC has now been attached to the existing resource, converted to a pyramidal TIFF, verified through IIIF Image API 3 level 2 at 9944 × 3700 pixels, and displayed in the live generic viewer.
- The archive-first `PICT0111.jpg` structure is also live: `chama:LobatoTrestlePhotograph1981` is a `shared:Item` with separate public identities for photographer Ruedi Singer, Lobato Trestle, the original slide, and the digital representation. The work-to-representation and representation-to-carrier/digitizer paths round-trip and navigate generically. The JPEG is attached to the representation, delivered as a 3900 × 2600 IIIF Image API 3 level-2 service, and displayed through the same generic viewer on both the representation and work routes without duplicating media metadata. Its KnowledgeContribution remains a separate pending increment.
- `experiments/chama-data/chama-minimal-archive-structure.yaml` has instantiated and idempotently verified the first mixed-pattern archive hierarchy: a heterogeneous `shared:ArchiveGroup`, separate Lukas Rosenthaler and Ruedi Singer Series, 2018/2023 Files linked to the existing media-first photographs, and the existing Lobato archive-first Item assigned through the cycle-safe move endpoint rather than duplicated. This intentionally tests both catalogue patterns in one generic Shared hierarchy.
- `docs/architecture/generic-archive-foundation.md` records the accepted decision to keep stable, cross-domain archive building blocks in the automatically available Shared SHACL/OWL graphs under strict admission and compatibility rules. The foundation grows bottom-up; media-first is a first-class simple path, while archive and cultural objects may have zero, one, or many heterogeneous media representations. A separate dependency-managed module graph is deferred because current model loading, inheritance, factories, queries, and caches explicitly compose only the project and Shared models.
- The initial horizontal SALSAH 2 SVG logo lives in `static/brand/salsah-2.0-logo-horizontal.svg`.
- The directory is initialized as a Git repository; the initial scaffold and authenticated project-scoped workspace are committed. Login and interactive project selection have been exercised successfully against a live OLDAP API; the zero-project and sole-project cases still require live verification.

## Architectural Decisions

- Use SvelteKit and TypeScript with Paraglide for localization.
- Use custom CSS and explicit design tokens; do not introduce Tailwind CSS or a third-party component/CSS framework.
- Keep `oldap-api` as the authoritative application backend. Authentication, permissions, quotas, and data validation must remain server-side responsibilities.
- Keep short-lived OLDAP access tokens in memory only. Let `oldap-api` own the longer-lived refresh token in its scoped `HttpOnly` cookie; never persist either token in browser storage.
- Restore named-user sessions through `POST /admin/auth/refresh`, load the authoritative user profile through `GET /admin/user/{userId}`, and use the global revocation endpoint `POST /admin/auth/logout` for logout.
- Treat an OLDAP project as the tenant and working-context boundary. Exclude `oldap:SystemProject` and `oldap:SharedProject` from user-selectable workspaces while retaining their permissions for authorization.
- Encode the selected working project in canonical `/p/[projectShortName]` routes. Automatically enter a sole project, require explicit selection when several are available, and expose project switching in the global header.
- Separate ontology-defined semantics from UI configuration. UI configuration may control presentation, grouping, ordering, labels, and enabled modules, but must not override ontology constraints or authorization.
- Start with a persistent application shell: global top bar, primary navigation, and project-bound content. Add multi-resource tabs and a contextual panel only with real workflows and data.
- Do not implement freely floating desktop windows initially. Preserve multi-resource work through tabs, browser-deep-linkable resources, and later an optional split view.
- Treat drag-and-drop as a progressive convenience. Every operation must also have an explicit, accessible action.
- Reuse code only after a genuinely generic boundary is demonstrated. Avoid prematurely extracting a shared component library from FasnachtsPage.
- Keep all Chama-specific entities and terminology in its OLDAP project ontology, data, and presentation configuration. Generic application code must operate on configured resource classes, properties, relationships, media, provenance, rights, and narratives rather than railway concepts.
- Grow Shared archive semantics bottom-up. Treat media-first resources and media-free or multi-representation archive objects as equally valid ontology-driven resource patterns; SALSAH components must not assume that every object has exactly one medium.
- Give the first public Chama demonstration record `oldap:Unknown` with `DATA_VIEW`; public visibility must be an explicit instance permission and must not be inferred from descriptive rights metadata such as `publicDisplayPermission`.
- Drive read-only resource presentation from the OLDAP project and Shared models. Merge inherited class properties, use ontology-provided labels, and resolve object links through declared `toClass` constraints; do not add project-specific field mappings to the generic component.
- Route resource identity through `/p/[project]/resource/[...iri]`. Preserve the requested deep link across login and avoid project auto-selection redirects racing the validated post-login destination.
- Distinguish navigable resource relations from OLDAP-managed qualified value structures. `oldap:Dating` is persisted as an RDF resource but serialized by the instance API as a scalar display value; render it as metadata rather than inventing a broken resource link. Keep this platform exception explicit until the API offers a generic value-object marker or structured representation.
- Preserve paragraph breaks in scalar metadata values so long-form annotations and other textual contributions remain readable without introducing class-specific rendering.
- Discover project resources through the permission-aware structured-search API and the generic `oldap:Thing` root rather than embedding demonstration IRIs in application code. Keep live content visibly labelled and do not mix it with prototype fixtures.
- Keep project search configuration outside generic SALSAH code. The first broad `/data/text` slice is a compatible fallback; a later connector-aware slice should consume project Lucene field profiles exposed by OLDAP and use structured `ftfilter` searches without hard-coding Fasnacht or Chama field names. Current `oldap-tools` ontology YAML merges multiple Lucene definition blocks into the project connector, but the runtime data-model response does not yet expose those fields.
- Keep viewer libraries behind small SALSAH component contracts. Resolve short-lived media capabilities separately from descriptive metadata, authorize both IIIF `info.json` and tile requests, and do not couple the archive model to OpenSeadragon or Chama.

## Key Locations

- `FOUNDATIONS.md`: durable product vision, scope, principles, system boundaries, and decision criteria.
- `docs/minimal-data-model-v0.1.md`: evidence-based working model separating generic archival semantics, Chama-domain semantics, and presentation configuration.
- `docs/architecture/generic-archive-foundation.md`: accepted boundary, admission criteria, initial inventory, and evolution rules for generic OLDAP archive definitions.
- `docs/architecture/project-search.md`: current broad-search contract, result enrichment, and the planned ontology-defined Lucene profile boundary.
- `experiments/catalogue-patterns/`: syntactically valid RDF and a human-readable comparison of archive-first and media-first catalogue identity using two real Chama records.
- `experiments/chama-ontology/`: loaded minimal Chama ontology, concept classification, deliberate omissions, accepted decisions, and the next instance-creation gate.
- `experiments/chama-data/`: reproducible request evidence and round-trip findings from live Chama instance experiments; not yet a generic data-import format.
- `src/routes/`: SvelteKit routes and layouts.
- `src/lib/components/`: reusable application-shell and workspace components.
- `src/lib/auth/`: in-memory authentication state, login/refresh/logout orchestration, and safe post-login navigation.
- `src/lib/api/client.ts`: authenticated browser fetch boundary with single-flight token renewal and one retry after authentication expiry.
- `src/lib/api/baseUrl.ts`: browser-visible OLDAP API origin resolved from `PUBLIC_API_URL`.
- `src/lib/projects/`: typed project loading, infrastructure-project filtering, localized display names, selection state, and canonical project paths.
- `src/lib/resources/`: generic OLDAP resource/model loading plus ontology-driven presentation transformation.
- `src/lib/media/`: generic media-delivery helpers, including capability-safe IIIF request URLs.
- `src/lib/components/media/IiifImageViewer.svelte`: reusable OpenSeadragon-backed IIIF image component with localized controls and no project-specific knowledge.
- `src/lib/components/resources/ResourceDetail.svelte`: reusable read-only resource presentation, media composition, relation navigation, and explicit missing-media state.
- `src/lib/components/resources/LiveResourceList.svelte`: project-neutral, permission-aware recent-resource card discovery with optional direct or archive-first media previews.
- `src/lib/components/resources/ResourceCardGrid.svelte`: shared ontology-labelled result cards used by the workspace and project search.
- `src/lib/components/search/ProjectSearch.svelte`: project-wide search form and localized loading, failure, empty, and result states.
- `src/lib/demo/`: backend-independent fixture data that must never be confused with OLDAP records.
- `../demo-data/`: source media plus a cautious CSV working inventory and fixity manifest for the Chama demonstration; it is research material, not an application fixture or a set of automatically publishable assets.
- `src/lib/`: future domain code, API client code, and utilities.
- `messages/`: Paraglide translation messages.
- `static/brand/`: version-controlled brand assets served unchanged.
- `project.inlang/`: localization configuration.
- `codex.md`: stable project and architectural context.
- `CODEX_LOG.md`: descending chronological implementation log.

## Engineering Style

- Keep all code, identifiers, comments, and repository documentation in English.
- Prefer small, testable vertical increments that can be inspected in the browser.
- Use explicit TypeScript interfaces and predictable component contracts.
- Keep project-specific behavior in configuration or project modules rather than generic components.
- Prefer composition over speculative abstraction, registries, or thin wrapper layers.
- Preserve browser navigation, deep links, accessibility, and responsive behavior as core application invariants.
- Document important modules, components, state transitions, inputs, outputs, and side effects.

## Incremental Roadmap

1. Replace the generated starter page with a static application-shell prototype. Completed as an initial visual baseline.
2. Establish and evaluate the responsive visual language. Completed for the real project overview and resource detail; tabs and contextual panels remain deferred until backed by real workflows.
3. Establish runtime OLDAP project selection and project-bound deep links. Completed as the first tenant-context foundation; project-specific UI configuration remains open.
4. Add OLDAP authentication and a typed API boundary. Login, refresh, user-profile loading, route guarding, logout, and the general authenticated read boundary are implemented. Mutation-specific API behavior remains deliberately deferred.
5. Apply the accepted Shared placement rules to the completed minimal data-model sketch and catalogue-pattern experiment; derive and load the confirmed subset as a Chama demonstration ontology; explicitly classify every reused or new concept; then implement one media-first and one archive-first resource through the same vertical workflow. Both catalogue patterns now round-trip through metadata, binary attachment, IIIF delivery, resource detail, and generic project-card preview.
6. Add archive navigation, media, staging, and ZIP import as independently testable modules.
7. Add concrete VRE capabilities only when justified by real research workflows.

## Immediate Next Step

Exercise the broad project search against the live Chama corpus with several title, description, person, place, and locomotive terms. Use those observations to decide the next small slice: either expose ontology-defined Lucene search profiles through a backwards-compatible OLDAP contract and add a Chama connector, or first address a concrete result-presentation issue found during testing. Do not add speculative facets. The pending `PICT0111.jpg` KnowledgeContribution and inherited photographer label remain bounded data/model follow-ups.
