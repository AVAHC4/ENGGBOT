'use client';

import dynamic from 'next/dynamic';

// Import the CodeSandboxCompiler component with dynamic import to prevent hydration issues
const CodeSandboxCompiler = dynamic(
  () => import('@/components/code-sandbox-compiler').then(mod => mod.CodeSandboxCompiler),
  { 
    ssr: false, // Disable server-side rendering to prevent hydration mismatches
    loading: () => <div className="h-screen w-screen flex items-center justify-center bg-[#1e1e1e] text-white">Loading compiler...</div>
  }
);

export default function SandboxPage() {
  return (
    <div className="h-screen w-screen">
      <CodeSandboxCompiler />
    </div>
  );
} 