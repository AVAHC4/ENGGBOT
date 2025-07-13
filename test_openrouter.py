#!/usr/bin/env python3
"""
Comprehensive OpenRouter API Test Script

This script tests various aspects of the OpenRouter API:
1. API key validation
2. Available models listing
3. Model availability check for DeepSeek
4. Simple completion test
5. Detailed error reporting

Usage:
    export OPENROUTER_API_KEY=your_actual_api_key_here
    python test_openrouter.py
"""

import os
import sys
import json
import time
import requests
from typing import Dict, Any, List, Optional

# OpenRouter API configuration
BASE_URL = "https://openrouter.ai/api/v1"
MODELS_URL = f"{BASE_URL}/models"
CHAT_URL = f"{BASE_URL}/chat/completions"

# Target model - updated to use the free DeepSeek model
TARGET_MODEL = "deepseek/deepseek-chat"  # Free model: DeepSeek: R1 0528

def get_api_key() -> str:
    """Get the OpenRouter API key from environment variables."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("ERROR: OpenRouter API key not found.")
        print("Please set the OPENROUTER_API_KEY environment variable.")
        print("Example: export OPENROUTER_API_KEY=your_actual_api_key_here")
        sys.exit(1)
    
    if api_key == "your_api_key_here" or api_key == "your_actual_api_key_here":
        print("ERROR: You are using a placeholder API key.")
        print("Please set your actual OpenRouter API key.")
        sys.exit(1)
        
    return api_key

def create_headers(api_key: str) -> Dict[str, str]:
    """Create headers for API requests."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://openrouter.ai/",
        "X-Title": "API Test"
    }

def test_api_key(api_key: str) -> bool:
    """Test if the API key is valid."""
    print("\n=== Testing API Key ===")
    
    # Display masked key
    masked_key = f"{api_key[:5]}...{api_key[-4:]}" if len(api_key) > 9 else "[too short]"
    print(f"Using API key: {masked_key}")
    
    headers = create_headers(api_key)
    
    try:
        response = requests.get(MODELS_URL, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ API key is valid")
            return True
        elif response.status_code == 401:
            print("❌ API key is invalid (Unauthorized)")
            print(f"Response: {response.text}")
            return False
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {str(e)}")
        return False

def get_available_models(api_key: str) -> Optional[List[Dict[str, Any]]]:
    """Get list of available models."""
    print("\n=== Getting Available Models ===")
    
    headers = create_headers(api_key)
    
    try:
        response = requests.get(MODELS_URL, headers=headers, timeout=10)
        
        if response.status_code == 200:
            models_data = response.json()
            models = models_data.get("data", [])
            print(f"✅ Found {len(models)} available models")
            return models
        else:
            print(f"❌ Failed to get models: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting models: {str(e)}")
        return None

def check_model_availability(models: List[Dict[str, Any]], target_model: str) -> bool:
    """Check if the target model is available."""
    print(f"\n=== Checking Availability of {target_model} ===")
    
    if not models:
        print("❌ No models data available")
        return False
    
    # Check for exact match
    exact_matches = [model for model in models if model.get("id") == target_model]
    if exact_matches:
        print(f"✅ Model {target_model} is available")
        model_info = exact_matches[0]
        print(f"   - Context window: {model_info.get('context_length', 'unknown')}")
        print(f"   - Pricing: {json.dumps(model_info.get('pricing', {}))}")
        return True
    
    # Check for partial match
    partial_matches = [model for model in models if target_model.split("/")[0] in model.get("id", "")]
    if partial_matches:
        print(f"⚠️ Exact model {target_model} not found, but found similar models:")
        for model in partial_matches:
            print(f"   - {model.get('id')}")
        return False
    
    print(f"❌ Model {target_model} is not available")
    print("Available models:")
    for model in models[:5]:  # Show first 5 models
        print(f"   - {model.get('id')}")
    if len(models) > 5:
        print(f"   - ... and {len(models) - 5} more")
    return False

def test_model_completion(api_key: str, model_name: str) -> bool:
    """Test model completion."""
    print(f"\n=== Testing Model Completion with {model_name} ===")
    
    headers = create_headers(api_key)
    
    # Create a minimal test message
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in one word."}
    ]
    
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 10
    }
    
    print("Sending request...")
    
    try:
        start_time = time.time()
        response = requests.post(CHAT_URL, headers=headers, json=payload, timeout=30)
        elapsed_time = time.time() - start_time
        
        print(f"Response time: {elapsed_time:.2f} seconds")
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
            
            # Provide guidance based on error code
            if response.status_code == 401:
                print("\nThis is an authentication error. Check that:")
                print("1. Your API key is correct")
                print("2. Your API key has not expired")
                print("3. You have sufficient credits in your account")
            elif response.status_code == 404:
                print("\nThis is a not found error. Check that:")
                print("1. The model name is correct")
                print("2. The model is available on your plan")
            elif response.status_code == 429:
                print("\nThis is a rate limit error. Try:")
                print("1. Waiting a few minutes before trying again")
                print("2. Checking your usage limits on OpenRouter dashboard")
            
            return False
    except Exception as e:
        print(f"❌ Request error: {str(e)}")
        return False

def main():
    """Main function to run the tests."""
    print("OpenRouter API Comprehensive Test")
    print("================================")
    
    # Get API key
    api_key = get_api_key()
    
    # Test API key
    if not test_api_key(api_key):
        print("\n❌ API key validation failed. Exiting.")
        return 1
    
    # Get available models
    models = get_available_models(api_key)
    if models is None:
        print("\n❌ Failed to retrieve models. Exiting.")
        return 1
    
    # Check if target model is available
    model_available = check_model_availability(models, TARGET_MODEL)
    
    # Test model completion
    completion_success = test_model_completion(api_key, TARGET_MODEL)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"API Key Valid: {'✅ Yes' if True else '❌ No'}")
    print(f"Models Retrieved: {'✅ Yes' if models is not None else '❌ No'}")
    print(f"Target Model Available: {'✅ Yes' if model_available else '⚠️ No'}")
    print(f"Model Completion: {'✅ Success' if completion_success else '❌ Failed'}")
    
    if completion_success:
        print("\n✅ All tests passed! OpenRouter API is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 