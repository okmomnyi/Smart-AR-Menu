#!/bin/sh
set -e

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Starting AR Menu backend..."
exec node dist/index.js
