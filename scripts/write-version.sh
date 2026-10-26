#!/bin/sh
# Cloudflare build command: writes the deployed commit's short hash for the app to display.
printf '%s' "${WORKERS_CI_COMMIT_SHA:-$(git rev-parse HEAD)}" | cut -c1-7 > version.txt
