#!/bin/bash
# Simple script to test OpenRouter API key

# Activate the virtual environment
source venv/bin/activate

# Check if API key is provided
if [ -z "$1" ]; then
    echo "Please provide your OpenRouter API key as an argument."
    echo "Usage: ./test_key.sh YOUR_API_KEY"
    exit 1
fi

# Set the API key
export OPENROUTER_API_KEY="$1"

# Test the API connection
echo "Testing OpenRouter API connection with provided key..."
curl -s -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models | head -20

# Run the debug script
echo -e "\n\nRunning debug script with provided key..."
python debug_openrouter.py 