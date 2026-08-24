# SALSAH 2 Foundations

## Status and Purpose

This document defines the durable product and engineering foundations of SALSAH 2. It is the primary reference for product scope, architectural direction, and technical decision-making. It should evolve deliberately when the project's goals or guiding principles change; implementation details and short-term work belong in `codex.md` and `CODEX_LOG.md`.

SALSAH 2 is a generic, project-neutral interface for the OLDAP backend. It combines professional archive work, approachable discovery and public presentation, and narrative contextualization in one coherent environment. It may reuse proven concepts from FasnachtsPage, but its core must not contain Fasnacht-specific assumptions.

## Generic Product Boundary and Demonstration Corpora

SALSAH 2 is a generic system for heterogeneous assets from art, culture, history, and research. A concrete demonstration corpus is a requirements probe and a means of hands-on validation; it is never the product domain.

- The Chama and Cumbres & Toltec corpus must expose real archival, discovery, media, rights, relationship, and storytelling needs without introducing railway-specific concepts into the SALSAH core.
- Domain entities such as locomotives, bridges, hotels, railway companies, and route segments belong in a project ontology and project data. Generic code should deal with configured resource classes, properties, relationships, media, provenance, rights, and narratives.
- Every capability derived from a demonstration corpus must be tested conceptually against materially different assets. It should support another suitable OLDAP ontology and configuration without a core-code fork.
- Before reusable contracts are stabilized or extracted into a library, validate them against at least one substantially different cultural-heritage context.
- Potential validation contexts include the Friends of the Cumbres & Toltec Scenic Railroad and the Historical Museum Basel. They illustrate different collection scales and institutional needs; they are not assumed customers, partnerships, or committed integrations.
- Project-specific applications may provide tailored language, visual composition, workflows, and modules while continuing to use generic SALSAH building blocks and OLDAP semantics.
- Build shared archive semantics bottom-up from real workflows. Keep experimental concepts project-local and promote them only after their cross-domain meaning has been demonstrated.
- Treat media-first cataloguing as a first-class simple path, particularly for small institutions, while supporting archive and cultural objects with zero, one, or many heterogeneous media representations.

## Product Pillars

### 1. Pragmatic Archive Foundation

SALSAH 2 provides a reliable basis for acquiring, organizing, describing, preserving, and managing archival assets supported by OLDAP.

- Apply archival standards where they provide concrete value, especially concepts from OAIS and Records in Contexts (RiC/RiC-O).
- Interpret standards pragmatically. Standards guide the domain model and workflows; they must not force unnecessary complexity into the user experience or implementation.
- Preserve provenance, context, relationships, identifiers, permissions, and lifecycle information where required for trustworthy archive work.
- Build advanced archive capabilities as independent, testable modules rather than as one monolithic subsystem.

### 2. Discovery and Public Presentation

SALSAH 2 provides an attractive, understandable search and exploration experience for people without archival training as well as for specialists.

- Search, browsing, filtering, and resource presentation must use clear language and progressive disclosure.
- Public-facing presentation is a first-class use case, not an administrative interface with controls removed.
- The interface should make heterogeneous cultural and research assets understandable without hiding useful detail from expert users.
- Accessibility, responsive design, stable links, and multilingual presentation are product requirements.

### 3. Narrative Contextualization

SALSAH 2 enables people to create and present stories that connect assets and explain their historical, cultural, or research context.

- Stories are curated contexts built from referenced assets, explanatory content, and meaningful relationships.
- Narrative features must preserve links to authoritative resources rather than duplicating or weakening their archival identity.
- The implementation should begin with concrete editorial and presentation workflows. A general-purpose publishing system is not an initial goal.

## Product and Engineering Principles

### Modular, Simple, and Incremental

- Follow KISS: choose the simplest solution that is structurally sound, readable, and able to evolve.
- Deliver small vertical increments that can be inspected and tested hands-on with real users and representative data.
- Apply the same incremental KISS discipline to ontologies: begin with the smallest useful semantics and avoid speculative universal models.
- Keep modules cohesive and their boundaries explicit. Introduce shared infrastructure only when a concrete recurring need justifies it.
- Avoid speculative frameworks, registries, abstraction layers, and configuration machinery.
- Preserve working, reviewable states throughout development so that product feedback can redirect the project before large investments are made.

### Dependencies

- Keep external runtime dependencies deliberately small.
- Add a dependency when it solves a substantial, well-understood problem better and more sustainably than local code.
- Evaluate dependencies for maintenance health, accessibility, bundle and runtime cost, security, API stability, licensing, and ease of replacement.
- Do not introduce Tailwind CSS or a third-party component/CSS framework. Use explicit design tokens and maintainable project CSS.
- Avoid reimplementing mature, difficult infrastructure merely to achieve a dependency-free codebase.

