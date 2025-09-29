const { Pool } = require('pg');
require('dotenv').config();

// Neon Database connection
// You need to set DATABASE_URL in your .env file
// Format: postgres://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1000, // Fail fast if database is unreachable
  statement_timeout: 1000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function to execute queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Check if tables exist
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'player_commitments'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📦 Creating database tables...');

      // Create player_commitments table
      await query(`
        CREATE TABLE IF NOT EXISTS player_commitments (
          id SERIAL PRIMARY KEY,
          wallet_address VARCHAR(44) NOT NULL,
          room_id BIGINT NOT NULL,
          choice VARCHAR(10) NOT NULL,
          choice_num INT NOT NULL,
          secret VARCHAR(100) NOT NULL,
          commitment TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          revealed BOOLEAN DEFAULT FALSE,
          game_completed BOOLEAN DEFAULT FALSE,
          CONSTRAINT unique_wallet_room UNIQUE (wallet_address, room_id)
        )
      `);

      // Create indexes
      await query('CREATE INDEX IF NOT EXISTS idx_wallet ON player_commitments(wallet_address)');
      await query('CREATE INDEX IF NOT EXISTS idx_room ON player_commitments(room_id)');
      await query('CREATE INDEX IF NOT EXISTS idx_created ON player_commitments(created_at DESC)');

      // Create game_history table
      await query(`
        CREATE TABLE IF NOT EXISTS game_history (
          id SERIAL PRIMARY KEY,
          room_id BIGINT NOT NULL UNIQUE,
          player_a VARCHAR(44) NOT NULL,
          player_b VARCHAR(44),
          bet_amount DECIMAL(20, 9) NOT NULL,
          status VARCHAR(50) NOT NULL,
          commitment_a TEXT,
          commitment_b TEXT,
          choice_a VARCHAR(10),
          choice_b VARCHAR(10),
          winner VARCHAR(44),
          coin_result VARCHAR(10),
          winner_payout DECIMAL(20, 9),
          house_fee DECIMAL(20, 9),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          player_b_joined_at TIMESTAMP,
          commitments_ready_at TIMESTAMP,
          resolved_at TIMESTAMP,
          create_tx VARCHAR(100),
          join_tx VARCHAR(100),
          reveal_a_tx VARCHAR(100),
          reveal_b_tx VARCHAR(100),
          resolve_tx VARCHAR(100)
        )
      `);

      // Create player_stats table
      await query(`
        CREATE TABLE IF NOT EXISTS player_stats (
          wallet_address VARCHAR(44) PRIMARY KEY,
          total_games INT DEFAULT 0,
          games_won INT DEFAULT 0,
          games_lost INT DEFAULT 0,
          games_cancelled INT DEFAULT 0,
          total_wagered DECIMAL(20, 9) DEFAULT 0,
          total_won DECIMAL(20, 9) DEFAULT 0,
          total_lost DECIMAL(20, 9) DEFAULT 0,
          total_fees_paid DECIMAL(20, 9) DEFAULT 0,
          win_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
            CASE
              WHEN (games_won + games_lost) > 0
              THEN (games_won::DECIMAL / (games_won + games_lost) * 100)
              ELSE 0
            END
          ) STORED,
          last_game_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Database tables created successfully');
    } else {
      console.log('✅ Database tables already exist');
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  initializeDatabase
};