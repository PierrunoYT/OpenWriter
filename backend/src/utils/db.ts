import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create and initialize database
const dbPath = path.join(dataDir, 'openwriter.db');
let db: Database.Database;

try {
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Initialize database with tables if they don't exist
  initializeDatabase();
  
  console.log(`Database initialized successfully at ${dbPath}`);
} catch (error) {
  console.error(`Failed to initialize database at ${dbPath}:`, error);
  // Create a fallback in-memory database for temporary operation
  console.warn('Using in-memory database as fallback. Data will not be persisted!');
  db = new Database(':memory:');
  
  // Still try to initialize the schema
  try {
    db.pragma('foreign_keys = ON');
    initializeDatabase();
  } catch (fallbackError) {
    console.error('Failed to initialize in-memory database:', fallbackError);
  }
}

// Initialize database with tables if they don't exist
function initializeDatabase() {
  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

export default db;
