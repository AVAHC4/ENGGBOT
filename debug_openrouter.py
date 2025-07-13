#!/usr/bin/env python3
"""
Simplified debug script for testing the OpenRouter API connection.

This script helps diagnose issues with the OpenRouter API by:
1. Testing the API key
2. Testing the model name format
3. Providing detailed error information

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

# Test with the free DeepSeek model
TEST_MODEL = "deepseek/deepseek-chat"  # Free model: DeepSeek: R1 0528

def get_api_key() -> str:
    """Get the OpenRouter API key from environment variables."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OpenRouter API key not found.")
        print("Please set the OPENROUTER_API_KEY environment variable.")
        print("Example: export OPENROUTER_API_KEY=your_api_key_here")
        sys.exit(1)
    return api_key

def test_api_connection() -> bool:
    """Test basic connection to the OpenRouter API."""
    print("\n=== Testing OpenRouter API Connection ===")
    try:
        api_key = get_api_key()
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        print(f"Using API key: {api_key[:5]}...{api_key[-4:] if len(api_key) > 8 else ''}")
        response = requests.get("https://openrouter.ai/api/v1/models", headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ Successfully connected to OpenRouter API")
            return True
        else:
            print(f"❌ Connection failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {str(e)}")
        return False

def test_model() -> bool:
    """Test the model with a minimal prompt."""
    print(f"\n=== Testing Model: {TEST_MODEL} ===")
    
    api_key = get_api_key()
    
    # Create a minimal test message
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, respond with a single word: 'Working'"}
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://openrouter.ai/",  # Updated this to match OpenRouter's domain
        "X-Title": "API Test"  # Added title for better tracking
    }
    
    payload = {
        "model": TEST_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 10
    }
    
    print("Sending test request...")
    print(f"Headers: {json.dumps({k: v for k, v in headers.items() if k != 'Authorization'})}")
    print(f"Payload: {json.dumps(payload)}")
    
    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            content = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ Success! Response: {content}")
            return True
        else:
            print(f"❌ Request failed with status code: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            print(f"Response body: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Request error: {str(e)}")
        return False

def main():
    """Main function to run the tests."""
    print("OpenRouter API Debug Tool (Simplified)")
    print("====================================")
    
    # Test basic connection
    connection_ok = test_api_connection()
    
    # Test model
    model_ok = test_model()
    
    if connection_ok and model_ok:
        print("\n✅ All tests passed! OpenRouter API is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 