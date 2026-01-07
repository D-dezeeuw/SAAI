#!/bin/bash

# Build and run SAAI Docker container

set -e

# Check for .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Create a .env file with at least:"
    echo "  OPENROUTER_API_KEY=your_key_here"
    exit 1
fi

# Check if OPENROUTER_API_KEY is set in .env
if ! grep -q "OPENROUTER_API_KEY=." .env; then
    echo "Error: OPENROUTER_API_KEY not set in .env file!"
    exit 1
fi

echo "Building Docker image..."
docker build -t strudel-ai .

echo ""
echo "Starting container..."
docker run -p 4321:4321 --env-file .env strudel-ai
