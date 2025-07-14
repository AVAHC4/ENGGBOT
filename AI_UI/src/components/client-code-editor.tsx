'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onCursorPositionChange?: (line: number, column: number) => void;
}

export function ClientCodeEditor({ value, onChange, language, onCursorPositionChange }: CodeEditorProps) {
  const [initialized, setInitialized] = useState(false);
  const [editorValue, setEditorValue] = useState(value);
  
  // Map our language names to Monaco's language identifiers
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'html': 'html',
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

  // Update editor value when prop changes
  useEffect(() => {
    if (value !== editorValue) {
      setEditorValue(value);
    }
  }, [value]);

  // Handle editor change
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      setEditorValue(newValue);
      onChange(newValue);
    }
  };

  // Handle cursor position change
  const handleCursorPositionChange = (e: any) => {
    if (onCursorPositionChange && e.position) {
      onCursorPositionChange(e.position.lineNumber, e.position.column);
    }
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
    <Editor
      height="100%"
      width="100%"
      language={getMonacoLanguage(language)}
      value={editorValue}
      onChange={handleEditorChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontFamily: 'monospace',
        fontSize: 14,
        tabSize: 2,
        automaticLayout: true,
      }}
      onMount={(editor) => {
        editor.onDidChangeCursorPosition(handleCursorPositionChange);
      }}
    />
  );
} 