import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export function initDatabase(dbPath) {
  // Ensure data directory exists
  mkdirSync(dirname(dbPath), { recursive: true });
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // API Keys table
  // For PlotPulse auth: stores SHA-256 hash of API key
  // For AI providers: stores encrypted keys (AES-256-GCM)
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      key_hash TEXT,
      encrypted_key TEXT,
      iv TEXT,
      auth_tag TEXT,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider)
    )
  `);

  // Novels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      premise TEXT,
      status TEXT NOT NULL DEFAULT 'outlining',
      mode TEXT NOT NULL,
      target_word_count INTEGER DEFAULT 70000,
      current_word_count INTEGER DEFAULT 0,
      model_provider TEXT,
      model_name TEXT,
      temperature REAL DEFAULT 0.7,
      total_cost REAL DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Story Bibles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_bibles (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL UNIQUE,
      characters TEXT,
      world_rules TEXT,
      timeline TEXT,
      themes TEXT,
      tone_guide TEXT,
      style_reference TEXT,
      version INTEGER DEFAULT 1,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `);

  // Chapters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      outline TEXT,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      model_provider TEXT,
      model_name TEXT,
      cost REAL DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      generation_attempts INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      UNIQUE(novel_id, chapter_number)
    )
  `);

  // Generation Queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_queue (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_id TEXT,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      error_message TEXT,
      result TEXT,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `);

  // Outlines table (for Spark Mode)
  db.exec(`
    CREATE TABLE IF NOT EXISTS outlines (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL UNIQUE,
      chapter_summaries TEXT NOT NULL,
      character_profiles TEXT,
      world_details TEXT,
      theme_notes TEXT,
      approved BOOLEAN DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
    CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
    CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON generation_queue(status);
    CREATE INDEX IF NOT EXISTS idx_queue_novel_id ON generation_queue(novel_id);
  `);

  // Migrations
  runMigrations(db);

  return db;
}

function runMigrations(db) {
  // Check if migrations table exists
  const migrationsTable = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='migrations'
  `).get();

  if (!migrationsTable) {
    db.exec(`
      CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at INTEGER NOT NULL
      )
    `);
  }

  // Migration 1: Add flagged columns to chapters
  const migration1 = db.prepare('SELECT * FROM migrations WHERE name = ?').get('add_chapter_flags');
  if (!migration1) {
    try {
      // Check if columns already exist
      const tableInfo = db.prepare('PRAGMA table_info(chapters)').all();
      const hasFlawed = tableInfo.some(col => col.name === 'flagged');
      const hasFlagNotes = tableInfo.some(col => col.name === 'flag_notes');
      const hasRegenNotes = tableInfo.some(col => col.name === 'regeneration_notes');

      if (!hasFlawed) {
        db.exec('ALTER TABLE chapters ADD COLUMN flagged INTEGER DEFAULT 0');
      }
      if (!hasFlagNotes) {
        db.exec('ALTER TABLE chapters ADD COLUMN flag_notes TEXT');
      }
      if (!hasRegenNotes) {
        db.exec('ALTER TABLE chapters ADD COLUMN regeneration_notes TEXT');
      }

      db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run('add_chapter_flags', Date.now());
      console.log('✓ Migration: add_chapter_flags applied');
    } catch (err) {
      console.error('Migration add_chapter_flags failed:', err.message);
    }
  }
}
