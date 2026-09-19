# CODEX_LOG

### Update 2026-09-19 23:54

- Decisions: Prepare an application-only staged commit; leave all experiment payload/ontology changes local and unstaged. Preserve previously committed experiments and history.
- Implementation: Include generic archive/staging/resource/Story administration, translations, tests, documentation and published npm dependencies. Ignore private experiment YAML and all real environment files; document repository boundaries and correct obsolete local-library setup notes. Normalize four formatting outliers. Update archive browser test to open the import disclosure before choosing its source.
- Open: User reviews staged changes and commits/pushes. Existing tracked examples remain in history; this is not a history scrub. Deployment and live backend acceptance remain separate.
- Risks/Assumptions: Credential-pattern review found only synthetic test tokens and labels, no real credentials in the application candidate set. Typecheck and build pass; 105 unit tests pass; 16 browser tests passed initially and all four archive scenarios passed after correcting the stale UI interaction. Full lint passes before the final log/test edits, with targeted formatting/lint repeated afterward.

### Update 2026-09-15 23:48

- Decisions: Make archive section navigation visually read as tabs rather than action buttons.
- Implementation: Shared baseline, rounded upper corners, muted inactive tabs and white active tab with accent top edge and open bottom border. Single horizontally scrollable row on narrow screens; selection logic and mounted panels unchanged.
- Open: User visual acceptance.
- Risks/Assumptions: CSS-only change to section navigation in both applications; no API or data changes.

### Update 2026-09-15 23:41

- Decisions: Organize archive administration by structure, folder defaults and contents, rather than stacking all tools. Preserve mounted panels and in-progress edits across section changes.
- Implementation: Consistent accessible section navigation; import disclosure; normalized heading hierarchy. FP adds object/event and media subviews, removes obsolete step numbers. SALSAH embeds its existing generic resource administration and retains existing import capabilities; no project-specific content classes introduced. Technical administration remains below the workspace.
- Open: User visual acceptance. SALSAH has no YAML import in this existing workflow; no new import backend was added.
- Risks/Assumptions: No API or permission changes. Browser navigation/state/mobile smoke passed; existing proposal/retry state remains mounted when hidden.

### Update 2026-09-15 23:16

- Decisions: Keep operator recovery secondary to archive work, visible only after server-confirmed canRecover.
- Implementation: Collapsed native Technical Administration disclosure at the bottom of archive administration; detailed recovery controls/errors stay inside. Poll only while expanded. Rejected coordination requests expose a dismissible operator-only shortcut; ordinary occupied status remains quiet. Existing retry persistence and recovery safeguards retained.
- Open: User visual acceptance; production deployment separate.
- Risks/Assumptions: Browser fixture verified both panels, keyboard use, failed-action shortcut and unauthorized hiding without mutations. SALSAH uses published guilib ^0.0.27 to match FP; no backend or role changes.

### Update 2026-09-14 22:59

- Decisions: Distinguish active saves from permission/recovery disabling with an explicit busy prop in the shared mapping editor.
- Implementation: Wait cursor throughout the editor, animated progress in the assignment button and live status, busy tree semantics and reduced-motion support. Administration passes busy through preflight, apply and authoritative refresh. Browser regression holds preflight/refresh responses to verify feedback persists and clears on failure/completion.
- Open: User visual acceptance; existing local guilib release workflow unchanged.
- Risks/Assumptions: Presentation-only change for both consumers; no API, data or permission changes.

### Update 2026-09-14 22:50

- Decisions: Add generic permission-filtered direct media counts to folder-default proposals; use one aggregate query, never per-folder media reads. Counts are display-only and excluded from review hashes.
- Implementation: oldaplib COUNT(DISTINCT media) covers same-area staging media and configured archive references. Optional directMediaCount documented in shared JSON schema/OpenAPI; regenerated FP types; shared UI consumes counts with older-server fallback. 28 backend tests and browser count/recovery smoke pass. Local GraphDB: 46 folders/125 visible placements, 7–30 ms aggregation; three inventory comparisons agree. API HTTP 200 verified after safe restart (cold proposal 21.6 s, warm 1.86 s for sampled folder).
- Open: Normal version bumps/publication and consumer updates before production. Existing frontend/library check baselines remain; no ontology changes.
- Risks/Assumptions: Local API uses a development wheel still labelled 0.7.19, ahead of published 0.7.19; do not deploy that version as if released. Backup: BACKUP/local-media-counts-20260914-224638/installed-oldaplib.tar.gz. No archive data, role or production writes. Zero means no visible direct media, not proof of global emptiness.

### Update 2026-09-14 22:36

- Decisions: Scroll working and archive trees independently in the shared mapping editor; offscreen connections must remain discoverable without moving the opposite pane.
- Implementation: Separate keyboard-focusable viewports and scroll offsets, fixed SVG geometry, dashed clipped connections and grouped top/bottom reveal buttons. Drag coordinates follow the left offset. FasnachtsPage prototype now wraps the same controlled editor with disposable state. Six model tests and browser independent-scroll/reveal/drag regression pass.
- Open: User visual acceptance; existing unpublished guilib release requirement remains.
- Risks/Assumptions: No persistence/API/permission changes. Connections with both endpoints offscreen are omitted; collapsed/search-hidden targets remain reachable with the existing reveal action. Existing type-check baselines retained.

### Update 2026-09-14 22:24

- Decisions: Share the accepted graphical mapping UI and generic OLDAP composition through oldap-guilib; app wrappers retain authentication and key instances by origin/project/user.
- Implementation: Real folder/unit/default loading, namespace resolution, protected/unavailable states, mapping preflight and persisted exact retries, property-only level edits with uncertain-result readback, inverse undo and legacy FasnachtsPage pending-command migration. Both frontends use local development links. Browser mocked-command/reload tests and four shared model tests pass; builds and targeted lint verified.
- Open: Authenticated user acceptance against real data; library release and consumer dependency updates before deployment. Live media counts are unavailable in the existing API and explicitly labelled unknown.
- Risks/Assumptions: No real resource/ACL writes, ontology changes, publication or deployment during tests. Existing unrelated work preserved. Shared library has pre-existing check failures outside the new components; FP baseline remains 23 errors/37 warnings; SALSAH check clean. See shared component docs for generic level-write uncertainty limits.

### Update 2026-09-13 23:18

- Decisions: Activate publication on the local MacBook first; production remains unchanged. API-only media workers do not require an independent archive policy or Redis gate.
- Implementation: Verified installed oldaplib 0.7.19; replaced three local media containers using old :local/0.7.11 with v0.2.12/0.7.19, persisted Compose tag and backed up configuration. Validated/atomically added local publication policy and safely restarted native API under writer gate. Installed-library GraphDB success/retry/receipt and failure rollback pass; API capabilities 200, unauthenticated 401, authorized IIIF 200/unauthorized 401. BMG-Archivist publisher membership verified read-only.
- Open: User authenticated UI acceptance; separately coordinated production activation. Public archive viewer token propagation remains separate.
- Risks/Assumptions: No existing RDF resource, role assignment or public grant changed; fixtures/receipts rolled back. Backups in BACKUP/local-publication-20260913-231358 and local-publication-policy-20260913-231513.json. No CaptureApp, production, version or Git publication changes.

