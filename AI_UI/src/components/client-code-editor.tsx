'use client';

import React, { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';

// Import Prism CSS themes - you can choose a different theme
import 'prismjs/themes/prism-tomorrow.css';
// Import languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML
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

export function ClientCodeEditor({ value, onChange, language, onCursorPositionChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const highlightedRef = useRef<HTMLElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [initialized, setInitialized] = useState(false);
  
  // Handle language mapping for Prism
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

  // Initialize component after mount
  useEffect(() => {
    setInitialized(true);
  }, []);

  // Sync scroll between textarea and highlighted code
  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Update highlighted code when value changes
  useEffect(() => {
    if (highlightedRef.current && initialized) {
      highlightedRef.current.textContent = value;
      Prism.highlightElement(highlightedRef.current);
    }
  }, [value, initialized]);

  // Initialize Prism highlighting
  useEffect(() => {
    if (highlightedRef.current && initialized) {
      Prism.highlightElement(highlightedRef.current);
    }
  }, [language, initialized]);

  // Calculate cursor position (line and column)
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

  // Handle tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      // Insert 2 spaces for indentation
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Move cursor position after the inserted tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    
    // Update cursor position
    calculateCursorPosition(e);
  };

  // If not initialized yet, show a simple textarea
  if (!initialized) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full p-4 bg-[#1e1e1e] text-white font-mono text-sm outline-none resize-none"
        spellCheck="false"
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <pre 
        ref={preRef} 
        className="absolute top-0 left-0 right-0 bottom-0 m-0 p-4 overflow-auto bg-[#1e1e1e] text-white font-mono text-sm pointer-events-none z-0"
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
        className="absolute top-0 left-0 right-0 bottom-0 h-full w-full p-4 bg-transparent font-mono text-sm resize-none outline-none z-10"
        style={{ 
          caretColor: 'white', 
          cursor: 'text', 
          color: 'rgba(255,255,255,0.01)', 
          WebkitTextFillColor: 'rgba(255,255,255,0.01)',
          userSelect: 'text'
        }}
      />
    </div>
  );
} 