// Test script for Judge0 Extra CE API
import fetch from 'node-fetch';

// Judge0 Extra CE API configuration
const JUDGE0_API_URL = 'https://judge0-extra-ce.p.rapidapi.com';
const JUDGE0_API_KEY = '***REMOVED***';
const JUDGE0_API_HOST = 'judge0-extra-ce.p.rapidapi.com';

// Test function to get API information
async function testJudge0ExtraCE() {
  try {
    console.log('Testing Judge0 Extra CE API...');
    
    const response = await fetch(`${JUDGE0_API_URL}/about`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': JUDGE0_API_HOST,
        'x-rapidapi-key': JUDGE0_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText}\n${text}`);
    }

    const data = await response.json();
    console.log('Judge0 Extra CE API Information:');
    console.log(JSON.stringify(data, null, 2));
    
    // Test code execution with a simple Python program
    await testCodeExecution();
    
    return data;
  } catch (error) {
    console.error('Error testing Judge0 Extra CE API:', error);
    throw error;
  }
}

// Test code execution
async function testCodeExecution() {
  try {
    console.log('\nTesting code execution...');
    
    const pythonCode = 'print("Hello from Judge0 Extra CE!")';
    const languageId = 71; // Python 3
    
    // Submit code
    console.log('Submitting code...');
    const submission = await submitCode(pythonCode, languageId);
    console.log('Submission created:', submission);
    
    // Wait for result
    console.log('Waiting for result...');
    const result = await getResult(submission.token);
    console.log('Execution result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Format output
    const formattedOutput = formatOutput(result);
    console.log('\nFormatted output:');
    console.log(formattedOutput);
    
  } catch (error) {
    console.error('Error testing code execution:', error);
  }
}

// Submit code to Judge0 Extra CE
async function submitCode(code, languageId) {
  const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': JUDGE0_API_HOST,
      'x-rapidapi-key': JUDGE0_API_KEY,
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: '',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText}\n${text}`);
  }

  return response.json();
}

// Get the result of a submission
async function getResult(token) {
  // Poll for results
  let result = null;
  let retries = 0;
  const maxRetries = 10;
  
  while (retries < maxRetries) {
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get the result
    const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': JUDGE0_API_HOST,
        'x-rapidapi-key': JUDGE0_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText}\n${text}`);
    }

    result = await response.json();
    
    // If processing is complete, break the loop
    if (result.status.id !== 1 && result.status.id !== 2) {
      break;
    }
    
    retries++;
  }
  
  if (!result) {
    throw new Error('Failed to get execution result after multiple attempts');
  }
  
  return result;
}

// Format the output for display
function formatOutput(result) {
  let output = '';
  
  // Handle different status codes
  if (result.status.id !== 3) {
    output += `Status: ${result.status.description}\n`;
    
    // Add more details based on status
    if (result.status.id === 6) {
      output += `\nCompilation Error:\n${result.compile_output || ''}`;
    } else if ([7, 8, 9, 10, 11, 12].includes(result.status.id)) {
      output += `\nRuntime Error:\n${result.stderr || result.message || ''}`;
    }
    
    return output;
  }
  
  // If execution was successful, show stdout
  if (result.stdout) {
    output += result.stdout;
  } else {
    output += "[No output]";
  }
  
  // Add execution details
  output += `\n\nExecution Time: ${result.time}s`;
  
  return output;
}

// Run the test
testJudge0ExtraCE().catch(console.error);