### Update 2026-09-13 00:58

- Decisions: Use the same generic publication backend with no fixed project roles/classes/status values.
- Implementation: Added PublicationPanel to ResourceEditor with resource-specific capability, reviewed confirmation, actor/API-scoped session retries and dirty-state guard. Configured status is excluded from generic relation editing. Validation: 85 focused backend/gate tests and 4 frontend retry tests pass; local GraphDB success/replay and injected-failure rollback pass. Both frontend builds/lint pass; FP check baseline unchanged (23/37), SALSAH check clean.
- Open: Matching backend/policy activation and authenticated publication browser acceptance.
- Risks/Assumptions: Preserved substantial pre-existing uncommitted SALSAH work. No deployment, ontology or CaptureApp change.

### Update 2026-09-10 12:10

- Decisions: Complete WR-04 local operational acceptance; enable only the explicitly authorized rosenth operator. Production remains a separate target-specific rollout.
- Implementation: Rebuilt and linted the existing recovery UI; repeated browser failure/retry flows and checked native-backed local activation. No SALSAH source or CaptureApp changes in WR-04. Local SALSAH CORS origin localhost:5175 was added and verified against the actual API. Acceptance: 50 recovery/native, 19 deployment, 49 authentication/Capture transport and 8 frontend tests pass; 10 native and 15 pinned Redis checks pass. Both live/fixture UI flows and builds pass; FP typecheck baseline remains 23 errors/37 warnings, SALSAH is clean.
- Open: Production multi-host/SSH partition, whole-host reboot and independent-storage restore acceptance; native Capture acceptance retains the user's local waiver.
- Risks/Assumptions: Native services must remain foreground and within the reviewed inventory; unmanaged direct writers are maintenance-only. Persistent controller/gate state never expires. No commit, push or production deployment.

### Update 2026-09-10 01:32

- Decisions: Keep recovery authorization independent of archive editing; all proof and release safety remain in the shared backend.
- Implementation: Added operations transport/validated projections and an operator-only panel in project archive administration. Explicit global-maintenance and release confirmations, exact persisted retries, read-only polling/lookup, user-scoped storage and revocation handling. Blocked archive errors direct operators to diagnosis. Added focused tests and docs/wr-03.
- Open: WR-04 real runtime/native MacBook acceptance before enabling recovery. Existing project workspace entry requirements remain intact.
- Risks/Assumptions: Six focused client tests, targeted ESLint, build and clean svelte-check pass. Browser fixtures cover retries/reload/controller blocking/proof readiness/lost response/revocation/disabled state. No actual archive write, role grant or runtime activation.

### Update 2026-09-09 23:19

- Decisions: Include SALSAH-2 in the authorized MacBook rollout; retain project-neutral behavior.
- Implementation: Production build passed and local dev server started on port 5175 against activated API/model/policy. Browser login boundary verified; no client source changes in this rollout.
- Open: Fresh signed-in client walkthrough and separate production rollout; see ../FasnachtsPage/docs/as-09/local-rollout.md.
- Risks/Assumptions: API authorization checks pass; browser login display is not claimed as authenticated UI acceptance.

### Update 2026-09-08 14:12

- Decisions: Complete AS-07 client source with shared contracts and no project-domain imports; migration/native acceptance and policy rollout remain AS-08/AS-09.
- Implementation: SALSAH reviewed adoption/unit tools, persistent exact retries, mixed protected references, private folder rename/move, direct defaults and atomic catalogue placement, ZIP controls, namespace-derived IRI compatibility and paginated hierarchy choices. 103 unit tests, 17 browser tests, full lint/build and 0-error/0-warning typecheck pass; desktop/mobile reviewed. Evidence: docs/as-07/README.md.
- Open: AS-08 migration and acceptance, including production role/data checks and native Capture maintainer coordination; AS-09 rollout.
- Risks/Assumptions: Browser acceptance uses intercepted museum fixtures. No live RDF/ontology/backend/CaptureApp changes, role provisioning, policy activation or deployment. Existing uncommitted work preserved; disposable preview servers stopped.

### Update 2026-09-08 14:00

- Decisions: Implement AS-07 against shared backend contracts, keeping the existing uncommitted administration work and live Chama data intact. Capability lookup fails closed; no activation or CaptureApp changes.
- Implementation: Added generic mixed inventory, protected reference actions, revision-bound recovery, folder defaults and atomic archive placement, ZIP export controls and reviewed admin structure management. Four-language interface text added.
- Open: Complete regression/type/lint/browser verification, strengthen recovery and document final acceptance evidence.
- Risks/Assumptions: Existing generic catalogue transform still removes media-side Staging placement; retained references live on folders. Tests use fixtures, not production policy activation.

### Update 2026-08-31 01:16

- Decisions: Keep relation candidate types faithful to the ontology. Because Chama declares photograph creator as `chama:Agent`, do not apply a Person-only UI filter. Consolidate the already proven thumbnail/lightbox behavior before using it in a second workflow.
- Implementation: Added reusable `CompactMediaPreview` with authorized thumbnail, failure fallback, enlarged dialog, backdrop/cancel/close handling, and localized accessibility labels. Replaced the batch catalogue's private implementation and added the same preview beside the generic resource-editor heading. The editor now loads media through the existing complete resource boundary. No ontology or API contract changed.
- Open: Visually inspect one media-first and one archive-first resource in the live editor. If a project truly needs Person-only creators, express that through the class property's `toClass` rather than a SALSAH filter.
- Risks/Assumptions: Agent candidates may include both Persons and Organizations by design. The compact preview uses authorized bounded delivery and is for identification; OpenSeadragon remains the full inspection viewer on the read-only resource page.

### Update 2026-08-31 00:55

- Decisions: Keep post-catalogue editing separate from Staging and specialized Story authoring. Start with a conservative model-derived surface—title, description, and optional forward relations—and leave Dating, rights, technical media facts, inverse links, permissions, and archive placement to dedicated widgets/workflows.
- Implementation: Activated the Resources administration module with bounded recent/search discovery, authorized previews, canonical editor routes, multilingual draft preservation, model-derived relation candidates, partial atomic OLDAP update, exact controlled-field read-back, unsaved-change protection, four-language UI, architecture documentation, and focused model regressions. Staging areas, folders, and media are excluded from ordinary editing.
- Open: Live-edit one harmless Chama photograph and inspect the read-only detail afterwards. Adding a language, candidate search/pagination, Dating, rights/publication, and archive placement remain independent increments.
- Risks/Assumptions: The first relation control uses native single/multiple selection and loads at most 100 readable candidates. Existing linked IRIs missing from that list are preserved visibly by IRI rather than silently removed. OLDAP remains authoritative for mutation permission and ontology validation.

### Update 2026-08-31 00:32

