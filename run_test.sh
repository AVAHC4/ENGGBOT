#!/bin/bash
# Simple wrapper to run the comprehensive OpenRouter API test

# Check if API key is provided as argument
if [ -n "$1" ]; then
    export OPENROUTER_API_KEY="$1"
    echo "Using API key from command line argument"
elif [ -z "$OPENROUTER_API_KEY" ]; then
    echo "ERROR: No OpenRouter API key provided"
    echo "Usage: ./run_test.sh YOUR_API_KEY"
    echo "   or: export OPENROUTER_API_KEY=YOUR_API_KEY && ./run_test.sh"
    exit 1
else
    echo "Using API key from environment variable"
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "Activated virtual environment"
else
    echo "No virtual environment found, using system Python"
fi

# Ensure requests is installed
pip install requests --quiet

# Run the comprehensive test
echo "Running comprehensive OpenRouter API test..."
python test_openrouter.py

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "\nTest completed successfully!"
    echo "You can now run ./run_debug.sh to start the server"
else
    echo -e "\nTest failed. Please fix the issues before continuing."
fi 