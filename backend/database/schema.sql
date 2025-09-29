-- Database schema for Fair Coin Flipper
-- This schema stores critical game data to ensure players never lose their commitments

-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS player_commitments CASCADE;
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS player_stats CASCADE;

-- ============================================
-- PLAYER COMMITMENTS TABLE
-- ============================================
-- Stores commitment secrets for each player's game
-- Critical for allowing players to reveal their choices
CREATE TABLE player_commitments (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL, -- Solana wallet address
    room_id BIGINT NOT NULL,
    choice VARCHAR(10) NOT NULL, -- 'heads' or 'tails'
    choice_num INT NOT NULL, -- 0 for heads, 1 for tails
    secret VARCHAR(100) NOT NULL, -- The secret used for commitment
    commitment TEXT NOT NULL, -- The commitment hash (as JSON array)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revealed BOOLEAN DEFAULT FALSE, -- Track if this commitment has been revealed
    game_completed BOOLEAN DEFAULT FALSE,

    -- Unique constraint: one commitment per wallet per room
    CONSTRAINT unique_wallet_room UNIQUE (wallet_address, room_id),

    -- Indexes for fast lookup
    INDEX idx_wallet (wallet_address),
    INDEX idx_room (room_id),
    INDEX idx_created (created_at DESC)
);

-- ============================================
-- GAME HISTORY TABLE
-- ============================================
-- Stores complete game history for analytics and dispute resolution
CREATE TABLE game_history (
    id SERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL UNIQUE,
    player_a VARCHAR(44) NOT NULL,
    player_b VARCHAR(44),
    bet_amount DECIMAL(20, 9) NOT NULL, -- In SOL

    -- Game states
    status VARCHAR(50) NOT NULL, -- 'waiting', 'playing', 'revealing', 'completed', 'cancelled'

    -- Commitments and reveals
    commitment_a TEXT,
    commitment_b TEXT,
    choice_a VARCHAR(10),
    choice_b VARCHAR(10),

    -- Results
    winner VARCHAR(44),
    coin_result VARCHAR(10), -- Final coin flip result
    winner_payout DECIMAL(20, 9),
    house_fee DECIMAL(20, 9),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    player_b_joined_at TIMESTAMP,
    commitments_ready_at TIMESTAMP,
    resolved_at TIMESTAMP,

    -- Transaction signatures
    create_tx VARCHAR(100),
    join_tx VARCHAR(100),
    reveal_a_tx VARCHAR(100),
    reveal_b_tx VARCHAR(100),
    resolve_tx VARCHAR(100),

    -- Indexes
    INDEX idx_player_a (player_a),
    INDEX idx_player_b (player_b),
    INDEX idx_status (status),
    INDEX idx_created_history (created_at DESC)
);

-- ============================================
-- PLAYER STATS TABLE
-- ============================================
-- Aggregated statistics for each player
CREATE TABLE player_stats (
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
);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update player stats after game completion
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stats for player A
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update winner stats
        IF NEW.winner = NEW.player_a THEN
            INSERT INTO player_stats (wallet_address, games_won, total_won, total_fees_paid, last_game_at)
            VALUES (NEW.player_a, 1, NEW.winner_payout, NEW.house_fee / 2, NOW())
            ON CONFLICT (wallet_address) DO UPDATE
            SET games_won = player_stats.games_won + 1,
                total_won = player_stats.total_won + NEW.winner_payout,
                total_fees_paid = player_stats.total_fees_paid + (NEW.house_fee / 2),
                last_game_at = NOW(),
                updated_at = NOW();

            -- Update loser stats
            INSERT INTO player_stats (wallet_address, games_lost, total_lost, total_fees_paid, last_game_at)
            VALUES (NEW.player_b, 1, NEW.bet_amount, NEW.house_fee / 2, NOW())
            ON CONFLICT (wallet_address) DO UPDATE
            SET games_lost = player_stats.games_lost + 1,
                total_lost = player_stats.total_lost + NEW.bet_amount,
                total_fees_paid = player_stats.total_fees_paid + (NEW.house_fee / 2),
                last_game_at = NOW(),
                updated_at = NOW();
        ELSIF NEW.winner = NEW.player_b THEN
            -- Player B won
            INSERT INTO player_stats (wallet_address, games_won, total_won, total_fees_paid, last_game_at)
            VALUES (NEW.player_b, 1, NEW.winner_payout, NEW.house_fee / 2, NOW())
            ON CONFLICT (wallet_address) DO UPDATE
            SET games_won = player_stats.games_won + 1,
                total_won = player_stats.total_won + NEW.winner_payout,
                total_fees_paid = player_stats.total_fees_paid + (NEW.house_fee / 2),
                last_game_at = NOW(),
                updated_at = NOW();

            -- Update loser stats
            INSERT INTO player_stats (wallet_address, games_lost, total_lost, total_fees_paid, last_game_at)
            VALUES (NEW.player_a, 1, NEW.bet_amount, NEW.house_fee / 2, NOW())
            ON CONFLICT (wallet_address) DO UPDATE
            SET games_lost = player_stats.games_lost + 1,
                total_lost = player_stats.total_lost + NEW.bet_amount,
                total_fees_paid = player_stats.total_fees_paid + (NEW.house_fee / 2),
                last_game_at = NOW(),
                updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating player stats
CREATE TRIGGER update_player_stats_trigger
AFTER UPDATE ON game_history
FOR EACH ROW
EXECUTE FUNCTION update_player_stats();

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get commitment for a specific player and room
-- SELECT * FROM player_commitments WHERE wallet_address = $1 AND room_id = $2;

-- Get all active commitments for a player
-- SELECT * FROM player_commitments WHERE wallet_address = $1 AND revealed = false;

-- Get game history for a player
-- SELECT * FROM game_history WHERE player_a = $1 OR player_b = $1 ORDER BY created_at DESC;

-- Get player statistics
-- SELECT * FROM player_stats WHERE wallet_address = $1;

-- Get leaderboard
-- SELECT wallet_address, games_won, win_rate, total_won FROM player_stats ORDER BY win_rate DESC, games_won DESC LIMIT 10;