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

 
const languageMap: Record<string, string> = {
   
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

   
  "typescript": "javascript",
  "ts": "javascript",
  "jsx": "javascript",
  "tsx": "javascript",
  "text": "javascript",  
};

 
export function openInCompiler(code: string, language: string): void {
   
  const normalizedLang = language.toLowerCase();

   
  const compilerLang = languageMap[normalizedLang] || "javascript";

   
  localStorage.setItem('compiler_pending_code', code);
  localStorage.setItem('compiler_pending_language', compilerLang);

   
  window.open('/compiler', '_blank');
}
