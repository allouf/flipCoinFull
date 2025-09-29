const express = require('express');
const router = express.Router();

// Try PostgreSQL first, fall back to SQLite
let query;
try {
  const db = require('../database/db');
  query = db.query;
  console.log('📊 Commitments API using PostgreSQL');
} catch (error) {
  const sqliteDb = require('../database/sqlite-db');
  query = sqliteDb.query;
  console.log('📊 Commitments API using SQLite fallback');
}

/**
 * Store a commitment in the database
 * This is called after a player makes a commitment on-chain
 */
router.post('/commitments', async (req, res) => {
  const { walletAddress, roomId, choice, secret, commitment } = req.body;

  // Validate input
  if (!walletAddress || !roomId || !choice || !secret || !commitment) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['walletAddress', 'roomId', 'choice', 'secret', 'commitment']
    });
  }

  try {
    // Convert choice to number
    const choiceNum = choice === 'heads' ? 0 : 1;

    // Store in database (upsert - update if exists)
    const result = await query(`
      INSERT INTO player_commitments (wallet_address, room_id, choice, choice_num, secret, commitment)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (wallet_address, room_id)
      DO UPDATE SET
        choice = EXCLUDED.choice,
        choice_num = EXCLUDED.choice_num,
        secret = EXCLUDED.secret,
        commitment = EXCLUDED.commitment,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [walletAddress, roomId, choice, choiceNum, secret, JSON.stringify(commitment)]);

    console.log(`✅ Stored commitment for ${walletAddress} in room ${roomId}`);

    res.json({
      success: true,
      message: 'Commitment stored successfully',
      commitment: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to store commitment:', error);
    res.status(500).json({
      error: 'Failed to store commitment',
      details: error.message
    });
  }
});

/**
 * Retrieve a specific commitment
 */
router.get('/commitments/:walletAddress/:roomId', async (req, res) => {
  const { walletAddress, roomId } = req.params;

  try {
    const result = await query(`
      SELECT * FROM player_commitments
      WHERE wallet_address = $1 AND room_id = $2
    `, [walletAddress, roomId]);

    if (result.rows.length === 0) {
      console.log(`❌ No commitment found for ${walletAddress} in room ${roomId}`);
      return res.status(404).json({
        error: 'Commitment not found',
        walletAddress,
        roomId
      });
    }

    const commitment = result.rows[0];
    // Parse the commitment array from JSON
    commitment.commitment = JSON.parse(commitment.commitment);

    console.log(`✅ Retrieved commitment for ${walletAddress} in room ${roomId}`);

    res.json({
      success: true,
      commitment
    });
  } catch (error) {
    console.error('Failed to retrieve commitment:', error);
    res.status(500).json({
      error: 'Failed to retrieve commitment',
      details: error.message
    });
  }
});

/**
 * Get all commitments for a wallet
 */
router.get('/commitments/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const result = await query(`
      SELECT * FROM player_commitments
      WHERE wallet_address = $1
      ORDER BY created_at DESC
    `, [walletAddress]);

    // Parse commitment arrays
    const commitments = result.rows.map(row => ({
      ...row,
      commitment: JSON.parse(row.commitment)
    }));

    res.json({
      success: true,
      count: commitments.length,
      commitments
    });
  } catch (error) {
    console.error('Failed to get commitments:', error);
    res.status(500).json({
      error: 'Failed to get commitments',
      details: error.message
    });
  }
});

/**
 * Mark a commitment as revealed
 */
router.put('/commitments/:walletAddress/:roomId/revealed', async (req, res) => {
  const { walletAddress, roomId } = req.params;
  const { txSignature } = req.body;

  try {
    const result = await query(`
      UPDATE player_commitments
      SET revealed = true
      WHERE wallet_address = $1 AND room_id = $2
      RETURNING *
    `, [walletAddress, roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Commitment not found'
      });
    }

    // Also update game_history if needed
    if (txSignature) {
      await query(`
        UPDATE game_history
        SET reveal_a_tx = $1
        WHERE room_id = $2 AND player_a = $3
      `, [txSignature, roomId, walletAddress]);

      await query(`
        UPDATE game_history
        SET reveal_b_tx = $1
        WHERE room_id = $2 AND player_b = $3
      `, [txSignature, roomId, walletAddress]);
    }

    res.json({
      success: true,
      message: 'Commitment marked as revealed'
    });
  } catch (error) {
    console.error('Failed to update commitment:', error);
    res.status(500).json({
      error: 'Failed to update commitment',
      details: error.message
    });
  }
});

/**
 * Get player statistics
 */
router.get('/stats/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const result = await query(`
      SELECT * FROM player_stats
      WHERE wallet_address = $1
    `, [walletAddress]);

    if (result.rows.length === 0) {
      // Return empty stats if player hasn't played yet
      return res.json({
        success: true,
        stats: {
          wallet_address: walletAddress,
          total_games: 0,
          games_won: 0,
          games_lost: 0,
          win_rate: 0,
          total_wagered: 0,
          total_won: 0
        }
      });
    }

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to get player stats:', error);
    res.status(500).json({
      error: 'Failed to get player stats',
      details: error.message
    });
  }
});

/**
 * Get leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await query(`
      SELECT wallet_address, games_won, games_lost, win_rate, total_won, total_wagered
      FROM player_stats
      WHERE games_won + games_lost >= 5  -- Minimum 5 games
      ORDER BY win_rate DESC, games_won DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      leaderboard: result.rows
    });
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
      details: error.message
    });
  }
});

/**
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const result = await query('SELECT NOW() as time, COUNT(*) as commitments FROM player_commitments');

    res.json({
      status: 'healthy',
      database: 'connected',
      commitments_stored: result.rows[0].commitments,
      timestamp: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;