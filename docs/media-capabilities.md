# Renewable IIIF media capabilities

SALSAH uses the same delivery principles as FasnachtsPage through its own existing
`authenticatedFetch` boundary. No project-specific policy, automatic anonymous login,
backend modification or shared-library release is introduced.

## Authorization and URL ownership

`src/lib/media/access.ts` obtains a fresh token from
`GET /data/mediaobject/id/{assetId}`. The current OLDAP session authorizes this API
request; the API client's existing cookie-backed refresh handles an expired login.
Only the returned image capability goes to the image server. Its unverified `typ`,
image identifier and `exp` are checked for scheduling/binding; SIPI verifies the
signature and grants access. Neither token claims nor UI state grant permission.

`PUBLIC_MEDIA_URL` selects the media origin for **local IIIF delivery contracts**.
Their persisted service path/version/prefix is preserved, even when a restored record
contains a different deployment's hostname. External-image contracts remain unchanged.
The identifier is extracted before `info.json` or the four image transformation
segments. Requests and responses must use the matching media asset.

Capabilities remain in memory/display URLs. No resource, Story directive, draft,
local storage or metadata update receives a renewed token. Resource-summary batch
responses retain their existing delivery contract; no expensive per-image work is
added to the full inventory load.

## Lifecycle

`MediaCapabilitySession` in `renewal.ts` owns one consumer's timer and in-flight
request. It renews 20% before expiry (at most60seconds), coalesces overlapping triggers,
bounds a whole attempt at10seconds, and discards late responses after disposal.
Failure stops the session; there is no anonymous fallback or infinite retry loop.
No global client capability cache is introduced.

`IiifImageViewer` obtains a fresh capability, fetches metadata with Bearer authorization
and rejects redirects. Both IIIF `id` and `@id`, when present, must match the requested
service before OpenSeadragon receives credentials. Tiles and navigator use AJAX Bearer
headers; renewal updates these headers in place without rebuilding the viewport.
Wake/focus handling retries tile state after an overdue renewal. Source or reader
changes destroy the old viewer/session; rotation of the same reader's API access token
does not. Denial destroys the protected viewer and displays a localized retry action.
CORS on the media service must allow the application's origin and `Authorization`.

`authorizedImage` in `image.ts` preserves native image elements and existing CSS/error
handlers. Initial managed sources are inert placeholders, preventing stale-token or
tokenless browser fetches. Authorization starts within200pixels of the viewport.
Offscreen/hidden-tab images stop renewing; returning obtains fresh authorization.
Renewal replaces the query token without changing the image transformation. Denial
clears the source and triggers the existing error/fallback behavior. Destroying the
image removes timers, store subscriptions and visibility/focus observers.

The shared placeholder is a complete transparent 1×1 GIF, including its palette
and LZW data. Truncated GIFs may trigger Safari's error handler before authorization
completes and permanently hide the preview. Keep authorization-failure events intact:
`authorizedImage` deliberately emits an error after clearing the source on denial.
Unlike the former FasnachtsPage collection flow, SALSAH already uses resource-summary
batches rather than a separate access lookup for every inventory image. Enlarged
previews also use `authorizedImage`; no separate popup-token flow is needed.

This covers resource cards and administration, the archive tree, staging thumbnails
and review images, Story asset previews/picker, compact previews and their enlarged
dialog. External images, non-image players, upload and ZIP capabilities retain their
existing behavior. SALSAH has no FasnachtsPage-style imperative crop popup to migrate.

Static images may fetch bytes again when the query capability changes; SIPI's derivative
cache remains useful. Already downloaded pixels cannot be revoked from browser memory.
Normal capability expiry and the server's permission-cache policy govern future access.

## Verification

```sh
npm run test:unit -- --run --project=server
npm run check
npm run build
node tests/media-fixture.mjs
```

The manual fixture mounts the actual SALSAH viewer, CompactMediaPreview, authentication
store and API client against a loopback API. It issues six-second image capabilities
and validates metadata, tile and static image requests. Its controls switch readers
and assets, remove/remount media, and deny renewal. A distant thumbnail tests on-demand
acquisition. `/stats` exposes counters only, never tokens. Ctrl-C removes the temporary
Vite root and closes both servers. No real account or stored record is changed.

Unit coverage includes expiry/binding, coalescing, deadlines, sleep, denial, late
responses, origin/prefix handling, conflicting metadata identifiers, viewport loading
and reader changes. Resource-detail and staging browser test mocks now implement the
per-asset capability endpoint and use tokens with expiry. The complete Playwright
suite is separate from the manual component-browser acceptance.

Acceptance for this change: 113 server-side unit tests pass; Svelte check has zero
errors/warnings, targeted lint/formatting and production build pass. The browser
fixture verifies repeated renewal with no invalid credential requests, viewer zoom,
lightbox, reader/source changes, and denial. A stable renewal interval did not refetch
metadata. Counter totals include HMR reloads during development. The complete Playwright suite was not exercised.


### Local authenticated acceptance (2026-10-07)

The user signed into SALSAH at `http://localhost:5174` against the local OLDAP API
and SIPI/Caddy services. Read-only browser checks verified real Chama resource-card
images, the IIIF detail viewer with zoom and navigator, session restoration in a
second tab, staging thumbnails and the large review image, and archive-tree media
previews and navigation to another real IIIF image. No records, permissions or
uploads were changed.

The live image capabilities have a one-hour lifetime. This short acceptance did
not wait for a complete natural expiry/renewal cycle; repeated renewal and denial
remain covered by the six-second fixture above. Development HMR also prevents
interpreting this session as an uninterrupted longevity test.

Archive expansion exposed an unrelated API search issue: a direct-child query
returned the archive root alongside the requested child. Attaching that ancestor
under its descendant caused recursive tree rendering to overflow. `searchArchiveUnits`
now checks each returned parent against the requested parent and rejects a
self-reference before attaching rows. A regression test covers stray ancestors,
wrong parents and self-references; the real tree expands successfully after the fix.
The backend cause was subsequently reproduced directly in GraphDB: an OPTIONAL
property equality admitted an unbound value. oldaplib now guards each comparison
branch with BOUND; the corrected development wheel is active in the local API.
See `../oldaplib/docs/search_optional_values.md` from the repository root; a normal
library release is still required before external rollout. This guard
validates direct membership; it is not a general validator for malformed cyclic
archive data.
