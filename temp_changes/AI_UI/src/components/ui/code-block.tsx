"use client";

import React, { useState } from 'react';
import { Check, Copy, Pencil, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { openInCompiler } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  onEdit?: () => void;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  title,
  showLineNumbers = true,
  onEdit,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleOpenInCompiler = () => {
    openInCompiler(code, language);
  };

  const displayTitle = title || language;

  return (
    <div 
      className={cn(
        "rounded-lg overflow-hidden border border-border bg-slate-950 text-slate-50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2">
        <span className="text-sm text-slate-400">{displayTitle}</span>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            onClick={copyToClipboard}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            onClick={handleOpenInCompiler}
            title="Open in Compiler"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Code Content */}
      <div className="relative overflow-auto">
        <pre 
          className={cn(
            "p-4 text-sm font-mono overflow-auto",
            showLineNumbers && "pl-12"
          )}
        >
          {showLineNumbers && (
            <div className="absolute left-0 top-0 h-full w-8 bg-slate-900/50 flex flex-col items-end pr-2 pt-4 text-xs text-slate-500">
              {code.split('\n').map((_, i) => (
                <div key={i} className="leading-5">{i + 1}</div>
              ))}
            </div>
          )}
          <code className="text-slate-50 leading-5 whitespace-pre">
            {formatCodeWithSyntaxHighlighting(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Language-specific keywords
const KEYWORDS = {
  java: [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 
    'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 
    'extends', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import', 
    'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 
    'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 
    'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 
    'void', 'volatile', 'while', 'true', 'false', 'null'
  ],
  python: [
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 
    'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 
    'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 
    'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'
  ],
  javascript: [
    'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 
    'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 
    'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final', 
    'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import', 
    'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null', 
    'package', 'private', 'protected', 'public', 'return', 'short', 'static', 
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 
    'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with', 'yield'
  ],
  c: [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
    'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
    'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'
  ],
  cpp: [
    'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor',
    'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
    'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit',
    'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
    'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit',
    'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline',
    'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq',
    'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public',
    'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed',
    'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch',
    'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef',
    'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
    'volatile', 'wchar_t', 'while', 'xor', 'xor_eq'
  ],
  csharp: [
    'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 
    'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 
    'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 
    'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 
    'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 
    'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 
    'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 
    'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 
    'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 
    'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while'
  ],
  html: [
    'html', 'head', 'title', 'body', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input',
    'button', 'select', 'option', 'textarea', 'script', 'style', 'link', 'meta', 'footer',
    'header', 'nav', 'section', 'article', 'aside', 'canvas', 'svg', 'audio', 'video'
  ],
  css: [
    'color', 'background', 'margin', 'padding', 'font', 'border', 'display', 'position',
    'width', 'height', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'z-index',
    'overflow', 'transition', 'transform', 'animation', 'grid', 'flex', 'align-items',
    'justify-content', 'text-align', 'line-height', 'opacity', 'visibility', 'hover'
  ]
};

// Improved syntax highlighting function using React components
function formatCodeWithSyntaxHighlighting(code: string, language: string): React.ReactNode {
  // Normalize language
  language = language.toLowerCase();
  
  // Split code into lines first
  const lines = code.split('\n');
  
  // Get language-specific keywords or use default empty array
  const keywords = KEYWORDS[language as keyof typeof KEYWORDS] || [];
  
  // Define common patterns for all languages
  const commonPatterns = [
    // Keywords
    keywords.length > 0 && {
      pattern: new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'),
      render: (match: string) => <span className="text-purple-400">{match}</span>
    },
    // Numbers
    {
      pattern: /\b\d+(\.\d+)?([eE][+-]?\d+)?\b/g,
      render: (match: string) => <span className="text-yellow-400">{match}</span>
    }
  ].filter(Boolean);
  
  // Language-specific patterns
  const languagePatterns: any[] = [];
  
  // Add language-specific patterns
  switch (language) {
    case 'java':
      languagePatterns.push(
        // Strings
        {
          pattern: /"(?:[^"\\]|\\.)*"/g,
          render: (match: string) => <span className="text-green-400">{match}</span>
        },
        // Single line comments
        {
          pattern: /\/\/.*$/g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        },
        // Method calls
        {
          pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
          render: (match: string) => {
            const methodName = match.slice(0, -1); // Remove trailing (
            return <><span className="text-blue-400">{methodName}</span>{'('}</>;
          }
        }
      );
      break;
      
    case 'python':
      languagePatterns.push(
        // Strings (triple quoted and regular)
        {
          pattern: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
          render: (match: string) => <span className="text-green-400">{match}</span>
        },
        // Comments
        {
          pattern: /#.*$/g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        },
        // Function definitions
        {
          pattern: /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
          render: (match: string, group: string) => {
            return <><span className="text-purple-400">def</span> <span className="text-blue-400">{group}</span></>;
          }
        },
        // Method calls
        {
          pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
          render: (match: string) => {
            const methodName = match.slice(0, -1); // Remove trailing (
            return <><span className="text-blue-400">{methodName}</span>{'('}</>;
          }
        }
      );
      break;
      
    case 'javascript':
    case 'js':
    case 'jsx':
    case 'ts':
    case 'typescript':
      languagePatterns.push(
        // Strings (template literals, double and single quotes)
        {
          pattern: /`(?:\\[\s\S]|[^`])*`|"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'/g,
          render: (match: string) => <span className="text-green-400">{match}</span>
        },
        // Comments (single and multi-line)
        {
          pattern: /\/\/.*$|\/\*[\s\S]*?\*\//g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        },
        // Function declarations
        {
          pattern: /\b(function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
          render: (match: string, group1: string, group2: string) => {
            return (
              <>
                <span className="text-purple-400">{group1}</span> 
                <span className="text-blue-300">{group2}</span>
              </>
            );
          }
        },
        // Method/function calls
        {
          pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
          render: (match: string) => {
            const methodName = match.slice(0, -1); // Remove trailing (
            return <><span className="text-blue-400">{methodName}</span>{'('}</>;
          }
        }
      );
      break;
      
    case 'c':
    case 'cpp':
    case 'c++':
      languagePatterns.push(
        // Strings
        {
          pattern: /"(?:[^"\\]|\\.)*"/g,
          render: (match: string) => <span className="text-green-400">{match}</span>
        },
        // Single line comments
        {
          pattern: /\/\/.*$/g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        },
        // Multi-line comments
        {
          pattern: /\/\*[\s\S]*?\*\//g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        },
        // Preprocessor directives
        {
          pattern: /^\s*#\w+.*/gm,
          render: (match: string) => <span className="text-pink-400">{match}</span>
        },
        // Function calls
        {
          pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
          render: (match: string) => {
            const functionName = match.slice(0, -1); // Remove trailing (
            return <><span className="text-blue-400">{functionName}</span>{'('}</>;
          }
        }
      );
      break;
      
    case 'csharp':
    case 'cs':
      languagePatterns.push(
        // Strings
        {
          pattern: /@"(?:[^"]|"")*"|"(?:[^"\\]|\\.)*"/g,
          render: (match: string) => <span className="text-green-400">{match}</span>
        },
        // Comments
        {
          pattern: /\/\/.*$|\/\*[\s\S]*?\*\//g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        },
        // Method calls
        {
          pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
          render: (match: string) => {
            const methodName = match.slice(0, -1); // Remove trailing (
            return <><span className="text-blue-400">{methodName}</span>{'('}</>;
          }
        }
      );
      break;
      
    case 'html':
    case 'xml':
      languagePatterns.push(
        // Tags
        {
          pattern: /<\/?([a-zA-Z][a-zA-Z0-9_:-]*)(?:\s[^>]*)?>/g,
          render: (match: string) => <span className="text-blue-400">{match}</span>
        },
        // Attributes
        {
          pattern: /(\s[a-zA-Z][a-zA-Z0-9_:-]*)\s*=\s*("[^"]*"|'[^']*')/g,
          render: (match: string, attr: string, value: string) => (
            <>
              <span className="text-yellow-400">{attr}</span>=<span className="text-green-400">{value}</span>
            </>
          )
        },
        // Comments
        {
          pattern: /<!--[\s\S]*?-->/g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        }
      );
      break;
      
    case 'css':
      languagePatterns.push(
        // Selectors
        {
          pattern: /[^{}\s][^{}]*(?=\s*{)/g,
          render: (match: string) => <span className="text-yellow-400">{match}</span>
        },
        // Properties
        {
          pattern: /(\s*[a-zA-Z-]+\s*)(?=:)/g,
          render: (match: string) => <span className="text-blue-400">{match}</span>
        },
        // Values
        {
          pattern: /(:)([^;{}]*)(?=[;{}])/g,
          render: (match: string, colon: string, value: string) => (
            <>
              {colon}<span className="text-green-400">{value}</span>
            </>
          )
        },
        // Comments
        {
          pattern: /\/\*[\s\S]*?\*\//g,
          render: (match: string) => <span className="text-slate-500">{match}</span>
        }
      );
      break;
  }
  
  // Combine common patterns with language-specific patterns
  const tokenPatterns = [...commonPatterns, ...languagePatterns];
  
  // If no patterns are defined for this language, return plain text
  if (tokenPatterns.length === 0) {
    return lines.map((line, i) => (
      <div key={i} className="block">
        {line}
      </div>
    ));
  }
  
  // Process each line with the combined patterns
  return lines.map((line, lineIndex) => {
    const tokens: React.ReactNode[] = [];
    let currentIndex = 0;
    let lastProcessedIndex = 0;
    
    while (lastProcessedIndex < line.length) {
      let bestMatch: {
        start: number;
        end: number;
        pattern: any;
        content: string;
        groups: string[];
      } | null = null;
      
      // Find the earliest match across all patterns
      for (const patternObj of tokenPatterns) {
        if (!patternObj) continue;
        
        const { pattern } = patternObj;
        pattern.lastIndex = lastProcessedIndex;
        
        const match = pattern.exec(line);
        if (!match || match.index < lastProcessedIndex) continue;
        
        if (!bestMatch || match.index < bestMatch.start) {
          // Extract all capture groups
          const groups = match.slice(1);
          
          bestMatch = {
            start: match.index,
            end: match.index + match[0].length,
            pattern: patternObj,
            content: match[0],
            groups: groups
          };
        }
      }
      
      // No more matches found
      if (!bestMatch) {
        tokens.push(
          <span key={`rest-${lineIndex}-${currentIndex++}`}>
            {line.slice(lastProcessedIndex)}
          </span>
        );
        break;
      }
      
      // Add any text before this match
      if (bestMatch.start > lastProcessedIndex) {
        tokens.push(
          <span key={`pre-${lineIndex}-${currentIndex++}`}>
            {line.slice(lastProcessedIndex, bestMatch.start)}
          </span>
        );
      }
      
      // Add the highlighted token
      const renderedToken = bestMatch.pattern.render(
        bestMatch.content, 
        ...bestMatch.groups
      );
      
      tokens.push(
        <React.Fragment key={`token-${lineIndex}-${currentIndex++}`}>
          {renderedToken}
        </React.Fragment>
      );
      
      lastProcessedIndex = bestMatch.end;
    }
    
    return (
      <div key={`line-${lineIndex}`} className="block">
        {tokens.length > 0 ? tokens : line}
      </div>
    );
  });
} 