- Decisions: Derive the first common object relationships from ontology constraints rather than Chama QNames. Admit optional forward relations with a concrete target class; defer embedded Dating, root-wide Thing selection, inverse relations, multiple selected values, and pagination to interaction patterns that can represent them honestly.
- Implementation: Extended data-model property typing with `inverseOf`; added model-derived catalogue relation descriptors, bounded permission-filtered candidate loading, localized common-value selectors, preview labels, relation payload/read-back verification, and forwarding through the stop-on-first-failure batch executor. Chama consequently exposes Agent-based creator and Place-based capture place. Added relation derivation/search/mutation regressions and exercised both selectors in the full Staging browser flow.
- Open: Test creator and capture-place assignment on real Chama photographs. The next independent rich field should be the OLDAP Dating editor rather than widening this simple relation picker.
- Risks/Assumptions: The first picker applies one common candidate even when the ontology permits several. Candidate lists are bounded to 100 readable resources; larger authority files require search/pagination before this interaction should be promoted as complete.

### Update 2026-08-31 00:14

- Decisions: Treat visual recall as part of usable metadata entry, not optional decoration. Reuse authorized media delivery for bounded previews and keep every delivery capability outside the catalogue draft.
- Implementation: Added per-item thumbnails to the first batch form, neutral fallback for unavailable delivery, and an accessible second modal with a larger preview, filename caption, backdrop/close/Escape dismissal, and responsive sizing. Extended the full Staging browser test through thumbnail activation and enlarged-preview closure; Svelte accessibility checks remain clean.
- Open: Exercise the thumbnail density and enlarged preview with several real Chama images of different aspect ratios.
- Risks/Assumptions: The larger preview is for identification, not the full OpenSeadragon inspection experience. It uses the existing bounded preview URL; full-resolution study remains on the resource detail.

### Update 2026-08-31 00:05

- Decisions: Make the first true batch catalogue workflow explicit and reviewable: common model-derived class/language/description, individual editable titles, full preview, then sequential per-resource transforms. Preserve OLDAP's actual atomicity boundary and stop at the first failure instead of claiming an all-or-nothing client batch.
- Implementation: Added a reusable batch catalogue executor and modal workflow, filename-derived title suggestions that remain drafts, complete preflight presentation, progress, exact catalogued/failed/not-started reporting, selection/tree reconciliation, four-language copy, two focused executor regressions, and a full mocked UI path from selection through verified batch completion.
- Open: Exercise two or more real Chama images with harmless minimal metadata. Then decide which richer common relations—creator, capture place, dating, rights, or archive placement—earn the next ontology-driven form increment.
- Risks/Assumptions: A confirmed multi-item batch may be partially complete because OLDAP exposes one atomic transform per resource. The UI stops immediately, preserves unstarted selections, and reports exact outcomes; it never promises rollback. Suggested titles derived from filenames require human review.

### Update 2026-08-30 23:48

- Decisions: Establish batch work first as an explicit selection and sequential review queue; do not turn several heterogeneous Staging resources into one unchecked bulk mutation before shared-field semantics and partial-failure reporting are designed.
- Implementation: Added accessible per-media selection across loaded folders, a responsive selection toolbar, clear/edit actions, queue position plus previous/next navigation in the existing review dialog, and automatic queue/tree reconciliation after catalogue or discard. Added four-language copy and extended the full mocked Staging browser lifecycle through selection-based cataloguing.
- Open: Exercise multi-selection with the newly imported Chama photographs. Next, design model-derived shared metadata with per-resource overrides and an explicit preflight/report boundary before performing any multi-resource catalogue transition.
- Risks/Assumptions: Selection is intentionally browser-local and resets when the StagingArea changes or the page reloads. Every catalogue/discard remains an individually authorized operation with existing read-back; no new API contract or bulk-write behavior was introduced.

### Update 2026-08-30 23:36

- Decisions: Do not treat textual QName versus absolute-IRI serialization differences—or a browser-side interpretation of expiry/authorization flags—as authorization failures. The UI checks only matching job/report identity and READY lifecycle; OLDAP's version-bound confirm transaction is authoritative for every mutable safety condition.
- Implementation: Removed over-strict client equality checks for target serialization and filename plus redundant browser gating on expiry and `canConfirm`; retained matching import ID and READY job/report states. Added confirmation entry points both directly below the READY notice and after the potentially long inventory. Corrected the missing global `--teal-dark` and `--canvas` design tokens: Safari had rendered the white confirmation label on a transparent white background because its background declaration referenced the undefined token. Added regression coverage for equivalent target serializations.
- Open: Reload the real Chama READY job and perform its two-step confirmation.
- Risks/Assumptions: The browser is a UX guard, not the security boundary. OLDAP still owner-checks the report and rechecks job version, authorization, target, quota, collisions, and expiry on confirmation.

### Update 2026-08-30 22:57

- Decisions: Treat ZIP jobs as durable OLDAP workflow records, not component state; reuse the existing caller-owned paginated list contract and keep project filtering in SALSAH without widening the API.
- Implementation: Added strict recent-job page parsing, a localized eight-job project history, authoritative reopen-by-import-ID with report recovery and polling, live row reconciliation, and responsive styling. Added unit coverage for list parsing and extended the browser flow to close and resume a READY job before version-bound confirmation.
- Open: Resume and confirm the existing real Chama READY job, then inspect its committed folder/media rows and IIIF derivatives.
- Risks/Assumptions: The current bounded view inspects the newest 100 caller-owned jobs and displays eight for the active project; cursor navigation can be added when real usage demonstrates a need for deeper history.

### Update 2026-08-30 00:54

- Decisions: Require both a validated immutable report and a second explicit user action before importing ZIP contents; bind confirmation to the exact reviewed state version and refresh only the selected target after completion.
- Implementation: Added strict v1 report parsing and cross-checks for identity, target, expiry, SIP/manifest evidence, summary, issues, and entries; localized report/structure/evidence presentation; a two-stage confirmation; authoritative IMPORTING/IMPORTED polling; and target-folder reconciliation. Expanded focused coverage to six client/report tests and a full browser sequence through final imported-tree visibility.
- Open: Exercise the existing READY Chama job live and inspect the resulting images/IIIF derivatives.
- Risks/Assumptions: Confirmation is intentionally unavailable when report and job identity, target, filename, state, or expiry disagree.

### Update 2026-08-30 00:13

- Decisions: Reuse the complete OLDAP ZIP job boundary as a project-neutral Staging workflow; require an explicit existing target folder, direct capability upload, authoritative polling, and no automatic import after validation.
- Implementation: Added strict browser envelope validation, job creation with project QNames, identity-bound capability PUT with progress/cancellation, status polling through `READY`/terminal states, per-folder localized ZIP controls, focused client tests, and an end-to-end regression alongside the existing image lifecycle. Synchronized oldap-api request validation and both OpenAPI copies so the selected project's QName is accepted and canonical absolute IRIs remain response-authoritative.
- Open: Live-test one small disposable Chama ZIP. The next slice renders the immutable validation report and adds explicit optimistic-lock confirmation before committed-tree inspection.
- Risks/Assumptions: The first UI slice intentionally stops at `READY`; it cannot import content accidentally. Notification-link hosts are still deployment-specific and must be generalized before relying on ZIP email from non-Fasnacht projects.

