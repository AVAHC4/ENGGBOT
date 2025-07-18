// API route for code compilation using Judge0 Extra CE
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Judge0 Extra CE API configuration
const JUDGE0_API_URL = 'https://judge0-extra-ce.p.rapidapi.com';
const JUDGE0_API_KEY = '***REMOVED***';
const JUDGE0_API_HOST = 'judge0-extra-ce.p.rapidapi.com';

// Language IDs for Judge0 Extra CE API
const LANGUAGE_IDS = {
  python: 71, // Python 3
  javascript: 93, // Node.js
  java: 62, // Java (OpenJDK 13)
  c: 50, // C (GCC 9.2.0)
  cpp: 54, // C++ (GCC 9.2.0)
  csharp: 51, // C# (Mono 6.6.0)
  html: 42, // HTML/JS/CSS
  css: 42, // CSS uses the same as HTML (runs in a browser environment)
};

// POST /api/compile - Compile and run code
router.post('/', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    // Map language to Judge0 language ID
    const languageId = LANGUAGE_IDS[language] || 71; // Default to Python if not found

    // Submit code for execution
    const submission = await submitCode(code, languageId);
    
    // Wait for the result
    const result = await getResult(submission.token);
    
    // Format and return the result
    return res.status(200).json({
      output: formatOutput(result),
      exitCode: result.status.id === 3 ? 0 : 1, // 3 is "Accepted" status
    });
  } catch (error) {
    console.error('Compilation error:', error);
    return res.status(500).json({ error: `Compilation failed: ${error.message}` });
  }
});

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
  // Status descriptions
  const STATUS_DESCRIPTIONS = {
    1: 'In Queue',
    2: 'Processing',
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error (SIGSEGV)',
    8: 'Runtime Error (SIGXFSZ)',
    9: 'Runtime Error (SIGFPE)',
    10: 'Runtime Error (SIGABRT)',
    11: 'Runtime Error (NZEC)',
    12: 'Runtime Error (Other)',
    13: 'Internal Error',
    14: 'Exec Format Error',
  };

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

export default router;