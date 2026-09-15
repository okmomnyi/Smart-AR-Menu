#!/bin/sh
set -e

# The bundled CLI, never npx: npx would fetch whatever Prisma is newest from
# the registry on every start, which fails offline and can drift from the
# client version this image was built with.
echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting AR Menu API..."
exec node dist/index.js
