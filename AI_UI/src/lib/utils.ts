import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) return "";
  
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Language mapping for compiler compatibility
const languageMap: Record<string, string> = {
  // Direct mappings
  "python": "python",
  "javascript": "javascript",
  "js": "javascript",
  "java": "java",
  "c": "c",
  "cpp": "cpp",
  "c++": "cpp", 
  "csharp": "csharp",
  "cs": "csharp",
  "html": "html",
  "css": "css",
  
  // Additional mappings for flexibility
  "typescript": "javascript",
  "ts": "javascript",
  "jsx": "javascript",
  "tsx": "javascript",
  "text": "javascript", // Default to javascript for plain text
};

/**
 * Opens the code in the compiler page
 * 
 * @param code The code to be opened in the compiler
 * @param language The programming language of the code
 */
export function openInCompiler(code: string, language: string): void {
  // Normalize language to lowercase
  const normalizedLang = language.toLowerCase();
  
  // Map the language to one the compiler understands
  const compilerLang = languageMap[normalizedLang] || "javascript";
  
  // Encode the code to be passed in the URL safely
  const encodedCode = encodeURIComponent(code);
  
  // Create the URL with query parameters
  const url = `/compiler?language=${compilerLang}&code=${encodedCode}`;
  
  // Open in new tab
  window.open(url, '_blank');
}