### Components and Future Reuse

- Design reusable UI components with explicit responsibilities, typed contracts, accessible behavior, predictable state, and minimal knowledge of routes, projects, or domain-specific content.
- Keep project-specific composition, terminology, configuration, and workflows outside generic components.
- Separate pure domain or transformation logic from Svelte components when it has independent value and can be tested without a browser.
- Prefer framework-independent TypeScript for reusable non-visual logic where Svelte provides no material benefit.
- Treat a standalone component or utility library as a future extraction target, not as a premature package boundary. Extract only after SALSAH 2 and at least one concrete project-specific use case demonstrate a stable reusable API.
- The long-term goal is to enable project-specific applications to be assembled efficiently from high-quality SALSAH building blocks without forcing those applications to reproduce SALSAH itself.

### Maintainability and Longevity

- Optimize for code that humans can understand, review, test, and change safely over many years.
- Use clear names, explicit types, focused modules, and documentation that explains responsibilities, inputs, outputs, side effects, and important invariants.
- Prefer stable web standards and durable data contracts over fashionable implementation patterns.
- Keep accessibility, localization, responsive behavior, deep links, and browser navigation intact as the application grows.
- Refactor when real complexity reveals a better boundary; do not allow prototype structure to become permanent accidentally.

### Visual and Interaction Quality

- Provide a calm, polished, and visually engaging environment suitable for humanities researchers, archivists, librarians, and the wider public.
- Combine professional depth with an approachable interface; specialist capability must not require specialist terminology everywhere.
- Use consistent interaction patterns and progressive disclosure to keep common work simple while retaining advanced possibilities.
- Treat visual review and hands-on testing as part of implementation, not as a final cosmetic pass.

## System Boundaries

### OLDAP Backend

- `oldap-api` is the authoritative boundary for authentication, authorization, validation, quotas, and persistence.
- OLDAP ontologies and shapes define semantic and validation constraints. SALSAH configuration may control presentation, grouping, ordering, labels, and enabled modules, but must not override those constraints.
- An OLDAP project is the tenant and working-context boundary in SALSAH 2.
- Required changes to `oldaplib` and `oldap-api` must be backward-compatible whenever reasonably possible.
- When a breaking backend change is unavoidable, it requires an explicit migration strategy, impact analysis, and deliberate approval rather than an implicit frontend-driven contract change.

### Existing Administration Tools

The following capabilities may remain in `oldap-app` and `oldap-tools` for now:

- project creation and maintenance;
- hierarchical-list and category administration;
- role and related system administration;
- specialist setup or maintenance workflows that do not yet benefit from SALSAH integration.

A capability may move into SALSAH 2 when doing so clearly improves a real end-to-end user workflow. Such a move should be based on user experience and product cohesion, not on a goal of replacing the existing tools wholesale.

## Functional Modularity

The product should grow through independently understandable capabilities, including:

- session and project context;
- resource search, browsing, viewing, creation, and editing;
- archival structure and contextual relationships;
- media handling and presentation;
- ingest preparation, staging, import, and export;
- narrative authoring and public stories;
- project-specific presentation and workflow configuration.

These are capability boundaries, not a mandate to create separate packages or service layers before the implementation needs them.

## Decision Checklist

For a meaningful product or technical decision, ask:

1. Which product pillar and real user workflow does this serve?
2. Is this the simplest maintainable solution for the current evidence?
3. Does it preserve OLDAP semantics, authorization, and backward compatibility?
4. Is the boundary generic, or does it belong close to a project-specific workflow?
5. Can the result be reviewed and tested hands-on in the next increment?
6. Does an external dependency earn its long-term cost?
7. Are accessibility, localization, navigation, and public presentation preserved?
8. Would the generic boundary still work for a materially different collection and institution without a core-code fork?
9. Is the decision documented at the appropriate level?

## Current Non-Goals

- Replacing all functions of `oldap-app` or `oldap-tools`.
- Implementing every part of OAIS or RiC regardless of practical benefit.
- Building a universal component framework before stable reuse has been demonstrated.
- Embedding Fasnacht-specific data models, labels, or workflows in the generic application core.
- Turning the Chama demonstration into a railway-specific product or embedding its entities and terminology in generic components.
- Turning the initial narrative capability into a general-purpose content-management system.
- Hiding backend authorization or ontology constraints behind frontend-only behavior.

## Governance of This Document

- Use this document when evaluating scope, architecture, dependencies, reusable components, and major UX decisions.
- Change it only when the durable product direction or engineering principles change.
- Keep `codex.md` aligned with it as the concise description of current architecture, repository state, and roadmap.
- Record implementation work and immediate technical consequences in `CODEX_LOG.md`.
- When a proposed change conflicts with these foundations, make the conflict explicit and either revise the proposal or deliberately amend this document.
