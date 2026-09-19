# Administration Foundation

## Purpose

SALSAH administration is a project-scoped module area, not a single growing
page and not a replacement for all OLDAP administration tools. It provides
content and workflow functions that benefit from SALSAH's archive, discovery,
media, and narrative context. Infrastructure-oriented project, ontology, list,
role, and user setup may remain in `oldap-app` and `oldap-tools` until a concrete
SALSAH workflow justifies moving it.

The first module manages Stories. It establishes navigation, discovery,
multilingual editing, validation, preview, mutation, and read-back boundaries
that later administration modules can reuse without imposing one universal
editor architecture.

## Route Structure

- `/p/[project]/admin` is the stable module overview.
- `/p/[project]/admin/stories` lists readable Story resources.
- `/p/[project]/admin/stories/new` creates one minimal private Story.
- `/p/[project]/admin/stories/[...iri]` edits one existing Story.
- `/p/[project]/admin/staging` manages private StagingAreas, folders and protected archive references.
- `/p/[project]/admin/archive` provides capability-gated reviewed adoption and structure management.
- `/p/[project]/admin/resources` lists and searches supported catalogued resources.
- `/p/[project]/admin/resources/[...iri]` edits one existing ordinary resource.

The module overview distinguishes working modules from planned areas. Planned
cards are intentionally not links and expose no non-functional actions.

## Generic Resource Editing

The first ordinary-resource editor is intentionally separate from Staging and
from the richer Story authoring workflow. Its recent list and project-wide text
search use the existing permission-aware resource-card boundary, including an
authorized preview when available. Shared StagingAreas, StagingFolders, and
StagingMediaObjects are excluded because they retain their own lifecycle.
The editor repeats that preview beside the resource heading for visual recall;
activating it opens the same temporary enlarged-image dialog used by batch
cataloguing. Both views share one `CompactMediaPreview` component and keep
delivery capabilities outside editor state and persisted metadata.

For a selected resource, SALSAH merges the project and Shared models and derives
only a conservative editing surface from the asserted class:

- `schema:name` and `schema:description` are editable when the model declares a
  supported single textual value shape;
- existing language variants are loaded into one draft and preserved together;
- optional, forward object properties with a concrete `toClass` are offered as
  relation selectors;
- relation candidates follow that `toClass` exactly; SALSAH does not silently
  narrow an ontology-declared Agent relation to Person or another subclass;
- `oldap:Dating`, root-wide `oldap:Thing`, ArchiveLevel, and inverse properties
  are excluded because they need distinct interaction semantics;
- currently linked but no longer independently readable targets remain present
  by IRI, so opening the editor cannot silently remove them;
- media facts, permissions, rights, archive placement, technical metadata, and
  every other uncontrolled property are absent from the update payload.

Saving sends one partial `POST /data/{project}/{iri}` and then reads the normal
resource endpoint. Every controlled field must match exactly before SALSAH
reports success. OLDAP remains authoritative for write permission and ontology
validation. This establishes a reusable editing foundation without pretending
that dates, rights, archive moves, or arbitrary datatype widgets are already
solved.

## Story-Class Discovery

The generic application does not embed `chama:Story`. A project resource class
qualifies for the first Story module when its resolved OLDAP model defines:

- multilingual narrative content through `schema:text`; and
- authorship through `schema:author`.

This admits the Chama Story while excluding the retained StorySection
experiment, which has text but no Story-level author. If several project
classes satisfy the contract, the module searches all of them and deduplicates
resource IRIs.

## Story Editing

The editor maintains one coherent language draft across Story metadata and
narrative content:

- every existing language variant remains in one editor state;
- title and optional summary are edited for the selected language;
- the author selector is populated from the live class targeted by
  `schema:author`, not from an embedded Person or Agent assumption;
- the selected language has a Markdown source editor and live sanitized
  preview;
- switching languages does not discard edits in other variants;
- malformed `:::asset` directives block saving;
- the union of valid asset IRIs across all translations replaces
  `schema:mentions` in the same OLDAP update;
