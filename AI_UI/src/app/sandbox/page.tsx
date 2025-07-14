'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import the CodeSandboxCompiler component with dynamic import to prevent hydration issues
const DynamicCompiler = dynamic(
  () => import('@/components/code-sandbox-compiler').then(mod => ({ default: mod.CodeSandboxCompiler })),
  { ssr: false }
);

export default function SandboxPage() {
  return (
    <div className="h-screen w-screen">
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#1e1e1e] text-white">Loading compiler...</div>}>
        <DynamicCompiler />
      </Suspense>
    </div>
  );
} 