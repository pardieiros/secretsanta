#!/bin/bash
set -e

# Wait for database to be ready (optional but recommended)
# You can add a wait-for-it script here if needed

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
echo "Starting Django server..."
exec "$@"

