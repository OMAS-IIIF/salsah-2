# AS-07 — Generic SALSAH-2 archive workflows

Status: source implementation complete, 2026-09-08. This increment does not
activate an archive policy, migrate application data or deploy either client.

## Delivered behavior

- `/p/[project]/admin/archive` is a dedicated structure administration module.
  Authoritative capabilities gate management and creation separately. The public
  archive remains a read-only tree. Existing units can be renamed, reclassified,
  moved through the cycle-safe endpoint and deleted through the guarded empty check.
- Adoption offers private source folders labelled by area and hierarchy, editable
  multilingual names, the seven Shared levels, grouping/parent corrections, existing
  targets and set/clear/skip mappings. Unavailable mappings remain protected.
  A preflight digest and explicit confirmation precede apply. Editing invalidates
  the previous review; uncertain apply retains its exact payload and UUID across
  reloads in the same tab, scoped to user and project.
- Enabled repositories use the signed, fully paginated mixed folder inventory.
  Summary batches resolve authorized media delivery. Media rows are keyed by both
  folder and identity, so one original can appear in several private folders.
  References cannot enter catalogue batches or invoke staging/binary deletion.
- Private reference relocation uses both folder revisions and a stable command UUID.
  An uncertain result can be replayed after reload; a definite stale/conflict result
  requires a refreshed selection. Target browsing is constrained to the private area.
  Folder name/parent changes preserve identity and use the existing generic guarded
  CRUD contract. System folder, cross-area and cycle checks remain server-authoritative.
- Single and batch catalogue forms initialize an explicit archive picker from the
  direct source-folder default. A mixed-folder selection has no common default;
  there is no ancestor inheritance or last-used cross-folder assignment. Manual
  choices survive editing and appear in the batch preview. Unavailable defaults
  block submission until the view is reloaded and access is resolved.
- The existing transform receives optional `linkFrom: shared:hasMediaObject`, so
  placement and catalogue transition remain one atomic operation. Read-back checks
  the class, submitted metadata, removed media-side Staging fields, asset ID and
  checksum. The folder-side reference is loaded again through mixed inventory.
  The ordinary admin resource editor fails closed when `permval` lacks UPDATE;
  the backend additionally enforces the archive-editor role/policy.
- Folder ZIP controls provide estimate, creation, explicit status refresh and an
  authorized download link using the unchanged AS-05/v1 API. A known job ID is
  retained per folder/user in session storage and re-read when reopened. Download
  credentials remain ephemeral. No new upload, transform or export wire format exists.

## Implementation boundaries

- `src/lib/archive/client.ts`: shared domain contracts, capabilities, JSON error
  codes and deterministic-rejection classification.
- `src/lib/archive/iri.ts`: conversion of legacy search QNames using the actual
  namespace returned in project metadata. Missing namespaces fail explicitly;
  domain commands never infer namespace URLs from project names.
- `src/lib/staging/repository.ts`: mixed inventory validation/pagination, reference
  commands, direct-folder defaults and protected preparation predicates.
- `ArchiveStructureAdministration.svelte`: review and guarded unit administration.
- `ArchiveUnitPicker.svelte`, `StagingFolderPicker.svelte`, `CataloguePlacement.svelte`:
  incremental, permission-filtered choices. Hierarchy reads page wide sibling levels
  rather than silently hiding choices beyond 100 entries; repeated pages fail closed.
- `ReferenceMove.svelte`, `PrivateFolderActions.svelte`, `FolderExport.svelte`:
  private actions with distinct lifecycle/authorization contracts.

No runtime dependency was added. The core has no Fasnacht imports, classes,
publication states, rights vocabularies or role-name assumptions. The museum
browser fixture exercises `museum:Photograph`; the pre-existing Chama regression
continues to exercise the legacy, explicitly disabled policy workflow.

## Verification and limits

- Unit tests: **103 passed** across 22 files (baseline: 89 tests).
- `npm run check`: **0 errors, 0 warnings** (baseline preserved).
- `npm run lint`: full-repository Prettier and ESLint pass.
- Production build and **17 browser tests** pass, including the existing 13 tests.
- New browser cases cover exact apply retry after reload, review invalidation,
  existing-unit name/level editing, private folder rename/move, direct defaults,
  atomic catalogue placement, retained references, duplicate placements, exact
  reference-move retry after reload, mixed ZIP controls, denied structure access,
  read-only ordinary editor and public/private separation. Desktop and 390-pixel
  mobile screenshots were inspected; the mobile page has no horizontal overflow.

Browser requests are intercepted fixtures, not live OLDAP authorization or ZIP
binary acceptance. Real concurrency, originals and export manifest behavior are
covered by AS-02–AS-05 backend evidence; production ACL/native-client acceptance
and migration remain **AS-08**, rollout remains **AS-09**. Existing application
RDF, ontologies, backend policy configuration and CaptureApp source were untouched.
Existing uncommitted work was preserved.

Run from the SALSAH-2 root:

```sh
npm run check
npm run lint
npm run test:unit -- --run
npx playwright test
```

Playwright builds a disposable preview server with fixture API origins; its normal
configuration owns and stops that server. Screenshot evidence and verification
summary are also retained in the FasnachtsPage `docs/as-07` evidence package.