### Update 2026-08-29 23:38

- Decisions: Reuse OLDAP's existing atomic instance-transform contract for the first Staging-to-catalogue transition; retain identity and Shared media facts, derive eligible target classes from live models, and exclude classes whose required fields the deliberately small form cannot satisfy.
- Implementation: Added model-derived catalogue targets, localized single-valued title/description entry, explicit metadata language, guarded `shared:StagingMediaObject` to project-media transformation, exact read-back of class/values/Staging removal/asset identity, tree reconciliation, four-language UI, focused unit coverage, and a mocked end-to-end catalogue flow. No API or media-server change was necessary.
- Open: Catalogue one real Chama Staging image and inspect the resulting generic resource detail, IIIF image, fixity, permissions, and absent Staging placement. ZIP ingest and richer metadata remain separate increments.
- Risks/Assumptions: The form intentionally offers only targets whose additional required properties are supported by `schema:name` and `schema:description`; optional creator, dating, place, subjects, rights, and other relations remain for later editing. A successful transition removes the resource from its working-area context but does not move or rewrite media files.

### Update 2026-08-29 23:24

- Decisions: Complete the first single-object Staging lifecycle with an administrative review and identity-bound discard before adding ZIP upload or catalogue transitions.
- Implementation: Added a preview/fixity/delivery review dialog, exact Staging discard client, explicit confirmation, local tree reconciliation, four-language copy, focused unit coverage, and a mocked browser path covering inspect, upload, discard, and disappearance. The media owner performs the destructive safety checks and rollback.
- Open: Inspect `PICT0039.JPG` without deleting it, then upload and discard a disposable test image for live acceptance.
- Risks/Assumptions: Successful discard is destructive by design. SALSAH requires a non-empty asset ID and exact server response identity; catalogued-resource deletion and dependency policy remain outside this Staging-only operation.

### Update 2026-08-29 03:18

- Decisions: Treat the successful OLDAP target response as authoritative and accept canonical absolute target IRIs as equivalent to submitted project QNames; retain strict validation of every required upload response field.
- Implementation: Removed incorrect string-equality checks between submitted and returned target identifiers, required non-empty returned target IRIs, added canonicalization coverage, and recorded the successful first Chama Staging media/metadata write.
- Open: Refresh the live Staging workspace and verify that the already-created `PICT0039.JPG` row and thumbnail appear; do not upload it a second time.
- Risks/Assumptions: The browser does not attempt namespace reasoning. Authorization and canonicalization remain server-side OLDAP responsibilities, and media-server HTTP 200 confirms the first write completed.

### Update 2026-08-29 01:15

- Decisions: Make the first Staging mutation one explicit image-to-folder upload. Keep target authority in OLDAP, reuse the media server's existing derivative/rollback path, and require normal OLDAP plus media-delivery read-back before reporting success.
- Implementation: Added `PUBLIC_MEDIA_URL`, a typed XHR upload client with progress/cancellation/token renewal and JPEG/PNG/HEIC/HEIF validation, per-folder upload controls, localized status/error UI, folder refresh and IIIF verification, focused unit coverage, and a fully mocked upload browser test.
- Open: Restart oldap-api, rebuild/restart oldap-mediaserver, restart SALSAH for the public media URL, then upload one real Chama image into `Eigene Fotografien`. ZIP upload and cataloguing transitions remain independent.
- Risks/Assumptions: This increment intentionally accepts one still image only. A successful transfer followed by failed read-back is reported honestly as a partial-success condition. No live data or GraphDB-backed test was touched.

### Update 2026-08-29 00:39

- Decisions: Accept the Chama staging metadata increment as live and idempotent only after all three gates—dry-run, first apply, and identical rerun—succeed for the complete five-resource batch.
- Implementation: Recorded `would_create`, then `created`, then `existing_verified` for the StagingArea, technical `top`, `Eingang`, `Eigene Fotografien`, and `Historische Quellen`; every phase correctly reported `media=not_declared`. Documented the three audit-report paths and updated the stable live-state context.
- Open: Inspect the hierarchy in SALSAH. If presentation is correct, design the first single-file upload into the explicitly selected `Eigene Fotografien` folder before introducing ZIP upload.
- Risks/Assumptions: Metadata success does not yet prove that the `chama` media path is writable by the media service; that belongs to the single-file upload acceptance test. No binary was uploaded in this increment.

### Update 2026-08-29 00:10

- Decisions: Establish one minimal private Chama ingest workspace before implementing upload. Preserve the technical `top` root expected by existing OLDAP staging workflows; keep `Eingang`, `Eigene Fotografien`, and `Historische Quellen` as operational folders rather than pretending they are the final archive hierarchy.
- Implementation: Added a five-resource, create-only/idempotent `oldap-tools` batch for a generic Shared StagingArea, its 10-GiB quota, `chama` media path, Curator default/write role, and three-level folder structure. Documented the exact prompt-safe dry-run/apply commands, acceptance sequence, permissions, and the boundary between the next single-file test and later ZIP ingestion.
- Open: Run the live dry-run and inspect all five planned resources; apply only after a clean preflight, rerun for `existing_verified`, and inspect the resulting SALSAH tree. Then design one-file upload into `Eigene Fotografien` before ZIP upload.
- Risks/Assumptions: `chama:Curator` must exist, be visible, and be assigned to future ingest users; project administration is not a substitute for the operational role. The `shared:mediaPath` value `chama` is storage configuration and must be accepted by the media services before binary upload. No live data was changed while preparing this batch.

### Update 2026-08-28 23:52

- Decisions: Add thumbnails as a bounded enrichment of the existing generic staging rows, not as a gallery or one viewer per object. Resolve delivery once per expanded folder, request only image media, and preserve the neutral type icon for non-images and failed delivery.
- Implementation: Added reusable 160-pixel IIIF thumbnail URL generation with capability propagation; batch-enriched visible image objects through the resource-summary endpoint; rendered lazy, asynchronously decoded thumbnails with accessible fallback; and added focused URL, staging-client, non-image, and mocked browser coverage. Updated the staging architecture and stable project context.
- Open: Verify thumbnail appearance and fallback behavior in several live BMG-Staging folders. Then create a minimal Chama StagingArea/folder hierarchy before designing one-file upload; large-folder pagination remains independent.
- Risks/Assumptions: Each expanded folder is still bounded to 100 readable objects and each visible image causes one small IIIF request, normally browser/server cached. Delivery capabilities remain short-lived and are never persisted. All tests use mocks and perform no GraphDB writes.

### Update 2026-08-28 23:36

- Decisions: Extend the existing read-only tree with generic staged media rather than designing a photo-only gallery or introducing upload/catalogue mutations. Keep direct folder membership and OLDAP permission filtering authoritative.
- Implementation: Added a typed `shared:StagingMediaObject` search constrained by selected area and folder; expanding a folder now loads subfolders and media together and renders filename, MIME type, staging status, generic image/document icon, and the normal resource-detail link. Updated four-language copy, focused client coverage, and the fully mocked read-only browser workflow.
- Open: Verify several real BMG-Staging folders in the live UI. Then create a minimal Chama StagingArea/folder hierarchy before designing one-file upload; pagination remains a separate evidence-driven increment.
- Risks/Assumptions: Each direct media search remains bounded to 100 readable objects. Large-folder pagination is intentionally deferred. Unit tests, Svelte/TypeScript checking, and the mocked browser test pass without GraphDB writes.

