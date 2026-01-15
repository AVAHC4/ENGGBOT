"use client";

import React, { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';

 
import 'prismjs/themes/prism-tomorrow.css';
 
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';  
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onCursorPositionChange?: (line: number, column: number) => void;
}

export function CodeEditor({ value, onChange, language, onCursorPositionChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const highlightedRef = useRef<HTMLElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isMounted, setIsMounted] = useState(false);
  
   
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
   
  const getLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'css': 'css',
      'html': 'markup',
      'c': 'c',
      'cpp': 'cpp',
      'python': 'python',
      'java': 'java',
    };
    
    return languageMap[lang] || 'javascript';
  };

   
  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

   
  useEffect(() => {
    if (highlightedRef.current && isMounted) {
      highlightedRef.current.textContent = value;
      Prism.highlightElement(highlightedRef.current);
    }
  }, [value, isMounted]);

   
  useEffect(() => {
    if (highlightedRef.current && isMounted) {
      Prism.highlightElement(highlightedRef.current);
    }
  }, [language, isMounted]);

   
  const calculateCursorPosition = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorIndex = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorIndex);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    setCursorPosition({ line, column });
    
    if (onCursorPositionChange) {
      onCursorPositionChange(line, column);
    }
  };

   
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
       
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
       
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    
     
    calculateCursorPosition(e);
  };

  return (
    <div className="relative h-full w-full">
      <pre 
        ref={preRef} 
        className="absolute top-0 left-0 right-0 bottom-0 m-0 p-4 overflow-auto bg-[#1e1e1e] text-white font-mono text-sm pointer-events-none"
        aria-hidden="true"
      >
        <code ref={highlightedRef} className={`language-${getLanguage(language)}`}>
          {value}
        </code>
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          calculateCursorPosition(e);
        }}
        onKeyDown={handleKeyDown}
        onMouseUp={calculateCursorPosition}
        onScroll={syncScroll}
        onClick={calculateCursorPosition}
        spellCheck="false"
        className="absolute top-0 left-0 right-0 bottom-0 h-full w-full p-4 bg-transparent text-transparent caret-white font-mono text-sm resize-none outline-none"
        style={{ caretColor: 'white' }}
      />
    </div>
  );
} 