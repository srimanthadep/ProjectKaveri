#!/usr/bin/env bash
# Exit on any error
set -o errexit

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Running database migrations and initial seed..."
python init_db.py

echo "==> Backend build completed successfully!"
