#!/usr/bin/env python3
"""
Integration example for connecting the file processor with DeepSeek model.

This script demonstrates how to:
1. Process a document using the file_processor module
2. Extract text from the document
3. Send the extracted text to DeepSeek model via OpenRouter API
4. Display the AI's response

Note: You need to set your OpenRouter API key as an environment variable:
export OPENROUTER_API_KEY=your_api_key_here
"""

import os
import sys
import json
import requests
from typing import List, Dict, Any, Optional
from file_processor import process_file, extract_text_from_elements

# OpenRouter API configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Update to match the exact model name expected by OpenRouter
DEEPSEEK_MODEL = "deepseek/deepseek-chat"  # Free model: DeepSeek: R1 0528

def get_api_key() -> str:
    """Get the OpenRouter API key from environment variables."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError(
            "OpenRouter API key not found. Please set the OPENROUTER_API_KEY environment variable."
        )
    return api_key

def create_prompt_from_document(document_text: str, question: str) -> List[Dict[str, str]]:
    """
    Create a prompt for the AI model using the document text and a question.
    
    Args:
        document_text (str): The text extracted from the document
        question (str): The question to ask about the document
        
    Returns:
        List[Dict[str, str]]: The formatted messages for the AI model
    """
    # Truncate document text if it's too long (most models have a context limit)
    max_document_length = 8000  # Reduced from 14000 to be safer
    original_length = len(document_text)
    if original_length > max_document_length:
        document_text = document_text[:max_document_length] + "...[truncated]"
        print(f"Document text truncated from {original_length} to {max_document_length} characters")
    
    return [
        {
            "role": "system",
            "content": (
                "You are ENGGBOT, an academic AI assistant specialized in engineering and technical subjects. "
                "You help students understand complex topics based on the document content provided. "
                "Always base your answers on the document content. If the document doesn't contain the information, "
                "say so clearly."
            )
        },
        {
            "role": "user",
            "content": (
                f"Here is a document I'd like you to analyze:\n\n"
                f"```document\n{document_text}\n```\n\n"
                f"Question: {question}"
            )
        }
    ]

def query_deepseek_model(messages: List[Dict[str, str]]) -> Optional[str]:
    """
    Send a query to the DeepSeek model via OpenRouter API.
    
    Args:
        messages (List[Dict[str, str]]): The messages to send to the model
        
    Returns:
        Optional[str]: The model's response or None if an error occurred
    """
    try:
        # Get API key
        api_key = get_api_key()
        print(f"Using API key: {api_key[:5]}...{api_key[-4:] if len(api_key) > 8 else ''}")
        
        # Set up headers with proper HTTP-Referer
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:3001",  # Update to match your actual domain
        }
        
        # Prepare payload
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        
        # Log request details (excluding full message content for brevity)
        print(f"\nSending request to: {OPENROUTER_API_URL}")
        print(f"Using model: {DEEPSEEK_MODEL}")
        print(f"Headers: {json.dumps({k: v for k, v in headers.items() if k != 'Authorization'})}")
        print(f"Payload structure: {len(messages)} messages, temperature: {payload['temperature']}, max_tokens: {payload['max_tokens']}")
        
        # Make the API request
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            data=json.dumps(payload),
            timeout=60  # Add timeout to prevent hanging
        )
        
        # Log response details
        print(f"\nResponse status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response headers: {dict(response.headers)}")
            print(f"Error response body: {response.text}")
            return f"Error: API returned status code {response.status_code}. Details: {response.text}"
        
        # Parse response
        response_data = response.json()
        print("Response received successfully")
        
        if "choices" in response_data and len(response_data["choices"]) > 0:
            return response_data["choices"][0]["message"]["content"]
        else:
            print(f"Unexpected API response format: {json.dumps(response_data)}")
            return "Error: Unexpected API response format. Please check server logs."
            
    except requests.exceptions.RequestException as e:
        print(f"Request error: {str(e)}")
        return f"Error: Request failed. Details: {str(e)}"
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return "Error: Could not parse API response as JSON."
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return f"Error: An unexpected error occurred. Details: {str(e)}"

def main():
    """Main function to demonstrate integration with DeepSeek model."""
    # Check if a file path was provided as an argument
    if len(sys.argv) < 2:
        print("Usage: python integrate_with_deepseek.py <file_path> [question]")
        print("Example: python integrate_with_deepseek.py sample.pdf 'What is the main topic of this document?'")
        return
    
    file_path = sys.argv[1]
    
    # Get the question from command line or use a default
    question = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Summarize this document in 3-5 bullet points."
    
    print(f"Processing file: {file_path}")
    print(f"Question: {question}")
    print("-" * 50)
    
    # Process the file
    elements = process_file(file_path)
    
    if not elements:
        print("No elements extracted from the file. Please check the file and try again.")
        return
    
    print(f"Successfully extracted {len(elements)} elements from the document.")
    
    # Extract text from elements
    document_text = extract_text_from_elements(elements)
    print(f"Extracted {len(document_text)} characters of text.")
    
    # Create prompt for the AI model
    messages = create_prompt_from_document(document_text, question)
    
    print("\nSending query to DeepSeek model...")
    
    # Query the model
    response = query_deepseek_model(messages)
    
    if response:
        print("\nDeepSeek Response:")
        print("-" * 50)
        print(response)
        print("-" * 50)
    else:
        print("\nFailed to get a response from the DeepSeek model.")
    
    print("\nIntegration test completed.")

if __name__ == "__main__":
    main() 