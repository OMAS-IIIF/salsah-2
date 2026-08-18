# SALSAH 2

SALSAH 2 is a project-neutral archive management application and Virtual Research Environment for the OLDAP backend. It is built with SvelteKit, TypeScript, Paraglide, and custom CSS without a component or CSS framework.

The current increment provides:

- OLDAP login, refresh-cookie session restoration, and global logout;
- runtime working-project selection based on the authenticated user's memberships;
- canonical project routes under `/p/[projectShortName]`;
- a responsive archive workspace prototype with project switching.

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

Architecture, repository state, and the incremental roadmap are documented in [`codex.md`](./codex.md). Technical changes are recorded newest-first in [`CODEX_LOG.md`](./CODEX_LOG.md).
