#!/bin/bash

# Set environment variables
export NGC_API_KEY="***REMOVED***"

# Login to NVIDIA Container Registry
echo "Logging into NVIDIA Container Registry..."
docker login nvcr.io -u $oauthtoken -p "$NGC_API_KEY"

# Run the Riva ASR container
echo "Starting Riva ASR container..."
docker run -it --rm --name=riva-asr \
   --runtime=nvidia \
   --gpus '"device=0"' \
   --shm-size=8GB \
   -e NGC_API_KEY \
   -e NIM_HTTP_API_PORT=9000 \
   -e NIM_GRPC_API_PORT=50051 \
   -p 9000:9000 \
   -p 50051:50051 \
   -e NIM_TAGS_SELECTOR=name=whisper-large-v3 \
   nvcr.io/nim/nvidia/riva-asr:1.3.0 