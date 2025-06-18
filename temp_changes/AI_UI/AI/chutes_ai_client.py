"""
AI Client for Chutes AI

Access DeepSeek-R1, DeepSeek-V3, and other models using Chutes AI API.
"""

import os
import requests
import json
import aiohttp
import asyncio

class ChutesAIClient:
    def __init__(self, api_key=None, default_model="deepseek-ai/DeepSeek-R1-0528"):
        """Initialize the AI client with your API key."""
        # Use API key from parameter or fall back to provided key
        self.api_key = api_key or "***REMOVED***"
        
        if not self.api_key:
            raise ValueError("No API key provided.")
            
        # Use Chutes AI endpoint
        self.api_url = "https://llm.chutes.ai/v1/chat/completions"
        self.default_model = default_model
        
        # Headers for making requests
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Available models
        self.available_models = {
            "deepseek-r1": "deepseek-ai/DeepSeek-R1-0528",
            "deepseek-v3": "deepseek-ai/DeepSeek-V3-0324",
            "deepseek-lite": "deepseek-ai/DeepSeek-Lite",
            "mistral": "mistralai/Mistral-7B-Instruct-v0.2"
        }
        
        print(f"Initialized Chutes AI client with model: {default_model}")
        print(f"Using API key: {self.api_key[:10]}...")
    
    def list_models(self):
        """List available models."""
        print("Available models:")
        for key, model in self.available_models.items():
            print(f"- {key}: {model}")
    
    def switch_model(self, model_key):
        """Switch to a different model."""
        if model_key in self.available_models:
            self.default_model = self.available_models[model_key]
            print(f"Switched to model: {self.default_model}")
            return True
        else:
            print(f"Model key '{model_key}' not found. Available keys: {list(self.available_models.keys())}")
            return False
    
    def generate(self, prompt, model=None, temperature=0.7, max_tokens=500, stream=False, thinking_mode=False):
        """
        Generate a response from the AI model.
        
        Args:
            prompt (str): The text prompt to send to the model
            model (str): The model to use (defaults to self.default_model)
            temperature (float): Controls randomness (lower = more deterministic)
            max_tokens (int): Maximum tokens to generate
            stream (bool): Whether to stream the response
            thinking_mode (bool): Whether to ask the model to show its thinking
            
        Returns:
            str: The generated text
        """
        # Use specified model or default
        model_name = model or self.default_model
        
        # Modify prompt to encourage thinking if thinking_mode is enabled
        actual_prompt = prompt
        if thinking_mode:
            if "?" in prompt:
                actual_prompt = prompt + " Please think step by step and show your reasoning process."
            else:
                actual_prompt = prompt + " Please think step by step and explain your thought process."
        
        # Prepare the payload
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": actual_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        try:
            # Make the API call
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                stream=stream
            )
            
            # Handle streaming responses
            if stream and response.status_code == 200:
                collected_chunks = []
                # Print chunks as they come in
                for chunk in response.iter_lines():
                    if chunk:
                        chunk_str = chunk.decode('utf-8')
                        if chunk_str.startswith("data: "):
                            try:
                                chunk_data = json.loads(chunk_str[6:])
                                if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                    content = chunk_data["choices"][0].get("delta", {}).get("content", "")
                                    if content:
                                        print(content, end="", flush=True)
                                        collected_chunks.append(content)
                            except json.JSONDecodeError:
                                if chunk_str != "data: [DONE]":
                                    print(f"Error parsing: {chunk_str}")
                
                return "".join(collected_chunks)
            
            # Handle regular (non-streaming) responses
            elif response.status_code == 200:
                result = response.json()
                if "choices" in result and len(result["choices"]) > 0:
                    return result["choices"][0]["message"]["content"]
                else:
                    return "No content returned from the API."
            
            # Handle errors
            else:
                error_msg = f"Error {response.status_code}: {response.text}"
                print(error_msg)
                return f"API Error: {error_msg}"
                
        except Exception as e:
            print(f"Exception: {str(e)}")
            return f"Error: {str(e)}" 
    
    async def generate_async(self, prompt, model=None, temperature=0.7, max_tokens=1024, stream=True, thinking_mode=False):
        """
        Generate a response from the AI model asynchronously.
        
        Args:
            prompt (str): The text prompt to send to the model
            model (str): The model to use (defaults to self.default_model)
            temperature (float): Controls randomness (lower = more deterministic)
            max_tokens (int): Maximum tokens to generate
            stream (bool): Whether to stream the response
            thinking_mode (bool): Whether to ask the model to show its thinking
            
        Returns:
            async generator yielding generated text chunks
        """
        # Use specified model or default
        model_name = model or self.default_model
        
        # Modify prompt to encourage thinking if thinking_mode is enabled
        actual_prompt = prompt
        if thinking_mode:
            if "?" in prompt:
                actual_prompt = prompt + " Please think step by step and show your reasoning process."
            else:
                actual_prompt = prompt + " Please think step by step and explain your thought process."
        
        # Prepare the payload
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": actual_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        try:
            # Make the API call asynchronously
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200 and stream:
                        collected_chunks = []
                        async for line in response.content:
                            line = line.decode("utf-8").strip()
                            if line.startswith("data: "):
                                data = line[6:]
                                if data == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data)
                                    if "choices" in chunk and len(chunk["choices"]) > 0:
                                        content = chunk["choices"][0].get("delta", {}).get("content", "")
                                        if content:
                                            print(content, end="", flush=True)
                                            collected_chunks.append(content)
                                            yield content
                                except json.JSONDecodeError:
                                    print(f"Error parsing chunk: {data}")
                    elif response.status == 200:
                        result = await response.json()
                        if "choices" in result and len(result["choices"]) > 0:
                            content = result["choices"][0]["message"]["content"]
                            yield content
                        else:
                            error = "No content returned from the API."
                            yield error
                    else:
                        error_text = await response.text()
                        error_msg = f"Error {response.status}: {error_text}"
                        print(error_msg)
                        yield f"API Error: {error_msg}"
        except Exception as e:
            error = f"Error: {str(e)}"
            print(error)
            yield error
            
    async def invoke_chute(self, prompt, model=None, temperature=0.7, max_tokens=1024):
        """
        Invoke Chutes AI with the given prompt and stream the response.
        
        Args:
            prompt (str): The text prompt to send to the model
            model (str): The model to use (defaults to self.default_model)
            temperature (float): Controls randomness (lower = more deterministic)
            max_tokens (int): Maximum tokens to generate
            
        Returns:
            None: Prints the response to stdout
        """
        # Use specified model or default
        model_name = model or self.default_model
        
        # Prepare headers and payload
        headers = self.headers
        
        body = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": True,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.api_url, 
                headers=headers,
                json=body
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Error {response.status}: {error_text}")
                    return
                    
                async for line in response.content:
                    line = line.decode("utf-8").strip()
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            if data.strip():
                                json_data = json.loads(data)
                                if "choices" in json_data and len(json_data["choices"]) > 0:
                                    content = json_data["choices"][0].get("delta", {}).get("content", "")
                                    if content:
                                        print(content, end="", flush=True)
                        except Exception as e:
                            print(f"Error parsing chunk: {e}")