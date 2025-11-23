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

  // Save code and language to localStorage
  localStorage.setItem('compiler_pending_code', code);
  localStorage.setItem('compiler_pending_language', compilerLang);

  // Open in new tab without query params
  window.open('/compiler', '_blank');
}
