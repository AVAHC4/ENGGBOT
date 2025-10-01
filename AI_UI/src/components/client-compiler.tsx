'use client';

import { useState, useEffect } from 'react';
import { Compiler } from './compiler';

export default function ClientCompiler() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return <div className="h-screen w-full flex items-start justify-start bg-[#1e1e1e] text-white p-4">Loading compiler...</div>;
  }
  
  return <Compiler />;
} 