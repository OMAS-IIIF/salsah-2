# Chama Instance Experiments

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

Close the complete media-first vertical slice after visual review, then model
`PICT0111.jpg` through the independent archive-first pattern. A generic data
interchange format and IIIF Presentation manifests remain separate decisions.
