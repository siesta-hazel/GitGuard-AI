const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production' 
  ? '/app/data/gitguard.db' 
  : './gitguard.db';

const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  // Repository settings
  db.run(`
    CREATE TABLE IF NOT EXISTS repo_settings (
      repo_full_name TEXT PRIMARY KEY,
      strict_mode INTEGER DEFAULT 0,
      ignore_linter INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  // Review history
  db.run(`
    CREATE TABLE IF NOT EXISTS review_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_full_name TEXT,
      pr_number INTEGER,
      pr_title TEXT,
      reviewer TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      llm_response TEXT
    )
  `);
});

module.exports = db;