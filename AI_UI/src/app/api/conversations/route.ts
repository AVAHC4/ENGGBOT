import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/conversations - Fetch all conversations for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userEmail = user.email;

    // Use email directly as user identifier (simpler approach)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_email', userEmail)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('Error in GET /api/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { conversationId, title } = body;
    const conversationTitle = title || 'New Conversation';
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userEmail = user.email;

    // Create new conversation with provided ID or generate new one
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_email: userEmail,
        title: conversationTitle,
      })
      .select()
      .single();

    if (error) {
      // Check for primary key violation (conversation already exists)
      if (error.code === '23505') { 
        return NextResponse.json({ message: 'Conversation already exists' }, { status: 409 });
      }
      
      console.error('Error creating conversation:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
