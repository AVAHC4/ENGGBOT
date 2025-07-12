#!/usr/bin/env python3
"""
File Processor for ENGGBOT

This module provides functionality to process various document types
(PDF, DOCX, PPTX, etc.) using the unstructured.io library.
It serves as the first step in a Retrieval-Augmented Generation (RAG) pipeline.
"""

import os
import logging
import time
import traceback
from typing import List, Union, Optional, Dict, Any
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from unstructured.partition.auto import partition
    from unstructured.documents.elements import Element
    from unstructured.partition.pdf import partition_pdf
    from unstructured.cleaners.core import clean_extra_whitespace, replace_unicode_quotes
except ImportError:
    logger.error("Required packages not installed. Please install with: pip install -r requirements.txt")
    raise


def process_file(file_path: str) -> List[Element]:
    """
    Process a file using unstructured.io library and return a list of elements.
    
    Args:
        file_path (str): Path to the file to be processed
        
    Returns:
        List[Element]: List of unstructured Element objects extracted from the document
                      Returns empty list if processing fails
    """
    try:
        start_time = time.time()
        file_path = Path(file_path)
        
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return []
        
        logger.info(f"Processing file: {file_path}")
        
        # Get file extension to determine processing strategy
        file_extension = file_path.suffix.lower()
        
        # Special handling for PDF files - use hi_res strategy
        if file_extension == '.pdf':
            logger.info("Using hi_res strategy for PDF processing")
            try:
                # First try with hi_res strategy
                elements = partition_pdf(
                    filename=str(file_path),
                    strategy="hi_res",
                    infer_table_structure=True,
                    extract_images=False,  # Set to True if image extraction is needed
                    chunking_strategy="by_title",
                    max_pages=100  # Limit number of pages for very large PDFs
                )
                
                # If no elements were extracted, try with fast strategy
                if not elements:
                    logger.warning("Hi-res strategy yielded no elements, falling back to fast strategy")
                    elements = partition_pdf(
                        filename=str(file_path),
                        strategy="fast",
                        infer_table_structure=True,
                        extract_images=False,
                        chunking_strategy="by_title"
                    )
            except Exception as pdf_error:
                logger.error(f"Error with PDF-specific processing: {str(pdf_error)}")
                logger.info("Falling back to generic partition method")
                # Fall back to generic partition method
                elements = partition(
                    filename=str(file_path),
                    chunking_strategy="by_title"
                )
        else:
            # For other document types, use default settings
            elements = partition(
                filename=str(file_path),
                chunking_strategy="by_title"
            )
        
        # Clean the extracted elements
        cleaned_elements = []
        for element in elements:
            try:
                # Apply text cleaning functions
                if hasattr(element, 'text'):
                    element.text = clean_extra_whitespace(element.text)
                    element.text = replace_unicode_quotes(element.text)
                cleaned_elements.append(element)
            except Exception as clean_error:
                logger.warning(f"Error cleaning element: {str(clean_error)}")
                cleaned_elements.append(element)  # Add original element
        
        processing_time = time.time() - start_time
        logger.info(f"Successfully extracted {len(cleaned_elements)} elements from {file_path} in {processing_time:.2f} seconds")
        return cleaned_elements
    
    except FileNotFoundError:
        logger.error(f"File not found: {file_path}")
        return []
    except PermissionError:
        logger.error(f"Permission denied when accessing file: {file_path}")
        return []
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {str(e)}")
        logger.error(traceback.format_exc())
        return []


def get_file_metadata(file_path: str) -> dict:
    """
    Extract metadata from a file.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        dict: Dictionary containing file metadata
    """
    try:
        file_path = Path(file_path)
        
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return {}
        
        stats = file_path.stat()
        
        # Try to get page count for PDF files
        page_count = None
        if file_path.suffix.lower() == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    page_count = len(pdf_reader.pages)
            except Exception as e:
                logger.warning(f"Could not get PDF page count: {str(e)}")
        
        metadata = {
            "filename": file_path.name,
            "file_extension": file_path.suffix,
            "file_size_bytes": stats.st_size,
            "file_size_mb": round(stats.st_size / (1024 * 1024), 2),
            "last_modified": stats.st_mtime,
            "created": stats.st_ctime,
        }
        
        # Add page count if available
        if page_count is not None:
            metadata["page_count"] = page_count
            
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata from {file_path}: {str(e)}")
        logger.error(traceback.format_exc())
        return {}


def extract_text_from_elements(elements: List[Element]) -> str:
    """
    Extract plain text from a list of Element objects.
    
    Args:
        elements (List[Element]): List of unstructured Element objects
        
    Returns:
        str: Concatenated text from all elements
    """
    try:
        # Join elements with double newlines for better separation
        text = "\n\n".join(str(element) for element in elements)
        
        # Clean up the text
        text = clean_extra_whitespace(text)
        text = replace_unicode_quotes(text)
        
        return text
    except Exception as e:
        logger.error(f"Error extracting text from elements: {str(e)}")
        logger.error(traceback.format_exc())
        return ""


def get_element_types(elements: List[Element]) -> Dict[str, int]:
    """
    Get a count of each element type in the document.
    
    Args:
        elements (List[Element]): List of unstructured Element objects
        
    Returns:
        Dict[str, int]: Dictionary with element type counts
    """
    element_types = {}
    for element in elements:
        element_type = type(element).__name__
        element_types[element_type] = element_types.get(element_type, 0) + 1
    return element_types


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        # Use a sample file for demonstration
        sample_files = [
            "sample.pdf",
            "sample.docx",
            "sample.pptx",
            "sample.txt"
        ]
        
        # Find the first sample file that exists
        file_path = next((f for f in sample_files if os.path.exists(f)), None)
        
        if file_path is None:
            print("No sample files found. Please provide a file path as an argument.")
            print("Example: python file_processor.py path/to/document.pdf")
            sys.exit(1)
    
    # Process the file
    print(f"Processing file: {file_path}")
    start_time = time.time()
    elements = process_file(file_path)
    processing_time = time.time() - start_time
    
    # Print results
    if elements:
        print(f"Successfully processed {file_path}")
        print(f"Total elements extracted: {len(elements)}")
        print(f"Processing time: {processing_time:.2f} seconds")
        
        # Get element type distribution
        element_types = get_element_types(elements)
        print("\nElement type distribution:")
        for element_type, count in element_types.items():
            print(f"  {element_type}: {count}")
        
        print("\nFirst element type:", type(elements[0]).__name__)
        print("\nFirst element content:")
        print("-" * 50)
        print(str(elements[0]))
        print("-" * 50)
        
        # Get and print metadata
        metadata = get_file_metadata(file_path)
        print("\nFile Metadata:")
        for key, value in metadata.items():
            print(f"{key}: {value}")
    else:
        print(f"Failed to process {file_path}") 