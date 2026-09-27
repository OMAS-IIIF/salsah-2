#!/bin/sh
# Validate public runtime configuration before starting the Node adapter.
set -eu
: "${PUBLIC_API_URL:?PUBLIC_API_URL is required}"
: "${PUBLIC_MEDIA_URL:?PUBLIC_MEDIA_URL is required}"
: "${ORIGIN:?ORIGIN is required}"
exec node build
