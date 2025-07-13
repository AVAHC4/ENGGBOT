#!/bin/bash
# Install essential dependencies for the unstructured library

# Activate virtual environment
source venv/bin/activate

# Install core dependencies
pip install filetype backoff beautifulsoup4 chardet dataclasses-json emoji html5lib
pip install langdetect lxml nltk numpy psutil python-iso639 python-magic python-oxmsg
pip install rapidfuzz tqdm wrapt unstructured-client

# Install unstructured with minimal dependencies
pip install unstructured --no-dependencies

echo "Dependencies installed. You can now run ./run_debug.sh" 