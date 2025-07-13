#!/usr/bin/env python3
"""
Diagnostic script for PDF processing issues.

This script tests each component of the PDF processing pipeline:
1. Basic file access
2. PDF metadata extraction
3. PDF text extraction using different methods
4. Integration with DeepSeek model
"""

import os
import sys
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import file processor functions
try:
    from file_processor import process_file, get_file_metadata, extract_text_from_elements
    from integrate_with_deepseek import create_prompt_from_document, query_deepseek_model
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error("Please make sure you're in the correct directory and have installed all requirements")
    sys.exit(1)

# Try to import additional PDF libraries for direct comparison
try:
    import PyPDF2
    HAVE_PYPDF2 = True
except ImportError:
    HAVE_PYPDF2 = False
    logger.warning("PyPDF2 not available, skipping direct PDF extraction test")

try:
    from pdfminer.high_level import extract_text as pdfminer_extract_text
    HAVE_PDFMINER = True
except ImportError:
    HAVE_PDFMINER = False
    logger.warning("pdfminer.six not available, skipping pdfminer extraction test")

def check_file_access(file_path: str) -> bool:
    """Check if the file exists and is accessible."""
    path = Path(file_path)
    
    if not path.exists():
        logger.error(f"File does not exist: {file_path}")
        return False
    
    if not path.is_file():
        logger.error(f"Path is not a file: {file_path}")
        return False
    
    try:
        with open(file_path, 'rb') as f:
            # Try to read a small chunk to verify access
            f.read(1024)
        logger.info(f"File access check passed: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error accessing file: {e}")
        return False

def test_metadata_extraction(file_path: str) -> dict:
    """Test metadata extraction from the PDF."""
    logger.info("Testing metadata extraction...")
    
    try:
        metadata = get_file_metadata(file_path)
        logger.info(f"Metadata extracted: {metadata}")
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        return {}

def test_pypdf2_extraction(file_path: str) -> str:
    """Test direct text extraction using PyPDF2."""
    if not HAVE_PYPDF2:
        return "PyPDF2 not available"
    
    logger.info("Testing PyPDF2 direct extraction...")
    
    try:
        text = ""
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
        
        logger.info(f"PyPDF2 extracted {len(text)} characters")
        return text
    except Exception as e:
        logger.error(f"PyPDF2 extraction error: {e}")
        return f"Error: {str(e)}"

def test_pdfminer_extraction(file_path: str) -> str:
    """Test direct text extraction using pdfminer.six."""
    if not HAVE_PDFMINER:
        return "pdfminer.six not available"
    
    logger.info("Testing pdfminer.six direct extraction...")
    
    try:
        text = pdfminer_extract_text(file_path)
        logger.info(f"pdfminer.six extracted {len(text)} characters")
        return text
    except Exception as e:
        logger.error(f"pdfminer.six extraction error: {e}")
        return f"Error: {str(e)}"

def test_unstructured_extraction(file_path: str) -> tuple:
    """Test text extraction using unstructured library."""
    logger.info("Testing unstructured.io extraction...")
    
    try:
        start_time = time.time()
        elements = process_file(file_path)
        processing_time = time.time() - start_time
        
        if not elements:
            logger.error("No elements extracted from file")
            return [], "", processing_time
        
        logger.info(f"Extracted {len(elements)} elements in {processing_time:.2f} seconds")
        
        # Get element types
        element_types = {}
        for element in elements:
            element_type = type(element).__name__
            element_types[element_type] = element_types.get(element_type, 0) + 1
        
        logger.info(f"Element types: {element_types}")
        
        # Extract text
        text = extract_text_from_elements(elements)
        logger.info(f"Extracted {len(text)} characters of text")
        
        return elements, text, processing_time
    except Exception as e:
        logger.error(f"Unstructured extraction error: {e}")
        return [], f"Error: {str(e)}", 0

def test_deepseek_integration(document_text: str) -> str:
    """Test integration with DeepSeek model."""
    logger.info("Testing DeepSeek integration...")
    
    if not document_text:
        logger.error("No document text to send to DeepSeek")
        return "Error: No document text available"
    
    try:
        # Create a simple question
        question = "What is this document about? Provide a brief summary."
        
        # Create messages for the model
        messages = create_prompt_from_document(document_text, question)
        
        # Query the model
        response = query_deepseek_model(messages)
        
        if response:
            logger.info(f"Received response from DeepSeek ({len(response)} characters)")
            return response
        else:
            logger.error("No response received from DeepSeek")
            return "Error: No response from DeepSeek"
    except Exception as e:
        logger.error(f"DeepSeek integration error: {e}")
        return f"Error: {str(e)}"

def main():
    """Main function to run diagnostic tests."""
    if len(sys.argv) < 2:
        print("Usage: python test_pdf_processing.py <pdf_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    print(f"Running diagnostic tests on: {file_path}")
    print("-" * 50)
    
    # Test 1: File access
    if not check_file_access(file_path):
        print("File access test failed. Exiting.")
        sys.exit(1)
    
    # Test 2: Metadata extraction
    metadata = test_metadata_extraction(file_path)
    print("\nMetadata:")
    for key, value in metadata.items():
        print(f"  {key}: {value}")
    print("-" * 50)
    
    # Test 3: PyPDF2 extraction
    if HAVE_PYPDF2:
        pypdf2_text = test_pypdf2_extraction(file_path)
        print("\nPyPDF2 extraction preview:")
        print(pypdf2_text[:500] + "..." if len(pypdf2_text) > 500 else pypdf2_text)
        print(f"Total characters: {len(pypdf2_text)}")
        print("-" * 50)
    
    # Test 4: pdfminer.six extraction
    if HAVE_PDFMINER:
        pdfminer_text = test_pdfminer_extraction(file_path)
        print("\npdfminer.six extraction preview:")
        print(pdfminer_text[:500] + "..." if len(pdfminer_text) > 500 else pdfminer_text)
        print(f"Total characters: {len(pdfminer_text)}")
        print("-" * 50)
    
    # Test 5: unstructured.io extraction
    elements, unstructured_text, processing_time = test_unstructured_extraction(file_path)
    print(f"\nunstructured.io processing time: {processing_time:.2f} seconds")
    print(f"Elements extracted: {len(elements)}")
    
    if elements:
        # Print element types
        element_types = {}
        for element in elements:
            element_type = type(element).__name__
            element_types[element_type] = element_types.get(element_type, 0) + 1
        
        print("\nElement types:")
        for element_type, count in element_types.items():
            print(f"  {element_type}: {count}")
        
        # Print text preview
        print("\nunstructured.io extraction preview:")
        print(unstructured_text[:500] + "..." if len(unstructured_text) > 500 else unstructured_text)
        print(f"Total characters: {len(unstructured_text)}")
    else:
        print("No elements extracted by unstructured.io")
    
    print("-" * 50)
    
    # Test 6: DeepSeek integration
    if unstructured_text:
        print("\nTesting DeepSeek integration...")
        response = test_deepseek_integration(unstructured_text)
        print("\nDeepSeek response:")
        print(response)
    else:
        print("Skipping DeepSeek integration test due to no extracted text")
    
    print("-" * 50)
    print("Diagnostic tests completed.")

if __name__ == "__main__":
    main() 