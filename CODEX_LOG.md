# CODEX_LOG

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
