import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory at: ${dataDir}`);
  } catch (err) {
    console.error(`Failed to create data directory: ${err}`);
  }
}

const dbPath = path.join(dataDir, 'conversations.db');
console.log(`Database path: ${dbPath}`);

let db: Database.Database;

// Initialize database with retry logic to handle potential locking issues
function initDb() {
  try {
    // Add options for better compatibility on Windows systems
    db = new Database(dbPath, {
      verbose: console.log,
      fileMustExist: false
    });
    
    console.log('Successfully created database connection');
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        model TEXT NOT NULL,
        system_prompt TEXT
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
      );
    `);
    
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error(`Database path: ${dbPath}`);
    console.error(`Data directory exists: ${fs.existsSync(dataDir)}`);
    throw error;
  }
}

// Get database instance
export function getDb(): Database.Database {
  if (!db) {
    return initDb();
  }
  return db;
}

// Close database connection
export function closeDb() {
  if (db) {
    db.close();
  }
}

// Database operations for conversations
export const conversationsDb = {
  // Create a new conversation
  create: (title: string, model: string, systemPrompt: string) => {
    const timestamp = Date.now();
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO conversations (title, created_at, updated_at, model, system_prompt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(title, timestamp, timestamp, model, systemPrompt);
    return result.lastInsertRowid;
  },
  
  // Get all conversations
  getAll: () => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM conversations
      ORDER BY updated_at DESC
    `);
    
    return stmt.all();
  },
  
  // Get a conversation by ID
  get: (id: number) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE id = ?
    `);
    
    return stmt.get(id);
  },
  
  // Update a conversation
  update: (id: number, data: {title?: string, model?: string, systemPrompt?: string}) => {
    const db = getDb();
    const timestamp = Date.now();
    
    const sets = [];
    const params = [];
    
    if (data.title !== undefined) {
      sets.push('title = ?');
      params.push(data.title);
    }
    
    if (data.model !== undefined) {
      sets.push('model = ?');
      params.push(data.model);
    }
    
    if (data.systemPrompt !== undefined) {
      sets.push('system_prompt = ?');
      params.push(data.systemPrompt);
    }
    
    sets.push('updated_at = ?');
    params.push(timestamp);
    
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE conversations
      SET ${sets.join(', ')}
      WHERE id = ?
    `);
    
    return stmt.run(...params);
  },
  
  // Delete a conversation
  delete: (id: number) => {
    const db = getDb();
    
    const stmt = db.prepare(`
      DELETE FROM conversations
      WHERE id = ?
    `);
    
    return stmt.run(id);
  },
  
  // Delete all conversations
  deleteAll: () => {
    const db = getDb();
    
    const stmt = db.prepare(`
      DELETE FROM conversations
    `);
    
    return stmt.run();
  }
};

// Database operations for messages
export const messagesDb = {
  // Add a new message to a conversation
  add: (conversationId: number, role: string, content: string) => {
    const db = getDb();
    const timestamp = Date.now();
    
    // Update the conversation's updated_at timestamp
    const updateConversation = db.prepare(`
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `);
    updateConversation.run(timestamp, conversationId);
    
    // Insert the new message
    const stmt = db.prepare(`
      INSERT INTO messages (conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(conversationId, role, content, timestamp);
  },
  
  // Get all messages for a conversation
  getByConversation: (conversationId: number) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    
    return stmt.all(conversationId);
  }
};

export default {
  getDb,
  closeDb,
  conversations: conversationsDb,
  messages: messagesDb
};