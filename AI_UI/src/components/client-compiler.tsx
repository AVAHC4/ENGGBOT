'use client';

import { useState, useEffect } from 'react';
import { Compiler } from './compiler';

export default function ClientCompiler() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-screen w-full flex bg-[#1e1e1e] animate-pulse">
        { }
        <div className="flex-1 p-4 space-y-3">
          <div className="flex gap-2 mb-4">
            <div className="h-8 bg-neutral-700 rounded w-20" />
            <div className="h-8 bg-neutral-700 rounded w-20" />
          </div>
          <div className="h-4 bg-neutral-700 rounded w-3/4" />
          <div className="h-4 bg-neutral-700 rounded w-1/2" />
          <div className="h-4 bg-neutral-700 rounded w-2/3" />
          <div className="h-4 bg-neutral-700 rounded w-1/3" />
          <div className="h-4 bg-neutral-700 rounded w-1/2" />
        </div>
        { }
        <div className="w-80 border-l border-neutral-700 p-4 space-y-3">
          <div className="h-6 bg-neutral-700 rounded w-16" />
          <div className="h-4 bg-neutral-700 rounded w-full" />
          <div className="h-4 bg-neutral-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return <Compiler />;
} 