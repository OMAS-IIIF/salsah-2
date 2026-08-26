# Chama Instance Experiments

## Minimal archive structure

`chama-minimal-archive-structure.yaml` defines the first project-neutral
archive-tree experiment over the existing Chama resources. It deliberately uses
`shared:ArchiveGroup` for the root because the demonstration combines material
from different record creators and must not imply a single provenance-based
fonds.

The create-only batch adds:

- `chama:ChamaRailwayHeritageDemo` — ArchiveGroup;
- `chama:LukasRosenthalerRailwayPhotographs` — Series;
- `chama:LukasRosenthalerChama2018` — File linked to four existing born-digital
  MediaObjects;
- `chama:LukasRosenthalerChama2023` — File linked to the existing Foster's
  MediaObject;
- `chama:RuediSingerRailwayPhotographs1981` — Series.

The existing archive-first
`chama:LobatoTrestlePhotograph1981` remains the intellectual Item and is moved
below the Ruedi Singer series through the cycle-safe archive-move API using
`lobato-archive-move-payload.json`. It is not recreated or duplicated. This
tests media-first and archive-first resources inside one hierarchy while
preserving their distinct catalogue identities.

Apply order:

1. Validate and dry-run the data YAML with `oldap-tools`.
2. Apply and rerun it to verify idempotency.
3. Move the pre-existing Lobato Item only after the new parent Series exists.

All three steps have been completed live. A second batch apply returned
`existing_verified` for all five units, and the move endpoint verified
`chama:LobatoTrestlePhotograph1981` below
`chama:RuediSingerRailwayPhotographs1981` at position 1 without creating a
duplicate Item.

Every new unit explicitly grants `oldap:Unknown` `DATA_VIEW`. Descriptive access
text remains informational and never substitutes for OLDAP permissions.

## Status

The first live Chama instance has been created and read back successfully:

- IRI: `chama:IMG_1751`
- class: `chama:CataloguedPhotograph`
- pattern: media-first
- anonymous permission: `oldap:Unknown` with `DATA_VIEW`
- public-display decision: `true`
- media binary imported: yes
- generated derivative: pyramidal `master.tif`
- IIIF delivery: Image API 3, level 2, 9944 × 3700 pixels
- generic SALSAH OpenSeadragon rendering: verified live

The first linked resource increment has also been created and verified:

- Person IRI: `chama:LukasRosenthaler`
- class: `chama:Person`
- name: `Lukas Rosenthaler@de`
- anonymous permission: `oldap:Unknown` with `DATA_VIEW`
- relationship: `chama:IMG_1751 dcterms:creator chama:LukasRosenthaler`

The second linked resource increment has been created and verified:

- Place IRI: `chama:ChamaStation`
- class: `chama:Place`
- names: `Bahnhof Chama@de`, `Chama station@en`
- anonymous permission: `oldap:Unknown` with `DATA_VIEW`
- relationship: `chama:IMG_1751 chama:capturePlace chama:ChamaStation`

The qualified content-date increment has been created and verified:

- property: `chama:IMG_1751 chama:creationDating [oldap:Dating]`
- input: `2018-07-10`
- normalized API value: `2018-07-10 - 2018-07-10 (GREGORIAN, DAY)`
- embedded camera time and timezone: deliberately not asserted

The first depicted-subject chain has been created and verified:

- locomotive-class IRI: `chama:K36`
- locomotive IRI: `chama:Locomotive488`
- class relationship: `chama:Locomotive488 chama:locomotiveClass chama:K36`
- depiction relationship: `chama:IMG_1751 chama:depicts chama:Locomotive488`
- both new resources grant `oldap:Unknown` `DATA_VIEW`
- manufacturer and operator context: added in the subsequent verified increment

The first owner KnowledgeContribution has been created and verified:

- contribution IRI: `chama:Annotation_IMG_1751_2026_08_21`
- canonical relationship: `chama:describes chama:IMG_1751`
- contributor: `chama:LukasRosenthaler`
- contribution date and language: 2026-08-21, German
- anonymous permission: `oldap:Unknown` with `DATA_VIEW`
- explicit photograph update: none
- inferred inverse relation visible through the photograph API: yes

The organization metadata increment has been created and verified:

