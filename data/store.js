const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/app/data/gitguard.db'
  : path.join(__dirname, '..', 'gitguard.db');

const database = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`[DB_CONN_ERR] Failed to open sqlite database at path: ${dbPath}. Error: ${err.message}`);
  } else {
    console.log(`[DB_CONN_OK] Successfully opened sqlite database at path: ${dbPath}`);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      database.run(sql, params, function onRun(err) {
        if (err) {
          console.error(`[DB_EXEC_ERR_RUN] Failed to execute run query: ${sql}. Params: ${JSON.stringify(params)}. Error: ${err.message}`);
          reject(err);
          return;
        }
        resolve(this);
      });
    } catch (err) {
      console.error(`[DB_FATAL_ERR_RUN] Fatal run exception for query: ${sql}. Error: ${err.message}`);
      reject(err);
    }
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      database.get(sql, params, (err, row) => {
        if (err) {
          console.error(`[DB_EXEC_ERR_GET] Failed to execute get query: ${sql}. Params: ${JSON.stringify(params)}. Error: ${err.message}`);
          reject(err);
          return;
        }
        resolve(row);
      });
    } catch (err) {
      console.error(`[DB_FATAL_ERR_GET] Fatal get exception for query: ${sql}. Error: ${err.message}`);
      reject(err);
    }
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      database.all(sql, params, (err, rows) => {
        if (err) {
          console.error(`[DB_EXEC_ERR_ALL] Failed to execute all query: ${sql}. Params: ${JSON.stringify(params)}. Error: ${err.message}`);
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    } catch (err) {
      console.error(`[DB_FATAL_ERR_ALL] Fatal all exception for query: ${sql}. Error: ${err.message}`);
      reject(err);
    }
  });
}

database.serialize(() => {
  try {
    database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error(`[DB_INIT_ERR_USERS] Failed to create users table: ${err.message}`);
      }
    });

    database.run(`
      CREATE TABLE IF NOT EXISTS review_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_full_name TEXT,
        pr_number INTEGER,
        pr_title TEXT,
        reviewer TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        llm_response TEXT,
        cleaned_diff_size INTEGER,
        raw_diff TEXT,
        user_id INTEGER,
        status TEXT DEFAULT 'Completed'
      )
    `, (err) => {
      if (err) {
        console.error(`[DB_INIT_ERR_REVIEWS] Failed to create review_history table: ${err.message}`);
      }
    });

    database.run(`
      ALTER TABLE review_history ADD COLUMN cleaned_diff_size INTEGER
    `, (err) => {
      // Ignore error if column already exists
    });

    database.run(`
      ALTER TABLE review_history ADD COLUMN raw_diff TEXT
    `, (err) => {
      // Ignore error if column already exists
    });

    database.run(`
      ALTER TABLE review_history ADD COLUMN user_id INTEGER
    `, (err) => {
      // Ignore error if column already exists
    });

    database.run(`
      ALTER TABLE review_history ADD COLUMN status TEXT DEFAULT 'Completed'
    `, (err) => {
      // Ignore error if column already exists
    });

    database.run(`
      CREATE TABLE IF NOT EXISTS repo_settings (
        repo_full_name TEXT PRIMARY KEY,
        strict_mode INTEGER DEFAULT 0,
        ignore_linter INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        user_id INTEGER
      )
    `, (err) => {
      if (err) {
        console.error(`[DB_INIT_ERR_SETTINGS] Failed to create repo_settings table: ${err.message}`);
      }
    });

    database.run(`
      ALTER TABLE repo_settings ADD COLUMN user_id INTEGER
    `, (err) => {
      // Ignore error if column already exists
    });
  } catch (err) {
    console.error(`[DB_INIT_FATAL] Fatal error during database schema serialization: ${err.message}`);
  }
});

async function createUser({ name, email, passwordHash }) {
  try {
    const result = await run(
      `INSERT INTO users (name, email, password_hash)
       VALUES (?, ?, ?)`,
      [name, email.toLowerCase(), passwordHash]
    );
    return await getUserById(result.lastID);
  } catch (error) {
    console.error(`[DB_ERR_CREATE_USER] Failed to create user for email: ${email}. Error: ${error.message}`);
    throw error;
  }
}

