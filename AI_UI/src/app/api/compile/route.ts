import { NextRequest, NextResponse } from 'next/server';

// Simulate code execution for different languages
export async function POST(request: NextRequest) {
  try {
    const { code, language } = await request.json();

    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Basic validation
    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    // Simulate execution for different languages
    let output = '';
    let error = null;

    // Check for common errors
    if (language === 'c' || language === 'cpp') {
      if (code.includes('printf') && !code.includes('#include <stdio.h>') && language === 'c') {
        error = 'Error: stdio.h must be included for printf';
      } else if (code.includes('cout') && !code.includes('#include <iostream>') && language === 'cpp') {
        error = 'Error: iostream must be included for cout';
      } else if (!code.includes('main')) {
        error = 'Error: main function is required';
      }
    } else if (language === 'java') {
      if (!code.includes('class')) {
        error = 'Error: Java code must define a class';
      } else if (!code.includes('public static void main')) {
        error = 'Error: Java code must include a main method';
      }
    }

    // If no errors, simulate successful execution
    if (!error) {
      if (code.toLowerCase().includes('hello')) {
        output = 'Hello, World!';
      } else {
        output = 'Program executed successfully.';
      }
    }

    return NextResponse.json({
      output,
      error,
      exitCode: error ? 1 : 0,
    });
  } catch (error) {
    console.error('Compilation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 