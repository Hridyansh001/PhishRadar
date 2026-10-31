#!/usr/bin/env bash
# Start script for PhishRadar Intelligent ML Microservice
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    venv/bin/pip install -r requirements.txt
fi

if [ ! -f "models/phishradar_classifier.joblib" ]; then
    echo "Training model..."
    venv/bin/python train_model.py
fi

echo "Starting PhishRadar ML Microservice on port 8000..."
exec venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload

