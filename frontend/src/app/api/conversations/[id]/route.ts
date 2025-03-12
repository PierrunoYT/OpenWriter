import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

// Get a conversation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }
    
    const conversation = db.conversations.get(id);
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// Update a conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }
    
    const { title, model, systemPrompt } = await request.json();
    const result = db.conversations.update(id, {
      title,
      model,
      system_prompt: systemPrompt
    });
    
    if (!result) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    const conversation = db.conversations.get(id);
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

// Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }
    
    const result = db.conversations.delete(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
