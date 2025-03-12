import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

// Get all conversations
export async function GET() {
  try {
    const conversations = db.conversations.getAll();
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { title, model, systemPrompt } = await request.json();
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const conversationId = db.conversations.create(title, model || 'default', systemPrompt || '');
    const conversation = db.conversations.get(conversationId);
    
    return NextResponse.json({ id: conversationId, ...conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

// Delete all conversations
export async function DELETE() {
  try {
    db.conversations.deleteAll();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    return NextResponse.json({ error: 'Failed to delete all conversations' }, { status: 500 });
  }
}
