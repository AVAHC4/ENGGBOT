#!/bin/bash
# Run debug script for ENGGBOT file processor and OpenRouter integration

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "ERROR: OPENROUTER_API_KEY environment variable is not set."
    echo "Please set it with: export OPENROUTER_API_KEY=your_api_key_here"
    exit 1
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Run the debug script for OpenRouter API
echo "Running OpenRouter API debug tests..."
python debug_openrouter.py

# Check if the debug was successful
if [ $? -eq 0 ]; then
    echo -e "\n\nStarting the API server..."
    # Run the API server
    python api_wrapper.py
else
    echo -e "\n\nOpenRouter API debug failed. Please fix the issues before starting the server."
    exit 1
fi 