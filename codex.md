# SALSAH 2 Project Context

## Purpose

SALSAH 2 is a project-neutral, configurable archive management application and Virtual Research Environment for the OLDAP backend. It is intended to support multiple organizations and research contexts without embedding Fasnacht-specific concepts in the application core.

The application will reuse proven interaction patterns and selected implementation ideas from FasnachtsPage while keeping tenant configuration, OLDAP ontology semantics, and generic user-interface behavior clearly separated.

## Current Repository State

- The repository contains a minimal SvelteKit application written in TypeScript.
- Svelte 5, SvelteKit, the Node adapter, Vite, Vitest, Playwright, ESLint, and Prettier are configured.
- Paraglide is configured for German, French, Italian, and English.
- Generated starter/demo routes and test examples are still present.
- No OLDAP API integration, authentication flow, tenant model, or production application shell has been implemented yet.
- The initial horizontal SALSAH 2 SVG logo lives in `static/brand/salsah-2.0-logo-horizontal.svg`.
- The directory has not yet been initialized as a Git repository.

## Architectural Decisions

- Use SvelteKit and TypeScript with Paraglide for localization.
- Use custom CSS and explicit design tokens; do not introduce Tailwind CSS or a third-party component/CSS framework.
- Keep `oldap-api` as the authoritative application backend. Authentication, permissions, quotas, and data validation must remain server-side responsibilities.
- Treat an OLDAP project as the initial tenant boundary. Start with one configured tenant per deployment; defer runtime multi-tenant switching until a concrete need exists.
- Separate ontology-defined semantics from UI configuration. UI configuration may control presentation, grouping, ordering, labels, and enabled modules, but must not override ontology constraints or authorization.
- Start with a persistent application shell: global top bar, primary navigation, central multi-resource workspace with tabs, and an optional contextual panel.
- Do not implement freely floating desktop windows initially. Preserve multi-resource work through tabs, browser-deep-linkable resources, and later an optional split view.
- Treat drag-and-drop as a progressive convenience. Every operation must also have an explicit, accessible action.
- Reuse code only after a genuinely generic boundary is demonstrated. Avoid prematurely extracting a shared component library from FasnachtsPage.

## Key Locations

- `src/routes/`: SvelteKit routes and layouts.
- `src/lib/`: application components, domain code, API client code, and utilities.
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

1. Replace the generated starter page with a static application-shell prototype.
2. Evaluate navigation, resource tabs, contextual panel, responsive behavior, and the visual language using static sample resources.
3. Define the smallest tenant configuration contract and load one tenant per deployment.
4. Add OLDAP authentication and a typed API boundary.
5. Implement a first vertical resource workflow: list/search, open, create, and edit one configured resource class.
6. Add archive navigation, media, staging, and ZIP import as independently testable modules.
7. Add concrete VRE capabilities only when justified by real research workflows.

## Immediate Next Step

Build and review a backend-independent application-shell prototype using the SALSAH 2 logo, custom CSS tokens, static navigation, resource tabs, and an optional contextual panel. Do not add OLDAP integration until the shell has been visually evaluated.
