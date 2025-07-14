'use client';

import { lazy, Suspense } from 'react';

// Create a client-side only component
const ClientOnlyCompiler = lazy(() => 
  import('@/components/client-compiler').then(mod => mod)
);

export default function SandboxPage() {
  return (
    <div className="h-screen w-screen">
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#1e1e1e] text-white">Loading compiler...</div>}>
        <ClientOnlyCompiler />
      </Suspense>
    </div>
  );
} 