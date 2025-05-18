#!/usr/bin/env node
/**
 * Test script for NVIDIA Riva speech recognition
 * 
 * This script allows you to test the NVIDIA Riva speech recognition service with a sample audio file
 * without needing to integrate it into your application.
 * 
 * Usage:
 * node test-riva.js <path_to_audio_file>
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Check if API key is available
const API_KEY = process.env.NVIDIA_API_KEY;
if (!API_KEY) {
  console.error('Error: NVIDIA_API_KEY not found in environment variables');
  console.error('Please add your API key to the .env file');
  process.exit(1);
}

// Get audio file path from command line arguments
const audioFilePath = process.argv[2];
if (!audioFilePath) {
  console.error('Error: No audio file path provided');
  console.error('Usage: node test-riva.js <path_to_audio_file>');
  process.exit(1);
}

// Check if the file exists
if (!fs.existsSync(audioFilePath)) {
  console.error(`Error: Audio file not found at path: ${audioFilePath}`);
  process.exit(1);
}

// Check file extension to ensure it's supported
const fileExt = path.extname(audioFilePath).toLowerCase();
if (!['.wav', '.mp3', '.flac', '.opus'].includes(fileExt)) {
  console.warn(`Warning: File extension ${fileExt} may not be supported. Supported formats are WAV, MP3, FLAC, and OPUS.`);
}

// Ensure python clients repo is available
const pythonClientsPath = path.resolve(__dirname, 'python-clients');

if (!fs.existsSync(pythonClientsPath)) {
  console.log('Cloning NVIDIA Riva Python clients repository...');
  try {
    execSync(`git clone https://github.com/nvidia-riva/python-clients.git ${pythonClientsPath}`);
    console.log('Repository cloned successfully');
  } catch (error) {
    console.error('Failed to clone repository:', error.message);
    process.exit(1);
  }
}

// Check if nvidia-riva-client is installed
try {
  execSync('pip list | grep nvidia-riva-client', { stdio: 'ignore' });
  console.log('NVIDIA Riva client is already installed');
} catch (error) {
  console.log('Installing NVIDIA Riva client...');
  try {
    execSync('pip install nvidia-riva-client', { stdio: 'inherit' });
    console.log('NVIDIA Riva client installed successfully');
  } catch (error) {
    console.error('Failed to install NVIDIA Riva client:', error.message);
    process.exit(1);
  }
}

// Run the transcription command
console.log('Running transcription with NVIDIA Riva...');
console.log(`Audio file: ${audioFilePath}`);

const transcribeCommand = `python ${pythonClientsPath}/scripts/asr/transcribe_file_offline.py \
  --server grpc.nvcf.nvidia.com:443 --use-ssl \
  --metadata function-id "b702f636-f60c-4a3d-a6f4-f3568c13bd7d" \
  --metadata "authorization" "Bearer ${API_KEY}" \
  --language-code en \
  --input-file "${audioFilePath}"`;

try {
  console.log('Sending audio to NVIDIA Riva for transcription...');
  const output = execSync(transcribeCommand, { encoding: 'utf8' });
  console.log('\n========== TRANSCRIPTION RESULT ==========\n');
  console.log(output);
  console.log('\n==========================================\n');
} catch (error) {
  console.error('Transcription failed:', error.message);
  console.error('Command output:', error.stdout);
  console.error('Error output:', error.stderr);
  process.exit(1);
}

console.log('Test completed successfully!'); 