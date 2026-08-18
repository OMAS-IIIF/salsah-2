# SALSAH 2 Project Context

## Purpose

SALSAH 2 is a project-neutral, configurable archive management application and Virtual Research Environment for the OLDAP backend. It is intended to support multiple organizations and research contexts without embedding Fasnacht-specific concepts in the application core.

The application will reuse proven interaction patterns and selected implementation ideas from FasnachtsPage while keeping tenant configuration, OLDAP ontology semantics, and generic user-interface behavior clearly separated.

## Current Repository State

- The repository contains a minimal SvelteKit application written in TypeScript.
- Svelte 5, SvelteKit, the Node adapter, Vite, Vitest, Playwright, ESLint, and Prettier are configured.
- Paraglide is configured for German, French, Italian, and English.
- A responsive application shell now provides the global header, runtime project context, primary navigation, resource tabs, overview workspace, archive preview, and contextual activity panel.
- Illustrative workspace records live in an explicit demo fixture, and the shell already supports local navigation and tab state.
- Generated demo routes and test examples are still present outside the new root workspace.
- Browser authentication now uses the OLDAP cookie-backed login, refresh, profile-loading, and global-logout contract. The authenticated user's working projects are loaded from OLDAP memberships and project metadata; no general authenticated API client or production resource data flow has been implemented yet.
- The initial horizontal SALSAH 2 SVG logo lives in `static/brand/salsah-2.0-logo-horizontal.svg`.
- The directory is initialized as a Git repository; the initial SvelteKit scaffold is committed and the current application work remains available as uncommitted changes for review.

## Architectural Decisions

- Use SvelteKit and TypeScript with Paraglide for localization.
- Use custom CSS and explicit design tokens; do not introduce Tailwind CSS or a third-party component/CSS framework.
- Keep `oldap-api` as the authoritative application backend. Authentication, permissions, quotas, and data validation must remain server-side responsibilities.
- Keep short-lived OLDAP access tokens in memory only. Let `oldap-api` own the longer-lived refresh token in its scoped `HttpOnly` cookie; never persist either token in browser storage.
- Restore named-user sessions through `POST /admin/auth/refresh`, load the authoritative user profile through `GET /admin/user/{userId}`, and use the global revocation endpoint `POST /admin/auth/logout` for logout.
- Treat an OLDAP project as the tenant and working-context boundary. Exclude `oldap:SystemProject` and `oldap:SharedProject` from user-selectable workspaces while retaining their permissions for authorization.
- Encode the selected working project in canonical `/p/[projectShortName]` routes. Automatically enter a sole project, require explicit selection when several are available, and expose project switching in the global header.
- Separate ontology-defined semantics from UI configuration. UI configuration may control presentation, grouping, ordering, labels, and enabled modules, but must not override ontology constraints or authorization.
- Start with a persistent application shell: global top bar, primary navigation, central multi-resource workspace with tabs, and an optional contextual panel.
- Do not implement freely floating desktop windows initially. Preserve multi-resource work through tabs, browser-deep-linkable resources, and later an optional split view.
- Treat drag-and-drop as a progressive convenience. Every operation must also have an explicit, accessible action.
- Reuse code only after a genuinely generic boundary is demonstrated. Avoid prematurely extracting a shared component library from FasnachtsPage.

## Key Locations

- `src/routes/`: SvelteKit routes and layouts.
- `src/lib/components/`: reusable application-shell and workspace components.
- `src/lib/auth/`: in-memory authentication state, login/refresh/logout orchestration, and safe post-login navigation.
- `src/lib/api/baseUrl.ts`: browser-visible OLDAP API origin resolved from `PUBLIC_API_URL`.
- `src/lib/projects/`: typed project loading, infrastructure-project filtering, localized display names, selection state, and canonical project paths.
- `src/lib/demo/`: backend-independent fixture data that must never be confused with OLDAP records.
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
2. Evaluate navigation, resource tabs, contextual panel, responsive behavior, and the visual language using static sample resources. In progress.
3. Establish runtime OLDAP project selection and project-bound deep links. Completed as the first tenant-context foundation; project-specific UI configuration remains open.
4. Add OLDAP authentication and a typed API boundary. Login, refresh, user-profile loading, route guarding, and logout are implemented; the general authenticated API boundary remains open.
5. Implement a first vertical resource workflow: list/search, open, create, and edit one configured resource class.
6. Add archive navigation, media, staging, and ZIP import as independently testable modules.
7. Add concrete VRE capabilities only when justified by real research workflows.

## Immediate Next Step

Exercise login with users assigned to zero, one, and several domain projects against a local OLDAP API. Then add a small authenticated fetch boundary with single-flight token renewal before implementing archive navigation and the first real project-bound resource workflow.
