import { NextRequest, NextResponse } from 'next/server';

 
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
 