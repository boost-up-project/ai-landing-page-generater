#!/bin/sh
set -eu

: "${BRAND_API_BASE_URL:?BRAND_API_BASE_URL environment variable is required}"

envsubst '${BRAND_API_BASE_URL}' \
  < /usr/share/nginx/html/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js
