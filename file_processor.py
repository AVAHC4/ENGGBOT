#!/usr/bin/env python3
"""
File Processor for ENGGBOT

This module provides functionality to process various document types
(PDF, DOCX, PPTX, etc.) using the unstructured.io library.
It serves as the first step in a Retrieval-Augmented Generation (RAG) pipeline.
"""

import os
import logging
from typing import List, Union, Optional
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
            elements = partition(
                filename=str(file_path),
                strategy="hi_res",
                pdf_infer_table_structure=True,
                extract_images_in_pdf=False,  # Set to True if image extraction is needed
                chunking_strategy="by_title"
            )
        else:
            # For other document types, use default settings
            elements = partition(
                filename=str(file_path),
                chunking_strategy="by_title"
            )
        
        logger.info(f"Successfully extracted {len(elements)} elements from {file_path}")
        return elements
    
    except FileNotFoundError:
        logger.error(f"File not found: {file_path}")
        return []
    except PermissionError:
        logger.error(f"Permission denied when accessing file: {file_path}")
        return []
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {str(e)}")
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
        
        return {
            "filename": file_path.name,
            "file_extension": file_path.suffix,
            "file_size_bytes": stats.st_size,
            "file_size_mb": round(stats.st_size / (1024 * 1024), 2),
            "last_modified": stats.st_mtime,
            "created": stats.st_ctime,
        }
    except Exception as e:
        logger.error(f"Error extracting metadata from {file_path}: {str(e)}")
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
        return "\n\n".join(str(element) for element in elements)
    except Exception as e:
        logger.error(f"Error extracting text from elements: {str(e)}")
        return ""


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
    elements = process_file(file_path)
    
    # Print results
    if elements:
        print(f"Successfully processed {file_path}")
        print(f"Total elements extracted: {len(elements)}")
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