#!/bin/bash
set -e
echo "Seeding database..."
npx prisma db seed
echo "Seed complete."