- title, summary, author, narrative, and the derived mention index are sent in
  one focused OLDAP update without replacing permissions or unrelated fields;
- all five controlled fields must match a normal read-back before the UI
  reports the update as saved;
- unsaved changes protect browser exit and the editor's own navigation links.

The API remains authoritative for instance update permission. SALSAH does not
infer write access from descriptive metadata or make a client-side permission
decision that could weaken OLDAP authorization.

## Asset Picker

The Story editor contains a reusable, project-scoped asset picker. It loads a
bounded list of recently modified resources and can search the current project
through OLDAP's permission-aware resource APIs. Candidates are enriched with
the same authorized summary and media-delivery contract used elsewhere in
SALSAH; resources without a readable image representation are omitted.

Selecting one candidate inserts a single `:::asset{iri="…"}` block at the
textarea selection or cursor position and restores keyboard focus immediately
after the complete block separation. The inserted source contains only the
stable resource IRI. It deliberately contains no IIIF URL, media capability,
cached title, caption prompt, or layout instruction. The live preview resolves
the current title and image from OLDAP, and the existing save path derives the
updated `schema:mentions` union.

## Minimal Story Creation

Creation uses the same model-derived Story-class contract as listing and
editing. The form requires a language-tagged title, an explicit readable
resource satisfying the class's `schema:author` target, and one role of the
current project that is actually assigned to the authenticated user. The
author is never inferred from the OLDAP user IRI; an account and a catalogued
person or agent remain distinct identities. SALSAH does not hard-code either
class: the project ontology determines the selectable author type through
`schema:author to_class`. Chama deliberately targets `chama:Person`, so its
creation form excludes organizations while the generic component can still
support a broader Agent class in another project.

The create payload deliberately omits `iri`, allowing OLDAP to generate its
normal unique URN. It also omits empty narrative text and grants only the
selected project role `DATA_PERMISSIONS`; no anonymous access or publication
state is inferred. SALSAH reads the generated resource back and verifies its
class, title, author, and role permission before navigating to the existing
editor. The chosen language initializes a clean blank draft there and is first
persisted as `schema:text` when the author saves actual prose.

Assigned project roles currently use OLDAP's QName convention and are scoped
by the active project short name. This avoids a second broad role query and,
more importantly, prevents selecting a role that is not assigned to the user.

## Staging Baseline, Single-image Ingest, and ZIP Acceptance

The second administration module exposes the existing Shared staging model
without adding a project-specific contract. It searches readable
`shared:StagingArea` resources in the current project and displays their quota,
default role, and media-path metadata when present. Selecting an area loads only
its root `shared:StagingFolder` resources. Expanding a folder lazily queries
both its direct child folders and its direct `shared:StagingMediaObject`
resources. Every query includes the selected area and, for media, the selected
folder as explicit boundaries. Generic media rows expose the original filename,
MIME type, staging status, and normal resource-detail link without assuming
that every staged object is an image. Readable image objects are enriched in
one resource-summary batch and request a bounded 160-pixel authorized IIIF
thumbnail only when their folder is expanded. Browser-native lazy loading and
asynchronous decoding keep the tree lightweight; a failed or absent image
delivery falls back to the same neutral file-type symbol. Non-image objects do
not cause media-summary or image-delivery requests.

OLDAP remains authoritative for visibility. The client neither probes hidden
resources nor reconstructs an inaccessible parent hierarchy. Area, folder, and
media records link to the generic resource detail for transparent inspection.
Short-lived delivery capabilities are used only for the rendered request and
are never persisted in staging metadata.

The first mutation is deliberately narrow: one JPEG, PNG, HEIC, or HEIF image
can be uploaded into one explicitly selected existing folder. SALSAH sends only
the project, selected area/folder, generated opaque asset identifier, and file
to the media server. The browser never supplies a storage path, role permission,
or Staging status. The media server asks oldap-api to reauthorize the exact
target and derive those facts from OLDAP, then reuses the normal quarantine,
fixity, pyramidal-TIFF, IIIF, registration, and rollback pipeline. The created
resource is always a `shared:StagingMediaObject` linked to the authorized area
and folder with `shared:StagingStatusNew`.

