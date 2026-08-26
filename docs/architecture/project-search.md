# Project search

## Purpose

SALSAH search is project-bound, permission-aware, and ontology-neutral. The
application must not contain Chama, Fasnacht, or other domain-specific search
fields. Search URLs are deep-linkable so a result set can be revisited or
shared within the same authorization context.

## First vertical slice

The route `/p/[project]/search?q=...` uses OLDAP's broad text endpoint:

```text
GET /data/text/{project}?q={query}&limit=24
```

This is the deliberately small baseline. OLDAP searches readable textual
literal values and applies instance permissions. A single RDF resource can be
returned more than once when several properties or language values match, so
SALSAH deduplicates results by IRI. It then reads each unique resource once to
obtain the canonical `schema:name`, its ontology class label, and an optional
permission-aware media preview. The same generic card component is used by the
project overview and search results.

The baseline has no facets, pagination, highlighting, or project-specific
ranking. It returns at most 24 unique enriched cards. This bound is visible in
the implementation and must not silently become an archive-scale retrieval
strategy.

## GraphDB Lucene connectors

Project ontology YAML can define Lucene connector blocks as demonstrated by the
Fasnacht project. With the current `oldap-tools` contract, multiple blocks are
grouped and merged into the project's GraphDB connector. They may expose direct
or chained fields such as titles, descriptions, OCR, transcripts, or text on a
linked representation. OLDAP's structured `/data/search/{project}` endpoint can
query these fields through `ftfilter` and preserves GraphDB scoring.

SALSAH must eventually prefer an applicable Lucene search profile because it
can provide better linguistic matching, ranking, and linked-property search.
It must not copy known Fasnacht field names into its generic frontend. At
present the runtime data-model response does not expose the configured Lucene
field names, so the frontend cannot construct a sound generic `ftfilter`.

The next backend-facing increment should therefore define a small read contract
that exposes project search profiles to authorized clients. The contract needs
at least:

- a stable profile identifier and localized label;
- the Lucene fields that form the default project-wide text search;
- optional result-class scope and presentation grouping;
- whether a field is suitable for ranking, highlighting, or a later facet;
- a deterministic fallback to broad `/data/text` search when no applicable
  profile or connector is available.

This contract may be added to the OLDAP data-model response or exposed through
a dedicated search-configuration endpoint. That decision belongs in OLDAP,
because GraphDB connector availability and field validation are backend
concerns. Any oldaplib or oldap-api change must remain backwards compatible.

## Invariants

- OLDAP remains authoritative for permissions and search execution.
- Search stays within the selected project.
- Search configuration comes from OLDAP or project configuration, never from
  project-specific branches in SALSAH.
- Missing labels, stale hits, or unavailable previews degrade gracefully and do
  not conceal an otherwise readable result.
- Facets and advanced ranking are added only after real project searches show
  which distinctions are useful.