### Update 2026-08-28 00:34

- Decisions: Preserve the explicit OLDAP filter-expression contract in the staging client; multiple structured filters must be separated by a logic operator rather than relying on an implicit conjunction.
- Implementation: Inserted `AND` between the StagingArea boundary and root/parent-folder condition for both root and child searches. Tightened unit and browser fixtures to require the operator. SALSAH checking and focused unit/browser tests pass; all 15 OLDAP API structured-search tests also pass.
- Open: Refresh the live Fasnacht staging page and verify that root folder `top` and its lazy children render with the authenticated user's real permissions.
- Risks/Assumptions: This was a SALSAH request-construction defect; no Fasnacht data, OLDAP API contract, or oldaplib implementation changed.

### Update 2026-08-28 00:24

- Decisions: Make the second administration increment a strictly read-only view over the existing generic Shared staging vocabulary. Keep OLDAP permission filtering authoritative, constrain every folder query to the selected StagingArea, and load one tree level on demand. Defer staged media, uploads, folder mutation, movement, and catalogue transitions to explicit later contracts.
- Implementation: Activated `/p/[project]/admin/staging` and its administration card; added typed StagingArea/StagingFolder search mapping, area metadata, area switching, lazy folder expansion, generic record links, honest loading/error/empty states, responsive four-language UI, focused client tests, and an end-to-end navigation/switch/expand test. Type checking is clean, focused unit tests pass, the browser test passes, and its 1280×720 trace was visually reviewed.
- Open: Validate the empty state in Chama or create a real project StagingArea through the established OLDAP administration workflow. Design the next small increment as one-file upload into an explicitly selected existing folder with progress, validation, recovery, and read-back.
- Risks/Assumptions: Search responses are bounded to 100 areas or folders per queried level; pagination is deferred until real collections require it. A folder without loaded children initially remains expandable because the client cannot know whether readable children exist until queried. No data mutation is performed by this module.

### Update 2026-08-28 00:07

- Decisions: Complete the existing Story workflow before starting staging. Treat title, optional summary, and Markdown as language-specific facets of one editor draft; keep author Story-wide and constrained by the live ontology target. Update only controlled Story properties and require exact read-back rather than inferring success from the mutation response.
- Implementation: Added localized title, summary, and model-derived author editing to the existing responsive Story editor; unified languages found across metadata and narrative without inventing values; preserved untouched translations; added required-title/author validation, reset/navigation protection, focused atomic payloads, and exact set-based verification of name, abstract, author, text, and mentions. Added four-language UI text, model/client regressions, and an end-to-end metadata+narrative+asset save test. Visual trace review at 1280×720 confirms the metadata panel integrates cleanly above the Markdown/preview split.
- Open: Perform a harmless live edit/save/reset check on the Chama Story. Then add a read-only administration view for existing StagingAreas and StagingFolders before implementing upload or catalogue transitions.
- Risks/Assumptions: The current editor manages existing language variants but does not add or remove languages. It deliberately leaves permissions and unrelated Story properties unchanged. The author search remains bounded to 100 readable resources; the current author is retained by IRI even if absent from that result set.

### Update 2026-08-27 23:35

- Decisions: Treat Story authorship as a project-model decision rather than a SALSAH special case. Narrow Chama's author target from `chama:Agent` to `chama:Person`, while retaining the broader Agent class for provenance relationships and allowing other projects to choose their own author target.
- Implementation: Updated the Chama Story constraint and ontology documentation; synchronized Story administration fixtures so creation searches `chama:Person`; documented the generic `schema:author to_class` boundary in the administration architecture and stable project context. The ontology validates, focused unit tests pass, both Story administration browser tests pass, and check, lint, and production build are clean.
- Open: Load the ontology through backed-up update mode, refresh SALSAH, and confirm that the live author list contains only visible Person resources. Continue next with focused Story metadata editing.
- Risks/Assumptions: Existing Chama Story authors must satisfy `chama:Person`; the current live author `chama:LukasRosenthaler` already does, so no instance-data migration is expected. A running API may need its model cache refreshed according to the normal ontology-update workflow.

### Update 2026-08-27 23:11

- Decisions: Create Stories through the same ontology-derived class contract as editing; keep the authenticated OLDAP user distinct from the catalogued author resource; require an explicitly assigned project role; let OLDAP generate the identity; do not persist empty prose or infer anonymous publication.
- Implementation: Added `/p/[project]/admin/stories/new`, a localized responsive create form, model-derived author candidates, current-project role selection, verified `PUT /data/{project}/{class}` creation without an `iri` field, generated-URN routing, and clean blank-draft initialization in the chosen language. Added focused model/client tests and a full create/read-back/editor browser test; visually verified the form against live Chama data without submitting it.
- Open: Add focused Story metadata editing for title, summary, and author. Define editorial release and permission transitions before exposing publication, and dependency checks before deletion.
- Risks/Assumptions: Assigned project roles are returned by OLDAP as QNames using the project short name as prefix. The first create slice grants the selected role `DATA_PERMISSIONS`; users without an assigned current-project role cannot create, preventing accidental public or inaccessible records.

### Update 2026-08-27 19:20

- Decisions: Keep asset selection as a reusable, project-scoped editor component; offer only permission-filtered resources with a readable image representation; persist only the stable resource IRI; defer captions, multi-select, image groups, and layout controls.
- Implementation: Added recent-resource discovery and project search with authorized thumbnails, localized accessible dialog states, Escape/backdrop close behavior, cursor/selection-aware `:::asset` insertion with restored focus, immediate live preview, and automatic `schema:mentions` integration. Added insertion unit coverage and an end-to-end search/select/save test; visually verified recent assets and search against the live Chama project without changing persisted data.
- Open: Add minimal ontology-driven Story creation as the next vertical administration increment. Keep broader Story metadata, editorial release, deletion, and staging independent.
- Risks/Assumptions: The picker intentionally filters out readable resources without an image representation and currently inserts one uncaptained asset at a time. OLDAP remains authoritative for visibility and mutation permission; short-lived media capabilities never enter Markdown.

### Update 2026-08-27 18:28

- Decisions: Establish administration as an extensible project-scoped module area and make existing-Story editing the first complete function. Discover Story classes from the ontology contract rather than `chama:Story`; keep OLDAP permissions authoritative; defer creation, asset picking, publication, and deletion to separate testable increments.
- Implementation: Activated `/p/[project]/admin`, Story list and editor routes; added generic model-driven Story discovery, multilingual draft conversion, cross-language `schema:mentions` derivation, invalid-directive blocking, complete update plus read-back verification, live sanitized preview, unsaved-change protection, responsive module/list/editor UI, four-language messages, focused unit/client/browser coverage, and administration architecture documentation.
- Open: Perform one harmless live edit/reset/save check, then add the permission-aware OLDAP asset picker with cursor-position directive insertion. Define explicit editorial state and permission transitions before implementing release; define dependency checks before deletion.
- Risks/Assumptions: The first editor intentionally edits only existing `schema:text` variants. It has no concurrent-edit token, autosave, or revision history; last accepted OLDAP update remains authoritative. Module visibility does not grant write access, and a server rejection is surfaced to the user.