The UI displays transfer progress and supports cancellation. After media-server
success it reloads the selected folder and requires both the new OLDAP resource
and authorized media delivery before reporting success. If read-back fails, the
message explicitly states that transfer may already have completed; SALSAH does
not invite an unsafe blind retry. Selecting a media row opens an administrative
review dialog with a bounded authorized preview, original filename, MIME type,
Staging status, asset ID, SHA-256 fixity, protocol, derivative, and a link to the
complete generic record.

The review dialog also owns the explicit discard operation. After browser
confirmation SALSAH sends the asset ID plus the expected OLDAP resource IRI and
the strict Staging-only flag to the media owner. The media server rechecks exact
identity, Staging relations, and current delete permission before atomically
withdrawing the asset directory. It deletes RDF only while the files are hidden;
an OLDAP rejection restores them, and only successful RDF deletion permits final
file cleanup. This avoids both a visible resource with missing media and a normal
failed delete leaving an untracked public asset. Direct searches remain bounded
to 100 visible resources.

The first catalogue transition is similarly narrow and reuses OLDAP's existing
atomic `POST /data/{project}/{iri}/transform` contract. SALSAH loads the current
project and Shared data models, offers only project classes that transitively
extend `shared:MediaObject`, and excludes a class when the minimal form cannot
satisfy all of its additional required properties. The first form supports the
model-defined, single-valued `schema:name` and `schema:description` fields with
an explicit metadata language. For Chama this makes
`chama:CataloguedPhotograph` available without embedding that QName in UI code.

The transform guards the expected `shared:StagingMediaObject` source class,
preserves the `shared:MediaObject` base, and asserts the selected target class in
one OLDAP transaction. Consequently the IRI, role attachments, original-media
facts, asset ID, checksum, derivative, and IIIF delivery survive while
`shared:inStagingArea`, `shared:inStagingFolder`, and `shared:stagingStatus` are
removed. SALSAH does not report success until read-back confirms the target
class, entered metadata, missing media-side Staging placement, and unchanged asset ID/checksum.
When archive policy is enabled, the same identity reappears as a protected folder-side
reference. Only the explicitly disabled legacy workflow removes the row from the tree. No media-server call or file move is
needed for this semantic lifecycle transition.

Loaded Staging media rows can also be selected across expanded folders. The
selection bar opens the existing review dialog as a stable queue and exposes
previous/next navigation, while direct row review remains a one-object action.
Cataloguing or discarding an object removes it from both the tree and the queue
and continues with the next still-readable selection item.

The same selection can enter a controlled minimal batch catalogue form. It
derives the common target class and available fields from the same live models,
applies one explicit metadata language and optional common description, and
requires a separately editable title for every item. Filename-based titles are
suggestions only and are never persisted before the complete preview receives
an explicit confirmation. Each title row includes a bounded authorized
thumbnail; activating it opens a temporary larger delivery preview in a second
modal dialog without copying a delivery capability into the metadata draft.
OLDAP currently guarantees atomicity per resource,
not across resources, so SALSAH transforms sequentially, exact-read-backs every
success, stops on the first failure, and reports catalogued, failed, and
not-started identities without implying rollback. Richer shared relations,
per-item overrides beyond title, and a server-side atomic batch contract remain
future increments driven by real workflow needs.

The first richer common-metadata increment also derives optional object
relations from the selected target class. It offers only forward relations with
a concrete `toClass`, excluding OLDAP embedded value classes such as
`oldap:Dating`, the unbounded `oldap:Thing` root, and inverse properties. The
client loads up to 100 permission-filtered candidates of each target class and
persists at most one reviewed common candidate per relation in this increment.
Thus Chama exposes creator and capture place without either QName appearing in
the component, while dating, broad subject/depiction search, inverse contribution
management, multiple relation values, and candidate pagination retain honest
separate interaction requirements. The chosen labels and IRIs are shown in the
same preflight and exact per-resource read-back as scalar metadata.

