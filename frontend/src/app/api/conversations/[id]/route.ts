import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';

// Get a conversation by ID
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
    
    // Debug log to see what's being returned
    console.log(`Fetching conversation ${id}. Found ${messages.length} messages.`);
    
    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error(`Error fetching conversation ID ${resolvedParams.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// Update a conversation
export async function PUT(
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
    
    const data = await request.json();
    const result = db.conversations.update(id, data);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error updating conversation ID ${resolvedParams.id}:`, error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

// Delete a conversation
export async function DELETE(
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
    
    const result = db.conversations.delete(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting conversation ID ${resolvedParams.id}:`, error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}