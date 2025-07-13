# OpenRouter API Setup Instructions

## Overview
This document explains how to set up and test the OpenRouter API integration for the ENGGBOT application.

## Step 1: Get an OpenRouter API Key
1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Copy your API key

## Step 2: Test Your API Key
Run the test script with your API key:

```bash
./run_test.sh YOUR_ACTUAL_API_KEY
```

For example:
```bash
./run_test.sh sk-or-v1-abc123def456...
```

## Step 3: Run the Application
If the test is successful, you can run the application:

```bash
export OPENROUTER_API_KEY=YOUR_ACTUAL_API_KEY
./run_debug.sh
```

## Troubleshooting

### Model Not Available
We've configured the application to use the free DeepSeek model (`deepseek/deepseek-chat`). If this model is not available, you may need to:

1. Check which models are available on your OpenRouter account
2. Update the model name in the following files:
   - `test_openrouter.py` (TARGET_MODEL variable)
   - `debug_openrouter.py` (TEST_MODEL variable)
   - `integrate_with_deepseek.py` (DEEPSEEK_MODEL variable)

### Authentication Errors
If you see 401 errors:
1. Verify your API key is correct
2. Make sure your OpenRouter account is active
3. Check if you have sufficient credits

### Network Issues
If you have connection timeouts:
1. Check your internet connection
2. Try again later, as the OpenRouter API might be experiencing high traffic 