### Update 2026-08-27 16:17

- Decisions: Accept the additive Markdown Story model and instance migration as live only after API read-back verifies both language variants, all embedded-resource links, and non-destructive retention of the first StorySection experiment.
- Implementation: Recorded ontology backup `chama-model-backup-20260827-161732.trig.gz`; migration returned `updated_and_verified` for `chama:ChamaFromPlatToLivingRailway`, German and English `schema:text`, and the map, station photograph, and locomotive photograph in `schema:mentions`.
- Open: Visually inspect the live narrative and its three permission-aware inline assets; then begin the separate Markdown editor and OLDAP asset-picker increment.
- Risks/Assumptions: The restricted 1885 map remains governed by its existing Curator permission. Successful migration does not change reproduction rights or make the Story public.

### Update 2026-08-27 15:28

- Decisions: Replace new StorySection authoring with multilingual Markdown on the Story after live UX evaluation; keep the original sections non-destructively, use stable `:::asset` resource-IRI directives for placement, mirror embedded IRIs through `schema:mentions`, and defer the editor/picker to a separate increment. Do not use CKEditor or persist media delivery URLs/capabilities.
- Implementation: Added the sanitized Markdown parser and tests, a permission-aware inline-asset renderer supporting direct and sole archive-first representations, generic Story integration in resource detail, four-language states, additive Chama ontology changes, an exact migration payload and idempotent API migration script, updated architecture/data documentation, and focused client/browser coverage.
- Open: Load the revised Chama ontology, run `update_chama_story_markdown.py`, and visually inspect the three live embedded resources before implementing the Markdown editor and OLDAP asset picker.
- Risks/Assumptions: `schema:text` remains optional during migration. Missing or unreadable assets render a neutral state without existence probing. The renderer supports one asset per directive; grids, image series, raw HTML, and editorial workflow states remain deferred.

### Update 2026-08-27 14:58

- Decisions: Accept the Story batch as import-complete after its idempotent rerun; keep visual inverse-relation inspection as the final data/UI gate.
- Implementation: Recorded `metadata=existing_verified` and `media=not_declared` for the Story and all three sections. Confirmed SALSAH is served on port 5173; the separate test browser correctly requires its own login and was not given user credentials.
- Open: Inspect `chama:ChamaFromPlatToLivingRailway` in the user's authenticated SALSAH session, then implement the read-only Story renderer.
- Risks/Assumptions: The rerun report was written under the earlier `/tmp/chama-story-01-import.yaml` name; report naming does not affect verified state. Browser sessions are intentionally isolated.

### Update 2026-08-27 14:54

- Decisions: Accept the initial Story instance import as successful; require the usual second apply and inverse-reasoning inspection before treating the data slice as complete.
- Implementation: Recorded four successful creates with no media operations: `chama:ChamaFromPlatToLivingRailway` and its three ordered StorySections. Audit report: `/tmp/chama-story-01-import.yaml`.
- Open: Rerun for `existing_verified`, then inspect `schema:hasPart` on the Story and proceed to the read-only Story renderer.
- Risks/Assumptions: Creation success alone does not prove importer comparison idempotency or that inverse relations are exposed through the API response.

### Update 2026-08-27 14:51

- Decisions: Accept the four-resource Story batch as ready for create-only apply after the corrected canonical relationship removed the dependency cycle.
- Implementation: Recorded the successful live dry-run: Story plus three ordered sections all report `metadata=would_create` and `media=not_declared`; the audit report is `/tmp/chama-story-01-preflight.yaml`.
- Open: Apply the batch, rerun it for `existing_verified`, and inspect inverse section visibility before building the Story presentation.
- Risks/Assumptions: The preflight verifies current references, permissions, and SHACL constraints but does not replace the post-apply inverse-reasoning and UI checks.

### Update 2026-08-27 14:47

- Decisions: Store only `StorySection schema:isPartOf Story` as the canonical batch relationship and let OLDAP expose the inverse `Story schema:hasPart StorySection`. Permit an empty Story during incremental editorial construction.
- Implementation: Removed the circular forward references from the Story data and explicitly set the Story-side section `min_count` to `null` so OLDAP update semantics delete the already-live constraint; documented the canonical direction and acyclic import order.
- Open: Reload the small additive ontology adjustment, then repeat the four-resource dry-run.
- Risks/Assumptions: A Story without sections is temporarily valid. Presentation must handle that honest empty state; completed-publication requirements belong to a later editorial workflow, not base SHACL creation constraints.

### Update 2026-08-27 14:44

- Decisions: Accept the silent completion of `oldap-tools ontology load` as successful because the command emits only the backup path on success and reports failures explicitly with a non-zero exit.
- Implementation: Recorded the live additive Story ontology update and its pre-update backup `chama-model-backup-20260827-144345.trig.gz`.
- Open: Run the four-resource Story batch dry-run, then apply and rerun if preflight is clean.
- Risks/Assumptions: The user returned to the shell without an error after the backup message. The backup covers model and list graphs but not instance data, as intended for an ontology update.

### Update 2026-08-27 14:39

- Decisions: Accept the concise German and English Story prose as owner-approved; retain `draft` solely as an editorial/access state while the linked map remains restricted.
- Implementation: Synchronized the Story YAML comment, experiment status, stable context, and next gate with the completed content review.
- Open: Load the additive Story ontology and run dry-run/apply/rerun before implementing the read-only Story presentation.
- Risks/Assumptions: Content approval does not change reproduction rights or permissions. Story and sections remain Curator-only.

### Update 2026-08-27 14:35

- Decisions: Start narrative contextualization as a project-local, permission-aware experiment before Shared promotion. Replace Fasnacht's mandatory image, monolithic text, ambiguous date, and duplicate publication Boolean with optional generic lead media, ordered sections, explicit authored date semantics, and authoritative OLDAP permissions.
- Implementation: Added locally valid `chama:Story` and `chama:StorySection` classes based on `schema:CreativeWork`; documented the Fasnacht comparison and generic boundary; prepared a locally valid curator-only four-resource bilingual draft linking the 1885 plat, Chama station, and locomotive 488.
- Open: Owner review of the draft prose; load the additive ontology; dry-run/apply/rerun the Story batch; then add the read-only Story presentation. Design staging next and defer general editing until those concrete workflows expose its requirements.
- Risks/Assumptions: The Story remains private because one linked map is private. Sections belong to one Story and share one order across languages; rich text, per-language structures, and editorial workflow states are deliberately deferred.

### Update 2026-08-27 14:22