async function getUserByEmail(email) {
  try {
    return await get(
      'SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
  } catch (error) {
    console.error(`[DB_ERR_GET_USER_EMAIL] Failed to get user by email: ${email}. Error: ${error.message}`);
    throw error;
  }
}

async function getUserById(id) {
  try {
    return await get(
      'SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error(`[DB_ERR_GET_USER_ID] Failed to get user by ID: ${id}. Error: ${error.message}`);
    throw error;
  }
}

async function saveReviewHistory({ repoFullName, prNumber, prTitle, reviewer, llmResponse, cleanedDiffSize, rawDiff, userId, status = 'Completed' }) {
  try {
    const result = await run(
      `INSERT INTO review_history (repo_full_name, pr_number, pr_title, reviewer, llm_response, cleaned_diff_size, raw_diff, user_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [repoFullName, prNumber, prTitle, reviewer, llmResponse, cleanedDiffSize, rawDiff, userId, status]
    );
    return result.lastID;
  } catch (error) {
    console.error(`[DB_ERR_SAVE_REV_HIST] Failed to save review history for repo: ${repoFullName}, PR: ${prNumber}. Error: ${error.message}`);
    throw error;
  }
}

async function updateReviewHistory(id, { llmResponse, cleanedDiffSize, rawDiff, status }) {
  try {
    await run(
      `UPDATE review_history
       SET llm_response = COALESCE(?, llm_response),
           cleaned_diff_size = COALESCE(?, cleaned_diff_size),
           raw_diff = COALESCE(?, raw_diff),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [llmResponse, cleanedDiffSize, rawDiff, status, id]
    );
  } catch (error) {
    console.error(`[DB_ERR_UPD_REV_HIST] Failed to update review history ID: ${id}. Error: ${error.message}`);
    throw error;
  }
}

async function listReviewHistory(limit = 100, userId = null) {
  try {
    if (userId) {
      return await all('SELECT * FROM review_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?', [userId, limit]);
    }
    return await all('SELECT * FROM review_history ORDER BY timestamp DESC LIMIT ?', [limit]);
  } catch (error) {
    console.error(`[DB_ERR_LIST_REV_HIST] Failed to list review history. Error: ${error.message}`);
    throw error;
  }
}

async function listReviewSnapshots(limit = 8, userId = null) {
  try {
    if (userId) {
      return await all('SELECT * FROM review_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?', [userId, limit]);
    }
    return await all('SELECT * FROM review_history ORDER BY timestamp DESC LIMIT ?', [limit]);
  } catch (error) {
    console.error(`[DB_ERR_LIST_REV_SNAP] Failed to list review snapshots. Error: ${error.message}`);
    throw error;
  }
}

async function listRepoSettings(userId = null) {
  try {
    if (userId) {
      return await all('SELECT * FROM repo_settings WHERE user_id = ? ORDER BY repo_full_name', [userId]);
    }
    return await all('SELECT * FROM repo_settings ORDER BY repo_full_name');
  } catch (error) {
    console.error(`[DB_ERR_LIST_REPO_SETT] Failed to list repo settings. Error: ${error.message}`);
    throw error;
  }
}

async function getRepoSettings(repoFullName) {
  try {
    return await get('SELECT * FROM repo_settings WHERE repo_full_name = ?', [repoFullName]);
  } catch (error) {
    console.error(`[DB_ERR_GET_REPO_SETT] Failed to get repo settings for: ${repoFullName}. Error: ${error.message}`);
    throw error;
  }
}

async function upsertRepoSettings({ repoFullName, strictMode, ignoreLinter, active, userId }) {
  try {
    await run(
      `INSERT OR REPLACE INTO repo_settings (repo_full_name, strict_mode, ignore_linter, active, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [repoFullName, strictMode ? 1 : 0, ignoreLinter ? 1 : 0, active ? 1 : 0, userId]
    );
  } catch (error) {
    console.error(`[DB_ERR_UPSERT_REPO_SETT] Failed to upsert repo settings for: ${repoFullName}. Error: ${error.message}`);
    throw error;
  }
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      database.close((err) => {
        if (err) {
          console.error(`[DB_ERR_CLOSE] Failed to close database connection. Error: ${err.message}`);
          reject(err);
        } else {
          console.log('[DB_CONN_CLOSED] Database connection closed successfully');
          resolve();
        }
      });
    } catch (err) {
      console.error(`[DB_FATAL_CLOSE] Fatal exception closing database. Error: ${err.message}`);
      reject(err);
    }
  });
}

async function saveUser(email, hashedPassword, name) {
  try {
    const result = await run(
      `INSERT INTO users (name, email, password_hash)
       VALUES (?, ?, ?)`,
      [name, email.toLowerCase(), hashedPassword]
    );
    return await getUserById(result.lastID);
  } catch (error) {
    console.error(`[DB_ERR_SAVE_USER] Failed to save user for email: ${email}. Error: ${error.message}`);
    throw error;
  }
}

async function findUserByEmail(email) {
  try {
    return await get(
      'SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
  } catch (error) {
    console.error(`[DB_ERR_FIND_USER_EMAIL] Failed to find user by email: ${email}. Error: ${error.message}`);
    throw error;
  }
}

async function saveReviewLog(repoName, prNumber, diffSize, reviewText) {
  try {
    const result = await run(
      `INSERT INTO review_history (repo_full_name, pr_number, pr_title, reviewer, llm_response, cleaned_diff_size, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [repoName, prNumber, 'Pull Request Review', 'AI Reviewer', reviewText, diffSize, 'Completed']
    );
    return result.lastID;
  } catch (error) {
    console.error(`[DB_ERR_SAVE_REVIEW_LOG] Failed to save review log for repo: ${repoName}, PR: ${prNumber}. Error: ${error.message}`);
    throw error;
  }
}

async function getReviewHistory(userContext) {
  try {
    let userId = null;
    if (userContext) {
      if (typeof userContext === 'object') {
        userId = userContext.id || userContext.sub || userContext.userId;
      } else {
        userId = userContext;
      }
    }
    if (userId) {
      return await all('SELECT * FROM review_history WHERE user_id = ? ORDER BY timestamp DESC', [userId]);
    }
    return await all('SELECT * FROM review_history ORDER BY timestamp DESC');
  } catch (error) {
    console.error(`[DB_ERR_GET_REVIEW_HISTORY] Failed to fetch review history for context: ${JSON.stringify(userContext)}. Error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  database,
  createUser,
  getUserByEmail,
  getUserById,
  listRepoSettings,
  getRepoSettings,
  listReviewHistory,
  listReviewSnapshots,
  saveReviewHistory,
  updateReviewHistory,
  upsertRepoSettings,
  closeDatabase,
  saveUser,
  findUserByEmail,
  saveReviewLog,
  getReviewHistory,
};