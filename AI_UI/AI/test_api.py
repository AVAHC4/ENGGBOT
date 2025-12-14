#!/usr/bin/env python3
"""
Test script for DeepSeek-R1 via Chutes AI

This script tests the connection to the Chutes AI API with the DeepSeek-R1 model.
"""

from chutes_ai_client import ChutesAIClient
import asyncio

import os

async def test_async():
    # Initialize the AI client
    print("Initializing DeepSeek-R1 Chat via Chutes AI...")
    api_key = os.environ.get("CHUTES_API_KEY", "")
    client = ChutesAIClient(api_key=api_key, default_model="deepseek-ai/DeepSeek-R1-0528")
    
    # Test prompt
    prompt = "Tell me a short joke about programming."
    print(f"\nSending test prompt: '{prompt}'\n")
    
    # Use the invoke_chute method
    print("DeepSeek response:")
    await client.invoke_chute(
        prompt=prompt,
        model=client.default_model,
        temperature=0.7,
        max_tokens=1024
    )
    print("\n\nTest completed!")

def test_sync():
    # Initialize the AI client
    print("Initializing DeepSeek-R1 Chat via Chutes AI...")
    api_key = os.environ.get("CHUTES_API_KEY", "")
    client = ChutesAIClient(api_key=api_key, default_model="deepseek-ai/DeepSeek-R1-0528")
    
    # Test prompt
    prompt = "Tell me a short joke about programming."
    print(f"\nSending test prompt: '{prompt}'\n")
    
    # Generate response
    print("DeepSeek response:")
    response = client.generate(
        prompt=prompt,
        temperature=0.7,
        max_tokens=1024,
        model=client.default_model,
        stream=True,
        thinking_mode=False
    )
    print("\n\nTest completed!")

if __name__ == "__main__":
    print("Running synchronous test...\n")
    test_sync()
    
    print("\n" + "-"*50)
    
    print("\nRunning asynchronous test...\n")
    asyncio.run(test_async())