- Decisions: Accept the first cartographic import as technically complete only after a second apply verifies both RDF state and the already-attached IIIF medium. Retain the private Curator-only publication boundary.
- Implementation: Recorded the successful resumable apply and idempotent rerun: all five resources now report `existing_verified`, and `chama:DepotGroundsPipelineMap1885Digital` reports `media=existing_verified`. Synchronized stable ontology, data-experiment, and repository context documentation.
- Open: Inspect the map work and digital representation in live SALSAH, exercise high-resolution zoom, and confirm the archive breadcrumb. Begin the first Story slice only after that visual gate.
- Risks/Assumptions: Technical ingest success does not grant reproduction permission. The map and TIFF remain unavailable to `oldap:Unknown` regardless of the historical work's reported public-domain status.

### Update 2026-08-27 14:17

- Decisions: Do not rely on omitted permissions for restricted map material because the importing user's OLDAP defaults include `oldap:Unknown`. Require an explicit project-private `chama:Curator` role for both the 1885 map work and its TIFF representation.
- Implementation: Added `chama:Curator -> DATA_PERMISSIONS` to the two restricted resources and documented the prerequisite role assignment. Public catalogue-context Organizations and the structural Series remain unchanged.
- Open: Create and assign `chama:Curator` to `rosenth`, update the local oldap-tools installation if needed, then rerun the interrupted batch from actual state.
- Risks/Assumptions: The role name is intentionally project-scoped and generic enough for future restricted Chama catalogue work. It grants no project administration by itself; existing project-admin authority remains separate.

### Update 2026-08-27 14:09

- Decisions: Respect the effective max-one `schema:identifier` constraint for `chama:CartographicWork`; do not loosen inherited cardinality or introduce qualified identifier resources for one map.
- Implementation: Combined the holding reference and sheet number into the single traceable value `EDM Box 097 F; map 18-429` after live preflight correctly rejected two identifier values.
- Open: Rerun the private 1885 map batch preflight, then apply and verify it if clean.
- Risks/Assumptions: The combined display value is sufficient for the current demo. Separate typed identifiers should be reconsidered only when retrieval or interoperability requirements demonstrate a concrete need.

### Update 2026-08-27 12:12

- Decisions: Use the 1885 Chama depot-grounds and pipeline map as the first cartographic slice, but distinguish public-domain status of the historical work from permission to publish the holding institution's reproduction. Keep the work and TIFF non-anonymous until written permission and the preferred credit line are confirmed.
- Implementation: Added and locally validated the additive `chama:CartographicWork` ontology class with custody, repeatable source-reference, dating, description, identifier, contribution, and rights fields. Prepared a valid five-resource private batch containing two Organizations, a cartographic Series, the TIFF representation with `image-iiif` ingest, and the archive-first map Item with complete source and rights evidence.
- Open: Load the ontology in backed-up update mode; dry-run, apply, and idempotently rerun the private map batch; verify the IIIF view and archive breadcrumb. Add the first Story class only after this gate passes.
- Risks/Assumptions: No stable external media or IIIF endpoint was documented for the supplied TIFF, so this slice preserves the local file and records external evidence URLs rather than inventing a remote media reference. Publication remains blocked by the Colorado Railroad Museum's reproduction policy even though the 1885 work was identified as public domain in the forum.

### Update 2026-08-27 12:05

- Decisions: Show every readable archive placement on eligible resource details instead of declaring an implicit primary path. Derive the context from existing permission-aware search and summary contracts, and keep the main detail read independent from contextual loading.
- Implementation: Added generic root-to-resource archive-context resolution for ArchiveUnits and media-first resources, bounded multi-parent traversal, a localized and responsive breadcrumb panel with archive-tree navigation, and focused client plus browser coverage. Build, type checks, lint, 50 unit tests, and the four resource-detail E2E scenarios pass.
- Open: Review one media-first and one archive-first path against the live Chama data, then ingest one rights-reviewed historic map and add one small contextual story as separate visible increments.
- Risks/Assumptions: The client bounds ancestor traversal at 64 levels and archive-container discovery at 100 visible matches. Missing or unreadable ancestors are not exposed; cyclic or malformed paths terminate rather than blocking the resource detail.

### Update 2026-08-27 00:34

- Decisions: Treat a unit's `shared:hasMediaObject` links as expandable archive contents while keeping them visually and semantically distinct from structural `shared:ArchiveUnit` children; a disclosure control must never appear inert when readable media contents exist.
- Implementation: Included media IRIs in bounded level searches, resolved them through one permission-aware summary batch with authorized delivery, and rendered linked media rows with thumbnails, localized type labels, fallback icons, and canonical detail links. Expansion now combines direct ArchiveUnit children and readable media, while a truly empty checked unit becomes a leaf. Added media mapping coverage and extended the browser scenario through Chama 2023 to its photo and thumbnail.
- Open: Review the live Chama 2018 four-photo and Chama 2023 one-photo presentation; decide later whether archive-first Item representations should default to collapsed or remain explicitly expandable after more sample data.
- Risks/Assumptions: Media omitted by the summary endpoint is missing or unreadable and is not exposed. Associated media are listed after structural child units. Sibling queries remain capped at 100; summary batches already chunk at 100.

### Update 2026-08-27 00:19

- Decisions: Make the first archive view read-only and project-neutral; load roots and direct children incrementally through existing permission-aware structured search rather than introducing an archive-specific read endpoint or loading the complete tree.
- Implementation: Activated `/p/[project]/archive` and sidebar navigation; added a reusable localized archive tree with async expansion, sibling ordering, archive-level badges, canonical detail links, loading/empty/error states, and accessible tree semantics; added typed search mapping, path and client regressions, and a full mocked login/root/child/detail-link browser scenario. Recorded the live idempotent five-unit import and verified Lobato move.
- Open: Perform the live signed-in Chama visual short test. Defer editing, drag-and-drop, larger sibling pagination, and project-specific hierarchy profiles until the read-only interaction has been reviewed with more sample data.
- Risks/Assumptions: The first slice deliberately caps each sibling query at 100. Project subclasses are discovered through `shared:ArchiveUnit` reasoning; oldaplib 0.7.16 now also accepts those subclasses in integrity-sensitive moves. No new API contract or Chama-specific UI mapping was introduced.

### Update 2026-08-26 23:48

- Decisions: Represent the heterogeneous Chama demo root as `shared:ArchiveGroup`, not a provenance-based Fonds; group Lukas Rosenthaler's born-digital media by 2018/2023 Files and retain the existing Lobato photographic work as the sole archive-first Item.
- Implementation: Added and locally validated a five-resource create-only data YAML with explicit public permissions and media links; added the cycle-safe Lobato move payload, an idempotent password-prompting API script in `/private/tmp`, and synchronized experiment/stable documentation.
- Open: Run live dry-run/apply/rerun, execute the Lobato move script, and verify the resulting hierarchy before implementing the read-only SALSAH archive tree.
- Risks/Assumptions: `IMG_0171` is grouped under 2023 according to its imported `2023-08-25` Dating despite its filename sequence. The root is explicitly a curated demonstration aggregation and must not be presented as an organically accumulated fonds.

### Update 2026-08-26 01:01

