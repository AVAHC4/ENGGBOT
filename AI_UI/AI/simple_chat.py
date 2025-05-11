#!/usr/bin/env python3
"""
Simple Interactive Chat with DeepSeek via Chutes AI

This script provides a simple command-line interface to chat with DeepSeek models
via Chutes AI's API service.

Required packages:
- requests (for API calls): pip install requests
- python-dotenv (optional, for environment variables): pip install python-dotenv

To install the required package, run:
    pip install requests
"""

from chutes_ai_client import ChutesAIClient
import os
import sys
import time

def clear_screen():
    """Clear the terminal screen for better readability."""
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    # Initialize the AI client with specific API key and model
    print("Initializing DeepSeek Chat via Chutes AI...")
    api_key = "cpk_a34282f96bea4121bd8c430963015100.7924e8ecfc335db893f67722cc4a7524.xtJqaGx5ECdG7mgciB94Os4duFECB0Sy"
    client = ChutesAIClient(api_key=api_key, default_model="deepseek-ai/DeepSeek-V3-0324")
    
    # Show available models
    print("\nMain Model: deepseek-ai/DeepSeek-V3-0324")
    print("\nOther available models on Chutes AI:")
    for key, model in client.available_models.items():
        print(f"- {key}: {model}")
    
    print("\nDeepSeek Chat Interface")
    print("=======================")
    print("Type 'exit', 'quit', or 'bye' to end the conversation")
    print("Type 'switch model' to change the model")
    print("Type 'clear' to clear the conversation history")
    print("Type 'stream' to toggle streaming mode")
    print("Type 'think' to toggle thinking mode")
    print("Let's start chatting!\n")
    
    # Default to non-streaming mode and thinking mode off
    streaming_enabled = False
    thinking_enabled = False
    
    while True:
        # Get user input
        user_input = input("\nYou: ")
        
        # Check for exit commands
        if user_input.lower() in ['exit', 'quit', 'bye']:
            print("\nGoodbye! Thanks for chatting.")
            break
            
        # Check for other commands
        elif user_input.lower() == 'switch model':
            print("\nAvailable models:")
            models = list(client.available_models.keys())
            for i, model in enumerate(models):
                print(f"{i+1}. {model}")
            try:
                choice = int(input("\nSelect model number: "))
                model_key = models[choice-1]
                client.switch_model(model_key)
            except (ValueError, IndexError):
                print("Invalid selection. Keeping current model.")
                
        elif user_input.lower() == 'clear':
            clear_screen()
            print("DeepSeek Chat Interface")
            print("=======================")
            continue
            
        elif user_input.lower() == 'stream':
            streaming_enabled = not streaming_enabled
            print(f"\nStreaming mode: {'ENABLED' if streaming_enabled else 'DISABLED'}")
            continue
            
        elif user_input.lower() == 'think':
            thinking_enabled = not thinking_enabled
            print(f"\nThinking mode: {'ENABLED' if thinking_enabled else 'DISABLED'}")
            if thinking_enabled:
                print("DeepSeek will now show its reasoning process when answering.")
            else:
                print("DeepSeek will now provide direct answers without showing its reasoning.")
            continue
            
        # Skip empty inputs
        elif not user_input.strip():
            continue
            
        # Process normal chat input
        else:
            if not streaming_enabled:
                print("\nDeepSeek is thinking...")
                
                # Start timing the response
                start_time = time.time()
                
                # Generate response
                response = client.generate(
                    prompt=user_input,
                    temperature=0.7,
                    max_tokens=1024,
                    model=client.default_model,
                    stream=False,
                    thinking_mode=thinking_enabled
                )
                
                # Calculate elapsed time
                elapsed_time = time.time() - start_time
                
                # Display the AI's response
                print("\nDeepSeek: " + response)
                
                # Display the response time
                print(f"\n[Response time: {elapsed_time:.2f} seconds]")
            else:
                print("\nDeepSeek: ", end="", flush=True)
                
                # Start timing the response
                start_time = time.time()
                
                # Generate streaming response
                response = client.generate(
                    prompt=user_input,
                    temperature=0.7,
                    max_tokens=1024,
                    model=client.default_model,
                    stream=True,
                    thinking_mode=thinking_enabled
                )
                
                # Calculate elapsed time
                elapsed_time = time.time() - start_time
                
                # Display the response time
                print(f"\n\n[Response time: {elapsed_time:.2f} seconds]")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nChat session ended by user. Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        sys.exit(1) 