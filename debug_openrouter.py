#!/usr/bin/env python3
"""
Debug script for testing the OpenRouter API connection.

This script helps diagnose issues with the OpenRouter API by:
1. Testing the API key
2. Testing different model names
3. Testing with minimal content
4. Providing detailed error information

Usage:
    export OPENROUTER_API_KEY=your_api_key_here
    python debug_openrouter.py
"""

import os
import sys
import json
import requests
from typing import Dict, Any, List

# OpenRouter API configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Test with different model names
TEST_MODELS = [
    "deepseek/deepseek-coder-v1",
    "deepseek/deepseek-llm-7b-chat",
    "deepseek/deepseek-chat"
]

def get_api_key() -> str:
    """Get the OpenRouter API key from environment variables."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OpenRouter API key not found.")
        print("Please set the OPENROUTER_API_KEY environment variable.")
        print("Example: export OPENROUTER_API_KEY=your_api_key_here")
        sys.exit(1)
    return api_key

def test_api_connection() -> None:
    """Test basic connection to the OpenRouter API."""
    print("\n=== Testing OpenRouter API Connection ===")
    try:
        response = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
        if response.status_code == 200:
            print("✅ Successfully connected to OpenRouter API")
            models_data = response.json()
            print(f"Available models: {len(models_data.get('data', []))}")
            
            # Check if DeepSeek models are available
            deepseek_models = [model for model in models_data.get('data', []) 
                              if 'deepseek' in model.get('id', '').lower()]
            
            if deepseek_models:
                print("\nAvailable DeepSeek models:")
                for model in deepseek_models:
                    print(f"  - {model['id']}")
            else:
                print("\n❌ No DeepSeek models found in available models")
        else:
            print(f"❌ Connection failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Connection error: {str(e)}")

def test_model(model_name: str) -> None:
    """Test a specific model with a minimal prompt."""
    print(f"\n=== Testing Model: {model_name} ===")
    
    api_key = get_api_key()
    
    # Create a minimal test message
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, can you hear me? Please respond with a single word."}
    ]
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:3001"
    }
    
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 50
    }
    
    print("Sending test request...")
    
    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,  # Use json parameter instead of data for automatic serialization
            timeout=30
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            content = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ Success! Response: {content}")
        else:
            print(f"❌ Request failed with status code: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            print(f"Response body: {response.text}")
    except Exception as e:
        print(f"❌ Request error: {str(e)}")

def main():
    """Main function to run the tests."""
    print("OpenRouter API Debug Tool")
    print("========================")
    
    # Test basic connection
    test_api_connection()
    
    # Test each model
    for model in TEST_MODELS:
        test_model(model)
    
    print("\nDebug complete. Check the results above for any issues.")

if __name__ == "__main__":
    main() 