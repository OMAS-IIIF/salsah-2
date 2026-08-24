# Catalogue Pattern Experiment

## Purpose

This experiment compares archive-first and media-first catalogue identity using two real Chama records:

- `PICT0111.jpg`: a 1981 JPEG digitized from Ruedi Singer's slide by Lukas Rosenthaler;
- `IMG_1751.HEIC`: Lukas Rosenthaler's born-digital 2018 panorama of K-36 locomotive 488.

Both records are represented in both patterns in `patterns.trig`. The graph uses `example.org` and `urn:` identifiers deliberately. It is syntactically valid RDF for inspection and automated comparison, but it is not an OLDAP import file, a final ontology, or a proposal to load data into GraphDB.

## Patterns Under Test

### Archive-first

The catalogued photograph is a described archival item. One or more `shared:MediaObject` resources carry its digital representations.

```text
Photographic work / archive item
├── analogue carrier, when present
├── digital media representation
└── attributed knowledge contribution
```

This pattern gives intellectual content, physical carrier, and digital file independent identities.

### Media-first

The catalogued photograph is itself a descriptive subclass of `shared:MediaObject`. Technical and descriptive metadata live on the same resource.

```text
Catalogued media resource
├── analogue source carrier, when present
└── attributed knowledge contribution
```

This follows the proven direction of Fasnacht's independent `ArchiveMediaObject` records.

## Concrete Comparison

| Question | `PICT0111.jpg` archive-first | `PICT0111.jpg` media-first | `IMG_1751.HEIC` archive-first | `IMG_1751.HEIC` media-first |
| --- | --- | --- | --- | --- |
| Is the catalogue node meaningful without the file? | Yes: photographic work from 1981 | Partly: description and scan identity share one node | Barely: wrapper repeats the HEIC description | Yes: the born-digital photograph is the media item |
| Can the analogue original be represented clearly? | Yes: work, slide, and scan are distinct | Yes, but the scan also acts as the work-level record | Not applicable | Not applicable |
| Can several scans or derivatives be added? | Naturally, as sibling media resources | Possible, but a stable work-level identity is missing | Naturally, but usually unnecessary | Handled as technical derivatives of the media resource |
| Are title, creator, date, and place duplicated? | No; descriptive facts remain on the work | No | Usually yes across wrapper and media | No |
| Is archival hierarchy available? | Directly through `shared:ArchiveUnit` | Only through a separate relation or container | Directly, if needed | Only through a separate relation or container |
| Is the public resource easy to open and render? | Requires resolving linked media | Direct | Requires resolving linked media | Direct |
| Main risk | More nodes and joins | Conflating photographic work with one digitization | Empty-wrapper architecture | Later complexity if the photograph gains independently managed representations |

## Findings

### 1. Neither Pattern Is Universally Correct

The difference is not primarily analogue versus digital. It is whether the project needs an independently managed intellectual, physical, or archival identity beyond the media resource.

- Use archive-first when the represented object or work has its own provenance, hierarchy, identifier, carrier history, or multiple independently managed representations.
- Use media-first when the media item itself is the catalogued asset and a separate wrapper would only duplicate its title, creator, date, place, description, and rights.

### 2. Recommended Default

SALSAH 2 should not impose one global pattern. The project ontology determines the described resource class.

For a new standalone photographic collection, media-first is the proportionate default. Archive-first becomes appropriate when a separately meaningful work, physical object, archival item, or compound structure exists. A project can use both patterns without changing generic SALSAH components.

For the Chama slice:

- model the born-digital `IMG_1751.HEIC` panorama media-first;
- model the 1981 Lobato photograph archive-first because the slide, Ruedi Singer's photographic authorship, Lukas Rosenthaler's digitization, and potential future scans or film relationships have independent value.

### 3. “Distinct” Does Not Always Mean Two Nodes

SALSAH must preserve the semantic distinction between content and file identity. A born-digital media record may carry both layers on one node when that remains unambiguous. The system must still permit separate nodes when preservation, provenance, rights, or multiple representations require them.

### 4. Application Consequences

Generic SALSAH components need to:

- open any configured OLDAP resource class as a described resource;
- render media held directly on a media-first resource or linked from an archive-first resource;
- search and facet across both patterns without duplicate-looking results;
- follow ontology relations rather than checking for Chama or railway classes;
- preserve stable routes for the described resource even when media derivatives change;
- show descriptive metadata, technical media metadata, rights, and source contributions as separate interface groups;
- allow stories to link to either kind of described resource.

The ontology or presentation configuration must identify which relation supplies primary display media for non-media resources. SALSAH must not guess from filenames or class names.

### 5. OLDAP Consequences

No shared ontology change is required to represent the experiment conceptually. Before implementation, these boundaries need confirmation:

- whether `shared:hasMediaObject` should remain archive-specific or gain a backward-compatible generic counterpart;
- whether a reusable descriptive media class belongs in `shared` after comparison with Fasnacht;
- whether direct depiction can reuse an established external vocabulary;
- how provider, photographer, digitizer, rights holder, permission, and credit line are represented without a premature general role framework;
- how an archive hierarchy contains or references a media-first record without turning that record into an archive unit.

## What the RDF Demonstrates

`patterns.trig` contains:

- an experimental vocabulary graph;
- one archive-first graph containing both photographs;
- one media-first graph containing both photographs;
- actual filenames, MIME types, checksums, dimensions, dates, titles, creator/digitizer roles, places, depicted resources, public-display decisions, and credit lines from the reviewed demo metadata.

The source files remain untouched. The RDF records their existing SHA-256 values and local source paths only.

## Decision

The experiment supports an **adaptive default**:

1. media-first for a standalone media asset;
2. archive-first for a separately meaningful work, object, carrier, hierarchy item, or compound resource;
3. both rendered through the same SALSAH described-resource boundary.

This decision is ready to inform a minimal Chama ontology, but the experimental class and property names are not.
