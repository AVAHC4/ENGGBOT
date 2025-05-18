#!/bin/bash
# Setup script for NVIDIA Riva speech recognition

echo "Setting up NVIDIA Riva Speech Recognition for ENGGBOT..."

# Check if Python is installed
if ! command -v python3 &>/dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &>/dev/null; then
    echo "Error: pip is required but not installed."
    exit 1
fi

# Install required Python packages
echo "Installing required Python packages..."
pip install nvidia-riva-client python-dotenv

# Clone NVIDIA Riva Python clients repository if not exists
if [ ! -d "python-clients" ]; then
    echo "Cloning NVIDIA Riva Python clients repository..."
    git clone https://github.com/nvidia-riva/python-clients.git
    if [ $? -ne 0 ]; then
        echo "Error: Failed to clone NVIDIA Riva Python clients repository."
        exit 1
    fi
    echo "Repository cloned successfully."
else
    echo "NVIDIA Riva Python clients repository already exists."
    
    # Update the repository
    echo "Updating repository..."
    cd python-clients
    git pull
    cd ..
fi

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# NVIDIA Riva API Key - Replace with your actual API key
NVIDIA_API_KEY=your_api_key_here
EOF
    echo ".env file created. Please update it with your NVIDIA API key."
else
    # Check if NVIDIA_API_KEY is in .env
    if ! grep -q "NVIDIA_API_KEY" .env; then
        echo "Adding NVIDIA_API_KEY to .env file..."
        echo "# NVIDIA Riva API Key - Replace with your actual API key" >> .env
        echo "NVIDIA_API_KEY=your_api_key_here" >> .env
        echo "Please update .env file with your NVIDIA API key."
    else
        echo "NVIDIA_API_KEY already exists in .env file."
    fi
fi

echo "Setup completed successfully!"
echo ""
echo "To use speech recognition, run:"
echo "python speech_recognition.py --input-file <path_to_audio_file>"
echo ""
echo "Remember to update your .env file with your NVIDIA API key." 