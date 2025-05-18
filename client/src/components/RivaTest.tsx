import React, { useState, useEffect } from 'react';

export default function RivaTest() {
  const [status, setStatus] = useState<string>('Loading...');
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testRivaConnection() {
      try {
        const response = await fetch('/api/test-riva');
        const data = await response.json();
        
        setDetails(data);
        
        if (data.status === 'success' && data.apiKeyValid) {
          setStatus('NVIDIA Riva is properly configured and ready to use');
        } else if (data.status === 'success' && !data.apiKeyValid) {
          setStatus('NVIDIA Riva tools are available but the API key may be invalid');
          setError('API key validation failed. Check your key.');
        } else if (data.status === 'warning') {
          setStatus('Warning: Unexpected response from NVIDIA Riva API');
          setError(data.message);
        } else {
          setStatus('Error: Failed to verify NVIDIA Riva configuration');
          setError(data.error || data.details || 'Unknown error');
        }
      } catch (e) {
        console.error('Failed to test NVIDIA Riva connection:', e);
        setStatus('Error: Failed to connect to test endpoint');
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    testRivaConnection();
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-zinc-900 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-white mb-6">NVIDIA Riva Connection Test</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              status.startsWith('NVIDIA Riva is properly configured') 
                ? 'bg-green-500' 
                : status.startsWith('Warning') 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
            }`}></div>
            <h2 className="text-xl font-semibold text-white">{status}</h2>
          </div>
          
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-800 rounded text-red-200 text-sm">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          {details && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold text-white">Configuration Details:</h3>
              <div className="bg-zinc-800 p-4 rounded-md">
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Python Version:</span>
                    <span className="text-white font-mono">{details.pythonVersion || 'Unknown'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Python Clients Available:</span>
                    <span className={`font-semibold ${details.pythonClientsAvailable ? 'text-green-400' : 'text-red-400'}`}>
                      {details.pythonClientsAvailable ? 'Yes' : 'No'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">API Key Valid:</span>
                    <span className={`font-semibold ${details.apiKeyValid ? 'text-green-400' : 'text-red-400'}`}>
                      {details.apiKeyValid ? 'Yes' : 'No'}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">API Status Code:</span>
                    <span className="text-white font-mono">{details.statusCode || 'N/A'}</span>
                  </li>
                </ul>
              </div>
              
              <div className="pt-4">
                <a 
                  href="https://www.nvidia.com/en-us/ai/riva/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Learn more about NVIDIA Riva
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 