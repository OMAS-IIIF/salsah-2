# WR-03 — Deployment-wide writer recovery in archive administration

`src/lib/components/admin/WriterRecoveryPanel.svelte` is composed separately from
archive editing capability in `/p/[project]/admin/archive`. Normal project workspace
access is still needed to enter that route; backend recovery authorization itself
is deployment-wide and uses an independently configured ordinary operational role.
The panel calls the same additive `/admin/writer-recovery` endpoints as FasnachtsPage
through `src/lib/operations/writer-recovery.ts` and the existing authenticated API
client. It never invokes a shell/runtime controller or submits evidence flags.

The German operator flow explains global maintenance scope, requires a reason and
confirmation, persists an exact UUID/body before begin, supports explicit retries
and UUID lookup, and polls reads only. Storage is scoped to API origin/user and
survives reload. A local saved attempt can be removed without touching a server
barrier. Operator proof and controller state gate the separate release confirmation;
unknown release responses are resolved by reading the same operation. Revocation
hides the panel and is freshly enforced by the backend. Ordinary blocked archive
errors point to operator diagnosis. No roles, environment flags or data were changed.

Six focused recovery/archive client tests, targeted ESLint, build and a clean
svelte-check pass. The isolated browser sequence verifies exact retries, reload,
controller blocking, proof-ready release, lost response read-back, revocation and
disabled visibility. Shared evidence/screenshots and full HTTP documentation live
in `FasnachtsPage/docs/wr-03`. WR-04 still needs real target faults and native MacBook
runtime control before activation. CaptureApp source/contracts remain unchanged.

## WR-04 local activation

The shared MacBook API is now launchd-supervised and recovery is enabled for the
explicitly authorized rosenth operator. Real API/Redis ACL and both live browser
checks pass; the local CORS allowlist includes SALSAH on localhost:5175. Source
changes require a controlled API restart because the development reloader is
disabled. Capture contracts are unchanged. See FasnachtsPage `docs/wr-04/README.md`
for native control, backups/restore, acceptance evidence and production limits.
