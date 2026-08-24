# SALSAH 2

SALSAH 2 is a project-neutral archive management application and Virtual Research Environment for the OLDAP backend. It is built with SvelteKit, TypeScript, Paraglide, and custom CSS without a component or CSS framework.

The current increment provides:

- OLDAP login, refresh-cookie session restoration, and global logout;
- runtime working-project selection based on the authenticated user's memberships;
- canonical project routes under `/p/[projectShortName]`;
- ontology-driven, read-only resource pages under
  `/p/[projectShortName]/resource/[resourceIri]`, including resolved resource links
  and permission-aware media delivery;
- a reusable, dynamically loaded OpenSeadragon viewer for local IIIF Image API
  resources, plus direct rendering for externally managed images;
- a live, permission-aware list of recently modified project resources on the
  project workspace, with direct links to their detail pages;
- a responsive archive workspace prototype with project switching.

The first complete live vertical slice is the Chama record
`/p/chama/resource/chama:IMG_1751`. Its HEIC original is attached to the existing
catalogue resource, delivered as pyramidal IIIF tiles, and displayed through the
generic viewer. Media records without a deliverable binary still show an explicit
placeholder.

`oldap:SystemProject` and `oldap:SharedProject` remain authorization contexts but are never exposed as working projects.

## Development

Install dependencies and copy the public runtime configuration:

```sh
npm install
cp .env.example .env.local
```

`PUBLIC_API_URL` must point to the browser-visible OLDAP API origin, for example `http://localhost:8000`. The API deployment must include the SALSAH frontend origin in `OLDAP_AUTH_ALLOWED_ORIGINS`; cookie-backed session refresh and logout require credential-enabled CORS.

Start the development server:

```sh
npm run dev
```

## Verification

Before committing, run:

```sh
npm run check
npm run lint
npm run test:unit -- --run
npm run build
```

End-to-end tests build and preview the application on port 4173:

```sh
npm run test:e2e
```

The Playwright command installs its required browser binaries when necessary.

## Project context

The durable product vision and engineering principles are defined in [`FOUNDATIONS.md`](./FOUNDATIONS.md). The first evidence-based modelling sketch is documented in [`docs/minimal-data-model-v0.1.md`](./docs/minimal-data-model-v0.1.md), with a concrete archive-first/media-first comparison in [`experiments/catalogue-patterns/`](./experiments/catalogue-patterns/README.md), the first locally validated Chama ontology draft in [`experiments/chama-ontology/`](./experiments/chama-ontology/README.md), and the accepted placement strategy for generic archive semantics in [`docs/architecture/generic-archive-foundation.md`](./docs/architecture/generic-archive-foundation.md). Architecture, repository state, and the incremental roadmap are documented in [`codex.md`](./codex.md). Technical changes are recorded newest-first in [`CODEX_LOG.md`](./CODEX_LOG.md).
