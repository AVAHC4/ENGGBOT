# ENGGBOT File Processor

A robust document processing module for ENGGBOT, an academic AI chatbot. This module serves as the first step in a Retrieval-Augmented Generation (RAG) pipeline.

## Features

- Process multiple document types (PDF, DOCX, PPTX, TXT, etc.)
- Extract structured content from documents
- Special high-resolution processing for academic PDFs and engineering schematics
- Extract document metadata
- Robust error handling

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd enggbot-file-processor
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. System dependencies:
   - For PDF processing: Install Tesseract OCR and Poppler
     - On Ubuntu: `sudo apt-get install -y tesseract-ocr poppler-utils`
     - On macOS: `brew install tesseract poppler`
     - On Windows: Download and install Tesseract from [here](https://github.com/UB-Mannheim/tesseract/wiki)

## Usage

### Basic Usage

```python
from file_processor import process_file

# Process a file and get structured elements
elements = process_file("path/to/your/document.pdf")

# Print the number of extracted elements
print(f"Extracted {len(elements)} elements")

# Print the first element
if elements:
    print(elements[0])
```

### Command Line Usage

You can also run the script directly from the command line:

```
python file_processor.py path/to/your/document.pdf
```

### Additional Functions

```python
from file_processor import get_file_metadata, extract_text_from_elements

# Get file metadata
metadata = get_file_metadata("path/to/your/document.pdf")
print(metadata)

# Extract plain text from elements
elements = process_file("path/to/your/document.pdf")
text = extract_text_from_elements(elements)
print(text)
```

## Supported File Types

- PDF documents (`.pdf`)
- Word documents (`.docx`, `.doc`)
- PowerPoint presentations (`.pptx`, `.ppt`)
- Excel spreadsheets (`.xlsx`, `.xls`)
- Plain text files (`.txt`)
- HTML files (`.html`, `.htm`)
- And more...

## Integration with RAG Pipeline

This file processor is designed to be the first step in a Retrieval-Augmented Generation (RAG) pipeline. The extracted elements can be:

1. Chunked for embedding
2. Stored in a vector database
3. Retrieved during query time to provide context to an LLM

## License

[MIT License](LICENSE)
