import { NextRequest, NextResponse } from 'next/server';

/**
 * Document Generation API Endpoint
 * 
 * Handles requests to generate documents from AI output
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      disabled: true,
      message: 'Document generation API is disabled in this deployment.'
    },
    { status: 501 }
  );
}
 