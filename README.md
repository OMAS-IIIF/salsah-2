# SALSAH 2

SALSAH 2 is a project-neutral archive management application and Virtual Research Environment for the OLDAP backend. It is built with SvelteKit, TypeScript, Paraglide, and custom CSS without a component or CSS framework.

The current increment provides:

- OLDAP login, refresh-cookie session restoration, and global logout;
- project-scoped archive structure management and graphical folder-default mapping;
- private staging folders, media/ZIP uploads, protected archive references and batch cataloguing;
- model-derived resource and Markdown Story editing, publication controls and operator-only writer recovery;
- runtime working-project selection based on the authenticated user's memberships;
- canonical project routes under `/p/[projectShortName]`;
- ontology-driven, read-only resource pages under
  `/p/[projectShortName]/resource/[resourceIri]`, including resolved resource links
  and permission-aware media delivery;
- a reusable, dynamically loaded OpenSeadragon viewer for local IIIF Image API
  resources, plus direct rendering for externally managed images;
- a live, permission-aware card overview of recently modified project resources,
  including ontology labels, direct-media previews, archive-first representation
  previews, neutral non-media states, and detail links;
- project-wide text search through the existing header field and the canonical
  `/p/[projectShortName]/search?q=...` route, with unique ontology-labelled
  results, media previews, keyboard focus through `Cmd/Ctrl+K`, and localized
  loading, error, empty, and result states;
- a responsive project workspace with project switching and no fictitious
  archive statistics or activity data.

The first complete live vertical slice is the Chama record
`/p/chama/resource/chama:IMG_1751`. Its HEIC original is attached to the existing
catalogue resource, delivered as pyramidal IIIF tiles, and displayed through the
generic viewer. Media records without a deliverable binary still show an explicit
placeholder.

`oldap:SystemProject` and `oldap:SharedProject` remain authorization contexts but are never exposed as working projects.

## Development

Install dependencies and copy the public runtime configuration:

```sh
npm ci
cp .env.example .env.local
```

`PUBLIC_API_URL` must point to the browser-visible OLDAP API origin, for example `http://localhost:8000`. `PUBLIC_MEDIA_URL` must point to the browser-visible media-server/Caddy origin, normally `http://localhost:8088`. The API and media deployments must allow the SALSAH frontend origin; cookie-backed API session refresh and bearer-authenticated media uploads require the corresponding CORS configuration.

Start the development server:

```sh
npm run dev
```

## Repository boundaries

The application needs no sample archive dataset. `experiments/` is an ignored, local-only directory for optional modelling and
data experiments. It is not included in new clones; older versions remain in Git
history. Synthetic unit and browser fixtures remain with the source
so the application can be tested without a live archive.

Keep credentials and local endpoints in ignored environment files. Only
`.env.example`, containing public placeholder origins, belongs in Git. Every
`PUBLIC_*` value is browser-visible and must never contain a secret.

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

The durable product vision and engineering principles are defined in [`FOUNDATIONS.md`](./FOUNDATIONS.md). The first evidence-based modelling sketch is documented in [`docs/minimal-data-model-v0.1.md`](./docs/minimal-data-model-v0.1.md), with the accepted placement strategy for generic archive semantics in [`docs/architecture/generic-archive-foundation.md`](./docs/architecture/generic-archive-foundation.md). The first Markdown narrative model, inline-asset contract, and Fasnacht comparison are documented in [`docs/architecture/story-foundation.md`](./docs/architecture/story-foundation.md); the project-scoped administration shell and first Story editing slice are documented in [`docs/architecture/administration-foundation.md`](./docs/architecture/administration-foundation.md). The search baseline and its future ontology-defined Lucene integration are documented in [`docs/architecture/project-search.md`](./docs/architecture/project-search.md). Architecture, repository state, and the incremental roadmap are documented in [`codex.md`](./codex.md). Technical changes are recorded newest-first in [`CODEX_LOG.md`](./CODEX_LOG.md).
