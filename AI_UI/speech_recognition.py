#!/usr/bin/env python3
"""
NVIDIA Riva Speech Recognition Integration for ENGGBOT

This module provides speech recognition capabilities using NVIDIA's Riva API.
It allows transcription of audio files and can be extended for real-time streaming.
"""

import os
import subprocess
import argparse
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("riva_speech")

# Load environment variables
load_dotenv()

class RivaSpeechClient:
    """
    Client for NVIDIA Riva speech recognition services.
    """
    def __init__(self):
        """Initialize the Riva speech client with API key from environment."""
        self.api_key = os.getenv("NVIDIA_API_KEY")
        if not self.api_key:
            logger.warning("NVIDIA_API_KEY not found in environment variables")
            
        # Check if riva client is installed
        try:
            import nvidia_riva_client
            logger.info("NVIDIA Riva client library found")
            self.client_installed = True
        except ImportError:
            logger.warning("NVIDIA Riva client not installed. Run: pip install nvidia-riva-client")
            self.client_installed = False
            
        # Check for Python client repository
        self.client_repo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "python-clients")
        if not os.path.exists(self.client_repo_path):
            logger.warning("NVIDIA Riva Python client repository not found")
            self.client_repo_available = False
        else:
            self.client_repo_available = True
            logger.info(f"Using Riva Python client repository at: {self.client_repo_path}")

    def setup(self):
        """Set up the required dependencies for Riva client."""
        if not self.client_installed:
            logger.info("Installing NVIDIA Riva client...")
            try:
                subprocess.check_call(["pip", "install", "nvidia-riva-client"])
                self.client_installed = True
                logger.info("NVIDIA Riva client installed successfully")
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to install NVIDIA Riva client: {e}")
                return False
        
        if not self.client_repo_available:
            logger.info("Downloading NVIDIA Riva Python client repository...")
            try:
                subprocess.check_call([
                    "git", "clone", 
                    "https://github.com/nvidia-riva/python-clients.git", 
                    self.client_repo_path
                ])
                self.client_repo_available = True
                logger.info("NVIDIA Riva Python client repository cloned successfully")
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to clone repository: {e}")
                return False
                
        return True

    def transcribe_file(self, input_file, language_code="en", translate=False, source_lang=None):
        """
        Transcribe an audio file using NVIDIA Riva service.
        
        Args:
            input_file: Path to the audio file (WAV, OPUS or FLAC format)
            language_code: Language code (default: "en", use "multi" for auto-detection)
            translate: Whether to translate the speech
            source_lang: Source language if translation is needed
            
        Returns:
            Transcription text or None if failed
        """
        if not self.client_installed or not self.client_repo_available:
            success = self.setup()
            if not success:
                return None
                
        if not os.path.exists(input_file):
            logger.error(f"Audio file not found: {input_file}")
            return None
            
        script_path = os.path.join(self.client_repo_path, "scripts", "asr", "transcribe_file_offline.py")
        
        if not os.path.exists(script_path):
            logger.error(f"Transcription script not found: {script_path}")
            return None
            
        # Prepare command
        cmd = [
            "python", script_path,
            "--server", "grpc.nvcf.nvidia.com:443",
            "--use-ssl",
            "--metadata", "function-id", "b702f636-f60c-4a3d-a6f4-f3568c13bd7d",
            "--metadata", "authorization", f"Bearer {self.api_key}",
            "--language-code", language_code,
            "--input-file", input_file
        ]
        
        # Add translation if requested
        if translate and source_lang:
            cmd.extend(["--custom-configuration", "task:translate"])
            cmd[cmd.index("--language-code") + 1] = source_lang
        
        try:
            logger.info(f"Transcribing audio file: {input_file}")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            # Extract transcription from output
            transcription = result.stdout.strip()
            logger.info(f"Transcription successful: {transcription[:50]}...")
            return transcription
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Transcription failed: {e}")
            logger.error(f"Error output: {e.stderr}")
            return None
            
    def test_connection(self):
        """Test connection to NVIDIA Riva service."""
        if not self.api_key:
            logger.error("API key not found. Cannot test connection.")
            return False
            
        logger.info("Testing connection to NVIDIA Riva service...")
        # We'll use a minimal command to test the connection
        cmd = [
            "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
            "-H", f"Authorization: Bearer {self.api_key}",
            "https://api.nvcf.nvidia.com/v2/endpoint"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            status_code = result.stdout.strip()
            
            if status_code == "200":
                logger.info("Successfully connected to NVIDIA Riva service")
                return True
            else:
                logger.error(f"Failed to connect to NVIDIA Riva service. Status code: {status_code}")
                logger.error(f"Response: {result.stderr}")
                return False
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Connection test failed: {e}")
            return False

def main():
    """Main function to demonstrate the functionality."""
    parser = argparse.ArgumentParser(description="NVIDIA Riva Speech Recognition")
    parser.add_argument("--input-file", required=True, help="Path to input audio file")
    parser.add_argument("--language", default="en", help="Language code (default: en)")
    parser.add_argument("--translate", action="store_true", help="Enable translation")
    parser.add_argument("--source-lang", help="Source language for translation")
    
    args = parser.parse_args()
    
    client = RivaSpeechClient()
    
    # Test connection
    if not client.test_connection():
        print("Failed to connect to NVIDIA Cloud speech recognition server.")
        return
    
    # Transcribe
    result = client.transcribe_file(
        args.input_file,
        language_code=args.language,
        translate=args.translate,
        source_lang=args.source_lang
    )
    
    if result:
        print("Transcription result:")
        print(result)
    else:
        print("Transcription failed. Check logs for details.")

if __name__ == "__main__":
    main() 