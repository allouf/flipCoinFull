const Database = require('better-sqlite3');
const path = require('path');

// Create SQLite database file
const dbPath = path.join(__dirname, 'commitments.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize SQLite database tables
 */
function initializeDatabase() {
  try {
    console.log('📦 Initializing SQLite database...');

    // Create player_commitments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_commitments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT NOT NULL,
        room_id INTEGER NOT NULL,
        choice TEXT NOT NULL,
        choice_num INTEGER NOT NULL,
        secret TEXT NOT NULL,
        commitment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revealed INTEGER DEFAULT 0,
        game_completed INTEGER DEFAULT 0,
        UNIQUE(wallet_address, room_id)
      )
    `);

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_wallet ON player_commitments(wallet_address)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_room ON player_commitments(room_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_created ON player_commitments(created_at DESC)');

    // Create game_history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL UNIQUE,
        player_a TEXT NOT NULL,
        player_b TEXT,
        bet_amount REAL NOT NULL,
        status TEXT NOT NULL,
        commitment_a TEXT,
        commitment_b TEXT,
        choice_a TEXT,
        choice_b TEXT,
        winner TEXT,
        coin_result TEXT,
        winner_payout REAL,
        house_fee REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        player_b_joined_at DATETIME,
        commitments_ready_at DATETIME,
        resolved_at DATETIME,
        create_tx TEXT,
        join_tx TEXT,
        reveal_a_tx TEXT,
        reveal_b_tx TEXT,
        resolve_tx TEXT
      )
    `);

    // Create player_stats table
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_stats (
        wallet_address TEXT PRIMARY KEY,
        total_games INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_lost INTEGER DEFAULT 0,
        games_cancelled INTEGER DEFAULT 0,
        total_wagered REAL DEFAULT 0,
        total_won REAL DEFAULT 0,
        total_lost REAL DEFAULT 0,
        total_fees_paid REAL DEFAULT 0,
        win_rate REAL DEFAULT 0,
        last_game_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ SQLite database initialized successfully');
    console.log(`📁 Database file: ${dbPath}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database:', error);
    throw error;
  }
}

/**
 * Query wrapper for compatibility with PostgreSQL code
 */
async function query(text, params = []) {
  try {
    // Convert PostgreSQL $1, $2 syntax to SQLite ? syntax
    const sqliteQuery = text.replace(/\$(\d+)/g, '?');

    if (text.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sqliteQuery);
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    } else {
      const stmt = db.prepare(sqliteQuery);
      const info = stmt.run(...params);
      return { rows: [], rowCount: info.changes };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize on load
initializeDatabase();

module.exports = {
  db,
  query,
  initializeDatabase
};