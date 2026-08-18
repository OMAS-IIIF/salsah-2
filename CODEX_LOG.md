# CODEX_LOG

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
