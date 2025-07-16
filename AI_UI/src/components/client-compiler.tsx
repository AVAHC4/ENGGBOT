'use client';

import { useState, useEffect } from 'react';
import { Compiler } from './compiler';

export default function ClientCompiler() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#1e1e1e] text-white">Loading compiler...</div>;
  }
  
  return <Compiler />;
} 