- Decisions: Adopt the additive OLDAP summary contract for card and detail enrichment while retaining complete single-resource reads for the primary record and never probing omitted hidden/missing resources.
- Implementation: Added typed, automatically chunked summary requests; replaced per-hit and per-linked-resource metadata/media calls in workspace, search, and resource detail; retained sole-representation selection; updated mocks and focused unit/browser contracts.
- Open: Publish/install the paired oldaplib and oldap-api revisions, restart the API, and compare live Chama timings and IIIF rendering.
- Risks/Assumptions: The API batch limit is 100 and the client chunks larger sets. Archive-first cards may require one second bounded batch. Short-lived media capabilities remain memory-only.

### Update 2026-08-25 23:41

- Decisions: Keep `/data/text/{project}` as the permission-aware, ontology-neutral first search baseline and a future fallback. Do not hard-code Fasnacht Lucene fields; connector-aware SALSAH search requires a small OLDAP runtime search-profile contract.
- Implementation: Activated the header and sidebar search through the canonical `/p/[project]/search?q=...` route, added `Cmd/Ctrl+K`, localized full search states, deduplicated property-level OLDAP hits by IRI, and enriched unique results with live names, ontology class labels, detail links, and shared direct/archive-first media cards. Added focused unit and end-to-end coverage plus `docs/architecture/project-search.md`.
- Open: Exercise real Chama queries, then decide whether the next slice exposes Lucene profiles and installs a Chama connector or addresses an observed result-presentation issue. Facets, highlighting, pagination, and connector-driven ranking remain deferred.
- Risks/Assumptions: Broad literal search is intentionally bounded to 24 returned rows before client deduplication and does not provide Lucene ranking. The current OLDAP data-model response does not expose ontology YAML Lucene field configuration. Verification passes with 46 unit tests, 8 Playwright scenarios, Svelte diagnostics, targeted ESLint, production build, and visual review of the mocked search page.

### Update 2026-08-25 16:33

- Decisions: Make the normal project workspace truthful and production-data-only. Use the permission-aware `oldap:Thing` search for discovery, enrich at most eight results with ontology class labels and optional media previews, support both direct media and a sole archive-first representation, and never let preview failure hide an otherwise readable resource.
- Implementation: Replaced the compact live list with a responsive resource-card overview; added capability-authorized bounded IIIF preview URLs and external-thumbnail fallback; resolved direct and sole-linked representation media generically; localized the new states in four languages; removed all fictitious statistics, Burckhardt archive rows, activity, research note, demo tabs, and non-functional create/import actions from the project workspace; added archive-first unit coverage and a browser test for the authorized preview and absence of fixtures.
- Open: Implement the first small project-wide text search through the existing header field. Broader archive navigation, real activity, tabs, create/import UI, and advanced facets remain separate evidence-driven increments.
- Risks/Assumptions: Overview enrichment currently performs bounded parallel resource reads for up to eight hits; this is proportionate for the first slice but should be measured before increasing the limit. A resource with several representations intentionally receives no implicit preview until a generic primary-representation rule exists.

### Update 2026-08-24 23:20

- Decisions: Attach the owner KnowledgeContribution to the archive-first photographic work, not to its JPEG representation. Preserve requested joint display credit while retaining distinct photographer and digitizer roles in the model.
- Implementation: Added a reviewed public Lobato contribution payload separating verbatim original text and follow-up clarification from normalized description, uncertainty, and normalization notes. Prepared and syntax-checked an idempotent script that verifies every authored field, performs no explicit work update, and requires OLDAP reasoning to expose the inverse work-to-contribution relationship.
- Open: Run `/private/tmp/add_chama_lobato_contribution.py`, inspect its verification output, and verify both navigation directions in live SALSAH.
- Risks/Assumptions: Exact locomotive number, train, day, Kern camera model, and film format remain unknown. Historical and technical assertions remain contributor-supplied pending documentary verification; public-display permission is recorded, but its formal legal basis still needs documentation.

### Update 2026-08-24 23:17

- Decisions: Accept the archive-first media round trip as successful only when one authorized IIIF service renders through both the digital-representation route and the work route, without copying technical media metadata onto the work.
- Implementation: Recorded the successful attachment of `PICT0111.jpg` to `chama:PICT0111`, pyramidal `master.tif` generation, checksum preservation, media-capability verification, and IIIF Image API 3 level-2 response at 3900 × 2600 pixels. Verified visually and semantically in live SALSAH that OpenSeadragon renders the image both directly on `chama:PICT0111` and indirectly on `chama:LobatoTrestlePhotograph1981`; relationship navigation and work-level descriptive metadata remain intact.
- Open: Add the owner KnowledgeContribution to the work, then review the inherited “Record creator” label versus the intended photographer role.
- Risks/Assumptions: The single linked representation supplies display media unambiguously. Multiple representations still require an explicit primary-display rule; no technical delivery fields were duplicated onto the photographic work.

### Update 2026-08-24 23:14

- Decisions: For a non-media archive resource, automatically display its sole readable `shared:hasMediaObject` representation; do not choose implicitly when several representations exist. Treat `shared:ArchiveLevel` individuals as controlled metadata values rather than broken project-resource links.
- Implementation: Recorded the successful creation and exact 1981 Dating round trip for all five public `PICT0111` archive-first resources. Verified live navigation among work, representation, carrier, photographer, place, and K-36. Added generic linked-display-media selection and a work-level missing-media state, plus unit coverage; 42 unit tests, `svelte-check`, targeted ESLint, and both resource-detail browser tests pass. Prepared and syntax-checked the checksum-guarded, idempotent JPEG attachment script and its reviewed multipart evidence.
- Open: Run `/private/tmp/attach_chama_pict0111_media.py`, then verify the IIIF viewer on both `chama:PICT0111` and `chama:LobatoTrestlePhotograph1981`. Add the KnowledgeContribution separately.
- Risks/Assumptions: A project with multiple media representations still needs an explicit primary-display rule. `PhotographicWork` currently inherits the Shared label “Record creator” for `dcterms:creator`; a later ontology or presentation-label refinement should say “Photographer” without changing the stored relationship.

### Update 2026-08-24 23:05

- Decisions: Make the first archive-first increment the smallest complete identity structure: photographer, place, analogue carrier, digital representation, and photographic work/archive item. Keep the owner KnowledgeContribution and media binary attachment as separate gates.
- Implementation: Added five reviewed public create payloads for `PICT0111.jpg` and an idempotent password-prompting script that creates resources in dependency order, refuses unexpected existing content, verifies every supplied field and relationship, and confirms anonymous `DATA_VIEW`. Verified the script compiles using the project environment.
- Open: Run `/private/tmp/create_chama_pict0111_archive_first.py`, inspect the normalized 1981 Dating value, and navigate the archive-first relationship structure in live SALSAH.
- Risks/Assumptions: The exact capture day, locomotive number, Kern camera model, and film format remain unknown. The inherited Shared label for `dcterms:creator` is archival “record creator”; hands-on review may show that `PhotographicWork` needs a more precise photographer label without changing the underlying predicate.

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