The first ZIP increment reuses OLDAP's existing project-neutral import-job
workflow. A ZIP is always directed at one explicitly selected existing area and
folder. SALSAH creates the job through `POST /imports`, sends the file directly
to media quarantine with the returned short-lived, purpose-specific capability,
and polls the caller-owned authoritative job until validation reaches a terminal
state or `READY`. The browser validates only the closed envelope (normalized
`.zip` filename, non-empty content, and the 500 MB transport limit); ZIP paths,
collisions, quotas, target authorization, fixity, and archive safety remain
server responsibilities. The client verifies both the import-job identity and
the upload-request identity returned by the media server. It never routes the
upload capability through the normal OLDAP token-refresh boundary.

When a report becomes available, SALSAH loads it only through the owner-checked
API proxy and validates its identity, target, lifecycle evidence, expiry,
checksums, summary, issues, and entries before rendering it. The UI exposes the
validated folder/file inventory, dispositions, MIME observations, warnings,
errors, and retained technical evidence. Import remains impossible until the
user opens a second confirmation panel. The final request carries exactly the
reviewed `stateVersion`; OLDAP repeats authorization, target, quota, collision,
and expiry checks before accepting it. SALSAH then polls through `IMPORTING` to
`IMPORTED` and reloads only the selected target folder. Folder creation/movement
outside a confirmed ZIP, richer catalogue fields and aggregate quota accounting
for standalone uploads remain independent increments. AS-07 adds guarded private
folder rename/relocation and paginated hierarchy/inventory reads.

ZIP jobs are durable OLDAP resources rather than browser-session state. On each
working-area visit SALSAH requests the authenticated caller's newest jobs through
the existing paginated `GET /imports` contract, filters the bounded first page to
the active project, and displays up to eight recent jobs. Reopening a row fetches
the authoritative job again by import ID and, when available, reloads the
owner-protected immutable report. Thus a `VALIDATING`, `READY`, `IMPORTING`, or
completed job survives navigation, a page reload, and another browser session;
the original ZIP need not be selected or uploaded again. The history also keeps
terminal failures visible for diagnosis. OLDAP's caller scoping remains the
security boundary, and SALSAH neither stores capabilities nor invents access to
another user's jobs.

## Deliberate Boundaries

The administration foundation does not yet provide:

- adding or deleting language variants;
- lead-medium or subject editing;
- editorial draft/review/published state;
- permission or public-release changes;
- deletion of catalogued resources and their dependency policy;
- autosave, revision history, or conflict resolution.
- ordinary staged-media movement outside confirmed ZIP imports, standalone folder creation or richer catalogue forms.

These are separate vertical increments. In particular, “publish” must be
designed as an editorial workflow coordinated with OLDAP instance permissions;
it must not become a Boolean that contradicts actual access control.

## Next Increment

Resume the already validated small Chama ZIP from “Recent ZIP imports”, confirm
its reviewed state version, and verify the final committed folder/media tree plus
IIIF derivatives in the selected working-area folder. Keep the later generic resource editor
grounded in the input behaviour proven by Story and Staging metadata rather than
attempting a universal form generator upfront.
Editorial release, permission transitions, richer catalogue relations, lead
media, subjects, and dependency-aware deletion remain independent workflows.

## AS-07 permanent repository and structure administration

See [AS-07 implementation and verification](../as-07/README.md). Structure writes
are confined to administration and are authorized by server capabilities plus
current resource rights. Generic resource editing requires reported UPDATE;
archive-editor policy remains authoritative on the backend. There is no browser
role-name shortcut. Public archive browsing contains no private-folder controls.

Reviewed structure apply and private reference movement keep their exact command
payloads and operation IDs in user/project-scoped session storage before sending.
Uncertain results may only repeat that command. Confirmed conflicts invalidate the
review or require a fresh folder selection. Corrupt recovery state blocks new
commands instead of silently discarding an unresolved operation.

Catalogue defaults are explicit direct-folder suggestions. They do not inherit
through ancestors, change existing media retrospectively or leak across mixed-folder
batches. Placement is part of the unchanged atomic transform contract. No media
bytes are moved when private or archive hierarchy changes.
