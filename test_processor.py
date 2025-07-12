#!/usr/bin/env python3
"""
Test script for the file processor module.
This script demonstrates how to use the file_processor.py module.
"""

import os
import sys
from file_processor import process_file, get_file_metadata, extract_text_from_elements

def create_sample_text_file():
    """Create a sample text file for testing if no files are available."""
    sample_content = """# Sample Document for ENGGBOT

## Introduction
This is a sample document created for testing the ENGGBOT file processor.

## Features
- Process multiple document types
- Extract structured content
- Robust error handling

## Code Example
```python
def hello_world():
    print("Hello, ENGGBOT!")
```

## Table Example
| Name | Value |
|------|-------|
| Item 1 | 100 |
| Item 2 | 200 |
| Item 3 | 300 |

Thank you for using ENGGBOT!
"""
    
    with open("sample.txt", "w") as f:
        f.write(sample_content)
    
    print("Created sample.txt for testing")
    return "sample.txt"

def main():
    """Main function to demonstrate file processor usage."""
    # Check if a file path was provided as an argument
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Look for existing sample files
        sample_files = [
            "sample.pdf",
            "sample.docx",
            "sample.pptx",
            "sample.txt"
        ]
        
        # Find the first sample file that exists
        file_path = next((f for f in sample_files if os.path.exists(f)), None)
        
        # If no sample files exist, create one
        if file_path is None:
            file_path = create_sample_text_file()
    
    print(f"Testing file processor with: {file_path}")
    print("-" * 50)
    
    # Get file metadata
    print("STEP 1: Getting file metadata")
    metadata = get_file_metadata(file_path)
    print("File metadata:")
    for key, value in metadata.items():
        print(f"  {key}: {value}")
    print("-" * 50)
    
    # Process the file
    print("STEP 2: Processing file")
    elements = process_file(file_path)
    
    if not elements:
        print("No elements extracted. Please check the file and try again.")
        return
    
    print(f"Successfully extracted {len(elements)} elements")
    
    # Print element types distribution
    element_types = {}
    for element in elements:
        element_type = type(element).__name__
        element_types[element_type] = element_types.get(element_type, 0) + 1
    
    print("\nElement types distribution:")
    for element_type, count in element_types.items():
        print(f"  {element_type}: {count}")
    
    # Print first few elements
    print("\nFirst 3 elements (preview):")
    for i, element in enumerate(elements[:3]):
        print(f"\nElement {i+1} ({type(element).__name__}):")
        print(f"  {str(element)[:150]}..." if len(str(element)) > 150 else str(element))
    
    print("-" * 50)
    
    # Extract all text
    print("STEP 3: Extracting all text")
    all_text = extract_text_from_elements(elements)
    print(f"Extracted {len(all_text)} characters of text")
    
    # Print text preview
    preview_length = min(500, len(all_text))
    print(f"\nText preview ({preview_length} characters):")
    print(all_text[:preview_length] + "..." if len(all_text) > preview_length else all_text)
    
    print("-" * 50)
    print("Test completed successfully!")

if __name__ == "__main__":
    main() 