- organization IRI: `chama:BaldwinLocomotiveWorks`
- organization IRI: `chama:DenverAndRioGrandeWestern`
- organization IRI: `chama:CumbresAndToltecScenicRailroad`
- manufacturer relationship: `chama:Locomotive488 chama:manufacturer chama:BaldwinLocomotiveWorks`
- operator relationships: D&RGW and C&TS through `chama:operator`
- all three organizations grant `oldap:Unknown` `DATA_VIEW`
- generic SALSAH navigation from locomotive to all three organizations and each
  resulting public organization page: verified live
- `chama:operator` currently has no temporal qualification; the two values must
  therefore be read as historical/current operators across the locomotive's
  biography, not as a claim that both operated it simultaneously

The first archive-first structure for `PICT0111.jpg` has been created and
verified as five independently addressable public resources:

- `chama:RuediSinger`: photographer
- `chama:LobatoTrestle`: capture place and depicted structure
- `chama:Slide_PICT0111`: analogue source carrier
- `chama:PICT0111`: digital representation, digitized by
  `chama:LukasRosenthaler`
- `chama:LobatoTrestlePhotograph1981`: photographic work and archive item,
  linked to the carrier and digital representation

The exact payloads are stored in the five corresponding `*-create-payload.json`
files. The 1981 Dating round-trips as
`1981-01-01 - 1981-12-31 (GREGORIAN, YEAR)`. Generic SALSAH navigation and the
missing-media state on both the work and representation were verified live.
The JPEG has subsequently been attached to the existing representation,
converted to a pyramidal `master.tif`, and verified through IIIF Image API 3
level 2 at 3900 × 2600 pixels. The same authorized viewer is live on both the
direct representation and the indirectly resolved photographic work. The owner
KnowledgeContribution remains a separate verification gate.

`lobato-knowledge-contribution-create-payload.json` now contains the reviewed
owner contribution for that final gate. It preserves the original German text
and follow-up clarification verbatim, while keeping the normalized description,
uncertainty, and normalization decisions in separate fields. The contribution
describes the photographic work rather than the JPEG representation and retains
Ruedi Singer as photographer versus Lukas Rosenthaler as digitizer.

`img-1751-create-payload.json` records the exact non-secret JSON body sent to
`PUT /data/chama/CataloguedPhotograph`. It is experiment evidence, not yet a
generic import-format contract. `lukas-person-create-payload.json` and
`img-1751-creator-update-payload.json` record the subsequent Person creation and
additive creator-link update. `chama-station-create-payload.json` and
`img-1751-capture-place-update-payload.json` record the Place creation and
capture-place link. `img-1751-creation-dating-update-payload.json` records the
Dating shorthand accepted by the instance update endpoint.

`k36-create-payload.json`, `locomotive-488-create-payload.json`, and
`img-1751-depicts-update-payload.json` record the verified minimal K-36/488
context and photograph relationship without yet introducing manufacturer or
operator resources.

`img-1751-knowledge-contribution-create-payload.json` records the verified first
owner contribution. It preserves the original annotation verbatim, separates
the normalized description, uncertainty, and normalization decisions, and
stores only `chama:describes`; OLDAP exposes the inverse relationship without a
redundant photograph update.

The three `*-organization-create-payload.json` files and
`locomotive-488-organizations-update-payload.json` record the exact verified
bodies for the organization increment. They intentionally do not add
dates or roles that the current Chama ontology cannot express faithfully.

`img-1751-media-attach-form.json` records the reviewed non-secret multipart
fields and source-file identity for the completed binary attachment. The local
Mediahelper performed this catalogue-first transition without recreating the
resource or changing its descriptive metadata and permissions. Read-back
verification confirmed the source checksum, generated pyramidal TIFF, short-lived
media capability, and IIIF `info.json` response.

## Round-trip Observation

The normal instance endpoint returned max-one string properties such as
`shared:originalName`, `shared:originalMimeType`, `shared:checksum`, and
`chama:creditLine` as one-element JSON arrays. The max-one boolean
`chama:publicDisplayPermission` was returned as a scalar. A future generic data
serializer must preserve RDF cardinality and datatype semantics without relying
on every max-one API value having the same JSON container shape.

`oldap:Dating` is stored as a qualified RDF value structure with its own node,
but the normal instance endpoint serializes it as a normalized scalar display
value. SALSAH therefore treats it as metadata rather than a navigable resource
link at the current API boundary.

## Next Increment

Run `/private/tmp/add_chama_lobato_contribution.py` and verify the inferred inverse
relationship on the photographic work. Then review whether the project ontology
should override the inherited “Record creator” label with “Photographer”. A
generic data interchange format and IIIF Presentation manifests remain separate
decisions.
