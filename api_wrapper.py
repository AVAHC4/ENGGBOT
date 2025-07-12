#!/usr/bin/env python3
"""
API Wrapper for the ENGGBOT File Processor

This module provides a FastAPI-based API to expose the file processing functionality.
It can be integrated with your existing AI chatbot application.
"""

import os
import tempfile
import shutil
import uuid
import traceback
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from file_processor import process_file, get_file_metadata, extract_text_from_elements

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ENGGBOT File Processor API",
    description="API for processing files for the ENGGBOT academic AI chatbot",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a temporary directory for uploaded files
UPLOAD_DIR = Path(tempfile.gettempdir()) / "enggbot_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Define response models
class ProcessingResponse(BaseModel):
    file_id: str
    filename: str
    status: str
    message: str
    metadata: Dict[str, Any]
    text_preview: str
    element_count: int
    processing_time: float

class ProcessingError(BaseModel):
    error: str
    detail: Optional[str] = None

# Dictionary to store processing results
processing_results = {}

# Add middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds()
    
    logger.info(
        f"Request: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Process time: {process_time:.4f}s"
    )
    return response

def cleanup_old_files(max_age_hours: int = 24):
    """
    Clean up files older than the specified age.
    
    Args:
        max_age_hours (int): Maximum age of files in hours
    """
    now = datetime.now().timestamp()
    max_age_seconds = max_age_hours * 3600
    
    for file_path in UPLOAD_DIR.glob("*"):
        if file_path.is_file():
            file_age = now - file_path.stat().st_mtime
            if file_age > max_age_seconds:
                try:
                    file_path.unlink()
                    logger.info(f"Deleted old file: {file_path}")
                except Exception as e:
                    logger.error(f"Error deleting old file {file_path}: {e}")

@app.post("/process-file/", response_model=ProcessingResponse)
async def process_uploaded_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Process an uploaded file and extract its content.
    
    Args:
        file (UploadFile): The file to process
        
    Returns:
        ProcessingResponse: Information about the processed file
    """
    # Generate a unique ID for this file
    file_id = str(uuid.uuid4())
    
    # Create a path for the uploaded file
    file_path = UPLOAD_DIR / f"{file_id}_{file.filename}"
    
    logger.info(f"Processing file: {file.filename} (size: {file.size if hasattr(file, 'size') else 'unknown'} bytes)")
    
    try:
        # Start timing
        start_time = datetime.now()
        
        # Save the uploaded file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        logger.info(f"File saved to: {file_path}")
        
        # Process the file
        logger.info(f"Starting file processing with unstructured.io")
        elements = process_file(str(file_path))
        
        if not elements:
            logger.warning(f"No elements extracted from file: {file.filename}")
            raise HTTPException(
                status_code=422,
                detail=f"Could not extract content from file: {file.filename}"
            )
        
        # Get file metadata
        metadata = get_file_metadata(str(file_path))
        
        # Extract text
        logger.info(f"Extracting text from {len(elements)} elements")
        full_text = extract_text_from_elements(elements)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Processing completed in {processing_time:.2f} seconds")
        
        # Create response
        response = {
            "file_id": file_id,
            "filename": file.filename,
            "status": "success",
            "message": f"Successfully processed {file.filename}",
            "metadata": metadata,
            "text_preview": full_text[:500] + "..." if len(full_text) > 500 else full_text,
            "element_count": len(elements),
            "processing_time": processing_time
        }
        
        # Store the full text for later retrieval
        processing_results[file_id] = {
            "filename": file.filename,
            "full_text": full_text,
            "elements": elements,
            "metadata": metadata,
            "processed_at": datetime.now().isoformat(),
        }
        
        # Schedule cleanup of old files
        background_tasks.add_task(cleanup_old_files)
        
        return response
    
    except Exception as e:
        # Log the full error with traceback
        logger.error(f"Error processing file {file.filename}: {str(e)}")
        logger.error(traceback.format_exc())
        
        # If an error occurs, clean up the file and raise an exception
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Deleted file after error: {file_path}")
            except Exception as del_err:
                logger.error(f"Error deleting file {file_path}: {str(del_err)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

class TextRequest(BaseModel):
    file_id: str

@app.post("/get-text/", response_model=Dict[str, Any])
async def get_full_text(request: TextRequest):
    """
    Get the full extracted text for a previously processed file.
    
    Args:
        request (TextRequest): Request containing the file_id
        
    Returns:
        Dict[str, Any]: The full extracted text and metadata
    """
    file_id = request.file_id
    logger.info(f"Text requested for file_id: {file_id}")
    
    if file_id not in processing_results:
        logger.warning(f"File ID not found: {file_id}")
        raise HTTPException(
            status_code=404,
            detail=f"No processed file found with ID: {file_id}"
        )
    
    result = processing_results[file_id]
    logger.info(f"Returning text for {result['filename']} ({len(result['full_text'])} characters)")
    
    return {
        "file_id": file_id,
        "filename": result["filename"],
        "full_text": result["full_text"],
        "metadata": result["metadata"],
        "processed_at": result["processed_at"],
    }

@app.get("/health/")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Dict[str, str]: Health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "files_processed": len(processing_results)
    }

# Error handler for uncaught exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    
    # Run the API server
    logger.info("Starting ENGGBOT File Processor API server")
    uvicorn.run(
        "api_wrapper:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    ) 