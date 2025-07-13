#!/bin/bash
# Run debug script for ENGGBOT File Processor and OpenRouter integration

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "ERROR: OPENROUTER_API_KEY environment variable is not set."
    echo "Please set it with: export OPENROUTER_API_KEY=your_actual_api_key_here"
    echo "You can get an API key from https://openrouter.ai/keys"
    exit 1
fi

# Check if the API key is the default placeholder
if [ "$OPENROUTER_API_KEY" = "your_api_key_here" ]; then
    echo "ERROR: You are using the placeholder API key."
    echo "Please set your actual OpenRouter API key with:"
    echo "export OPENROUTER_API_KEY=your_actual_api_key_here"
    echo "You can get an API key from https://openrouter.ai/keys"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for system dependencies
echo "Checking system dependencies..."
if ! command_exists poppler-utils && ! command_exists pdfinfo; then
    echo "WARNING: poppler-utils not found. PDF processing may not work correctly."
    echo "To install on macOS: brew install poppler"
    echo "To install on Ubuntu/Debian: sudo apt-get install poppler-utils"
    echo "To install on CentOS/RHEL: sudo yum install poppler-utils"
    echo ""
fi

if ! command_exists tesseract; then
    echo "WARNING: tesseract not found. OCR functionality may not work correctly."
    echo "To install on macOS: brew install tesseract"
    echo "To install on Ubuntu/Debian: sudo apt-get install tesseract-ocr"
    echo "To install on CentOS/RHEL: sudo yum install tesseract"
    echo ""
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Update pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install critical packages directly with retries
echo "Installing critical packages..."
pip install requests --retries 5
pip install httpx --retries 5
pip install fastapi uvicorn python-multipart --retries 5
pip install PyPDF2 --retries 5

# Display API key info (first 5 and last 4 chars)
KEY_LENGTH=${#OPENROUTER_API_KEY}
if [ $KEY_LENGTH -gt 8 ]; then
    KEY_PREVIEW="${OPENROUTER_API_KEY:0:5}...${OPENROUTER_API_KEY: -4}"
else
    KEY_PREVIEW="[too short, please check]"
fi
echo "Using OpenRouter API key: $KEY_PREVIEW"

# Try to run the debug script
echo "Running OpenRouter API debug tests..."
python debug_openrouter.py

# Check if the debug was successful
if [ $? -eq 0 ]; then
    echo -e "\n\nStarting the API server..."
    # Run the API server
    python api_wrapper.py
else
    echo -e "\n\nOpenRouter API debug failed. Please check the issues above."
    
    # If debug failed, try installing more packages
    echo "Attempting to install additional required packages..."
    pip install unstructured --no-deps --retries 5
    pip install pydantic starlette --retries 5
    
    # Try running the debug script again
    echo "Running OpenRouter API debug tests again..."
    python debug_openrouter.py
    
    if [ $? -eq 0 ]; then
        echo -e "\n\nStarting the API server..."
        python api_wrapper.py
    else
        echo -e "\n\nOpenRouter API debug still failing."
        echo "Please check that:"
        echo "1. Your API key is valid and has sufficient credits"
        echo "2. You have network connectivity to openrouter.ai"
        echo "3. The DeepSeek model is available on your OpenRouter plan"
        exit 1
    fi
fi 