# Story Foundation

## Purpose and Status

This document defines the first deliberately small narrative vertical slice for
SALSAH 2. The Chama demonstration supplies the evidence, but neither the data
model nor the future presentation may contain railway-specific assumptions.

The implementation remains project-local. `chama:Story` is the current pattern;
`chama:StorySection` records the first experiment and remains readable for
compatibility. The model must prove itself with a second, materially different
collection before any concept is promoted to the Shared ontology.

## Lessons from the Fasnacht Story Model

The Fasnacht ontology provides a useful working precedent: a Story has a title,
summary, content, author, date, lead image, publication flag, keywords, and
links to domain resources. Several of those choices are appropriate for that
application but too restrictive for a generic archive interface.

| Fasnacht choice                                    | SALSAH decision                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| One monolithic story-content field                 | Store one multilingual Markdown narrative, with explicit stable asset directives at precise editorial positions.  |
| Exactly one lead image                             | Make a generic lead medium optional; some stories have no image or are led by audio, video, or a document.        |
| Lead image must be a Fasnacht media-library object | Target `shared:MediaObject`, independent of one project's media class.                                            |
| One required story/reference date                  | Record an optional authored date with an unambiguous meaning; dates of narrated events remain on their resources. |
| One Boolean publication flag                       | Keep OLDAP permissions authoritative. A later editorial workflow state must not duplicate access control.         |
| Links only to Fasnacht things                      | Let sections and stories refer to any readable `oldap:Thing`.                                                     |

## Minimal Model

### Story

`chama:Story` subclasses `schema:CreativeWork` and contains:

- one or more multilingual titles through `schema:name`;
- an optional multilingual summary through `schema:abstract`;
- optional multilingual Markdown through `schema:text`;
- one or more authors through `schema:author`;
- an optional, single authored date through `dcterms:created`;
- an optional lead medium through the experimental `chama:leadMedia`;
- optional overall subjects through `schema:about`;
- resources embedded in the narrative through `schema:mentions`.

The story does not own or duplicate catalogue metadata. Its references point to
independently described resources. An empty narrative remains valid during the
editorial workflow.

### Markdown and Assets

SALSAH persists Markdown, not generated HTML. The only SALSAH-specific syntax in
the first slice is a block directive:

```markdown
:::asset{iri="chama:IMG_1751" caption="Optional editorial caption"}
:::
```

The IRI is the stable catalogue identity. SALSAH resolves it through the
permission-aware summary API and derives the current IIIF or external delivery
URL at render time. Capability tokens and media-server URLs must never be
stored in Markdown. The optional caption belongs to the narrative; catalogue
title, rights, and technical metadata remain on the referenced resource.

`schema:mentions` repeats the embedded resource IRIs as explicit RDF links. The
Markdown determines placement, while RDF supports discovery, navigation, and
future consistency checks. `schema:about` continues to describe the story's
overall subjects and is not inferred merely because an image is embedded.

### Retained Story-Section Experiment

The first live Chama Story used three separately addressable
`chama:StorySection` resources. Hands-on testing showed that ordinary resource
navigation interrupts reading and makes authoring unnecessarily indirect.
Those resources and the optional `schema:hasPart` relationship are retained as
non-destructive experiment evidence, but new Story authoring no longer creates
sections.

## Deliberate Boundaries

- Narrative text is distinct from neutral catalogue description and attributed
  knowledge contributions.
- Resource permissions determine who may read a story or section. The first
  Chama story remains curator-only while it references the restricted map.
- Missing or unreadable linked resources must never leak through the public UI.
  The renderer shows a neutral unavailable block and does not probe existence.
- Raw HTML, layout grids, annotations, branching narratives, and elaborate image
  series are deferred. Rendered Markdown is sanitized.
- Each language may have its own Markdown flow. Every language variant must
  retain valid resource IRIs and should keep `schema:mentions` synchronized.
- CKEditor is not used. The planned editor is Markdown-first and will insert
  directives through an OLDAP resource picker without exposing their syntax to
  authors unless they choose source editing.
- A publishing workflow may later introduce draft/review/published states, but
  those states will describe editorial progress rather than replace OLDAP
  permissions.

## First Acceptance Slice

The first draft story, _Chama: From the survey plat to the living railway_, links
three already catalogued resources:

1. the 1885 depot-grounds and pipeline plat;
2. the restored Chama station photograph;
3. the panorama of K-36 locomotive 488 before departure.

Acceptance is incremental:

1. load the additive `schema:text`/`schema:mentions` ontology update;
2. apply and rerun the idempotent Markdown migration without deleting sections;
3. verify the read-only Markdown and inline-asset renderer;
4. add a Markdown editor and permission-aware OLDAP asset picker as a separate
   increment;
5. test the same authoring and rendering pattern with a non-railway example before promoting concepts
   to Shared.

The subsequent product slice should be the staging area. General resource
editing follows it, informed by the concrete validation, status, and selection
needs observed in narrative and staging workflows.

The first administration increment now supplies the project-scoped Story list
and multilingual Markdown source/preview editor. It performs complete
replacement updates for all language variants, derives `schema:mentions`, and
verifies the saved record through read-back. The OLDAP asset picker remains the
next separate increment; see `administration-foundation.md`.
