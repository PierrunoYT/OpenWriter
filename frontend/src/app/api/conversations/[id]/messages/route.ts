import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

// Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is awaited before accessing its properties
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }
    
    const conversation = db.conversations.get(id);
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    const messages = db.messages.getByConversation(id);
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(`Error fetching messages for conversation ID ${resolvedParams.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Add a message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is awaited before accessing its properties
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }
    
    const conversation = db.conversations.get(id);
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    const { role, content } = await request.json();
    
    if (!role || !content) {
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
    }
    
    const result = db.messages.add(id, role, content);
    
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error(`Error adding message to conversation ID ${resolvedParams.id}:`, error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}