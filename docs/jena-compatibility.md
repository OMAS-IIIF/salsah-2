# Jena compatibility review

## Current review — 2026-11-10

The primary development checkout is now `OLDAP/salsah-2` on `main`.
The previous migration history was fast-forwarded from origin before this review.
SALSAH remains an API-only client; no direct RDF/SPARQL transport is needed.

One compatibility correction was necessary: the API exposes SHACL reverse fields
as `inversePath`, in addition to legacy `inverseOf`. Both the resource editor and
staging catalogue now exclude either kind from writable relation inputs. Reverse
values remain available for display; changes belong to the forward relation on
the related object. Regression fixtures include both metadata forms and verify
that ordinary forward relations remain editable. Public API signatures are unchanged.

Validation:

- 115 unit/component tests and 20 mocked browser workflows pass.
- Production build passes; Svelte/TypeScript reports zero errors and warnings.
- Read-only requests against the local native Jena API 1.0.1 pass for Chama and
  Fasnacht: models, recent search, archive roots, fulltext, details, summaries,
  media delivery, staging and archive capabilities.
- Each project returns eight recent resources/eight summaries, five media delivery
  contracts, one archive root and 24 text hits. Staging counts are one/two.
  All four sampled Chama contribution targets expose the reverse navigation field.
- The local dataset is a separate restored home snapshot, not current production.
  These checks do not establish live write, upload or browser CORS acceptance.

No image was built/published and no deployment changed during this review.
The source version remains 0.0.2; package/image release is a separate step.
The older evidence below is historical; `jena-api-results.json` belongs to that
review. Home installation was subsequently completed on November 4 (see codex.md).

## Historical review — 2026-11-04

The `migration/jena` checkout is cloned separately under OLDAP-Jena. SALSAH
remains a project-neutral TypeScript/Svelte API client. No SPARQL, GraphDB
transport or RDF-star serialization exists in the application runtime. No
application behavior or public function signature needed changing for Jena.

## Evidence

- Production build succeeds; Svelte/TypeScript: zero errors and warnings.
- 115 unit/component tests and 20 browser tests pass. Browser tests use mocked
  OLDAP responses; they do not establish live browser/CORS acceptance.
- Read-only home API checks pass for Chama and Fasnacht: project/shared models,
  recent resources, archive roots, fulltext, details, resource summaries with
  media delivery, staging areas and archive capabilities.
- Each project returns eight recent resources and eight summaries, including
  five media delivery contracts; archive roots: one each; staging: one Chama,
  two Fasnacht. Media contracts were inspected; no new binary transfer or write
  acceptance was performed during this review.
- Four Chama contributions store only `chama:describes`; the API still returns
  `chama:hasKnowledgeContribution` on their targets. The existing RDF 1.2 read
  builder resolves declared inverse properties explicitly. This is not a general
  OWL reasoner, and existing OWL axioms alone do not imply automatic inference.
  Keep the UI's existing read-only inverse-field handling.

See `jena-api-results.json`. The reusable `tools/check_jena_api.py` runs inside
an existing API container and reads its configured bootstrap credentials without
logging them. It issues only queries; it does not modify resources or roles.

## Deployment adjustments

In the sibling Jena setup checkout, the SALSAH installer now accepts the known
Jena/policy Compose topology while preserving its entire selection. Applying the
SALSAH overlay retains the API's Jena network namespace, backend and archive
policy. The alternate production API domain `api.salsah.org` now blocks
`/internal/jena` and its descendants, just like `api.oldap.org`. Thirteen setup
checks and the Ansible syntax check pass. These changes are prepared, not deployed.

Home currently has no SALSAH container, SALSAH frontend registry entry or SALSAH
browser origin in the API allowlist. Installing SALSAH still requires the chosen
hostname, DNS/TLS, trusted mail registry and API/media CORS configuration. Use the
explicit installer; changing PUBLIC_API_URL alone is insufficient for browser
login/refresh. This review does not activate a site or restart services.

## Development boundary

`PUBLIC_API_URL` and `PUBLIC_MEDIA_URL` remain the only browser service endpoints;
no Jena-specific setting or service key belongs in the frontend. On a fresh clone,
run the build or development server once to generate Paraglide modules before
standalone type checking.

The inherited Python/Poetry project is optional legacy ontology-experiment
tooling, not a dependency of npm builds or the Node image. Its oldap-tools 0.x
pin was not upgraded as part of the frontend review. For Jena ontology operations,
use the independently verified sibling OLDAP/oldap-tools environment; do not
use the legacy Poetry environment to write to the Jena dataset. Local ignored
`experiments/` were deliberately not copied into the migration clone.
