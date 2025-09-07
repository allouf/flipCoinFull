use anchor_lang::prelude::*;

#[cfg(feature = "vrf-enabled")]
use switchboard_v2::VrfAccountData;

declare_id!("4wVjz9Ajh5BVSQi6rGiiPX9mnTXQx98biyyjLEJ78grb");

pub const HOUSE_FEE_BPS: u16 = 300; // 3% = 300 basis points
pub const MIN_BET_AMOUNT: u64 = 10_000_000; // 0.01 SOL in lamports
pub const SELECTION_TIMEOUT_SECONDS: i64 = 30;
pub const QUEUE_TIMEOUT_SECONDS: i64 = 300; // 5 minutes

#[program]
pub mod coin_flipper {
    use super::*;

    /// Initialize the program with house wallet and fee configuration
    pub fn initialize(ctx: Context<Initialize>, house_fee_bps: u16) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Validate house fee (max 10% = 1000 bps)
        require!(
            house_fee_bps <= 1000,
            ErrorCode::InvalidHouseFee
        );
        
        global_state.authority = ctx.accounts.authority.key();
        global_state.house_wallet = ctx.accounts.house_wallet.key();
        global_state.house_fee_bps = house_fee_bps;
        global_state.total_games = 0;
        global_state.total_volume = 0;
        global_state.is_paused = false;
        
        msg!("Program initialized with house fee: {} bps", house_fee_bps);
        
        Ok(())
    }

    /// Create a new game room with specified bet amount
    pub fn create_room(
        ctx: Context<CreateRoom>,
        room_id: u64,
        bet_amount: u64,
    ) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        // Stats tracking removed for simplicity
        let clock = Clock::get()?;
        
        // Validate bet amount
        require!(
            bet_amount >= MIN_BET_AMOUNT,
            ErrorCode::BetTooSmall
        );
        
        // Initialize room state
        room.room_id = room_id;
        room.creator = ctx.accounts.creator.key();
        room.player_1 = ctx.accounts.creator.key();
        room.player_2 = Pubkey::default();
        room.bet_amount = bet_amount;
        room.status = RoomStatus::WaitingForPlayer;
        room.player_1_selection = None;
        room.player_2_selection = None;
        room.created_at = clock.unix_timestamp;
        room.vrf_result = None;
        room.vrf_status = VrfStatus::None;
        room.winner = None;
        room.bump = ctx.bumps.game_room;
        
        msg!("Room {} created with bet: {} lamports", room_id, bet_amount);
        
        Ok(())
    }

    /// Join an existing game room
    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        // Stats tracking removed for simplicity
        let clock = Clock::get()?;
        
        // Validate room status
        require!(
            room.status == RoomStatus::WaitingForPlayer,
            ErrorCode::RoomNotAvailable
        );
        
        // Validate joiner is not the creator
        require!(
            ctx.accounts.joiner.key() != room.creator,
            ErrorCode::CannotJoinOwnRoom
        );
        
        // Update room state
        room.player_2 = ctx.accounts.joiner.key();
        room.status = RoomStatus::SelectionsPending;
        room.selection_deadline = clock.unix_timestamp + SELECTION_TIMEOUT_SECONDS;
        
        msg!("Player {} joined room {}", ctx.accounts.joiner.key(), room.room_id);
        
        Ok(())
    }

    /// Make heads or tails selection
    pub fn make_selection(
        ctx: Context<MakeSelection>,
        selection: CoinSide,
    ) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let clock = Clock::get()?;
        let player = ctx.accounts.player.key();
        
        // Validate room status
        require!(
            room.status == RoomStatus::SelectionsPending,
            ErrorCode::InvalidRoomStatus
        );
        
        // Check if within time limit
        require!(
            clock.unix_timestamp <= room.selection_deadline,
            ErrorCode::SelectionTimeout
        );
        
        // Record selection based on player
        if player == room.player_1 {
            require!(
                room.player_1_selection.is_none(),
                ErrorCode::AlreadySelected
            );
            room.player_1_selection = Some(selection);
        } else if player == room.player_2 {
            require!(
                room.player_2_selection.is_none(),
                ErrorCode::AlreadySelected
            );
            room.player_2_selection = Some(selection);
        } else {
            return Err(ErrorCode::NotInRoom.into());
        }
        
        // Check if both players have selected
        if room.player_1_selection.is_some() && room.player_2_selection.is_some() {
            #[cfg(feature = "vrf-enabled")]
            {
                room.status = RoomStatus::Resolving; // Will request VRF next
                room.vrf_status = VrfStatus::Pending;
                msg!("Both players selected, ready for VRF request");
            }
            #[cfg(not(feature = "vrf-enabled"))]
            {
                room.status = RoomStatus::Resolving;
                msg!("Both players selected, ready to resolve");
            }
        }
        
        Ok(())
    }

    /// Request VRF randomness from Switchboard oracle
    #[cfg(feature = "vrf-enabled")]
    pub fn request_vrf(ctx: Context<RequestVrf>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        
        // Validate room status
        require!(
            room.status == RoomStatus::Resolving && room.vrf_status == VrfStatus::Pending,
            ErrorCode::InvalidRoomStatus
        );
        
        // Validate both players have made selections
        require!(
            room.player_1_selection.is_some() && room.player_2_selection.is_some(),
            ErrorCode::MissingSelections
        );

        // Update VRF status to pending
        room.vrf_status = VrfStatus::Pending;
        
        msg!("VRF randomness requested for room {}", room.room_id);
        
        Ok(())
    }

    /// VRF callback to receive randomness from Switchboard oracle
    #[cfg(feature = "vrf-enabled")]
    pub fn vrf_callback(ctx: Context<VrfCallback>, result: [u8; 32]) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        
        // Validate room status
        require!(
            room.status == RoomStatus::Resolving && room.vrf_status == VrfStatus::Pending,
            ErrorCode::InvalidRoomStatus
        );
        
        // Store VRF result
        room.vrf_result = Some(result);
        room.vrf_status = VrfStatus::Fulfilled;
        
        msg!("VRF result received for room {}", room.room_id);
        
        Ok(())
    }
    
    /// Join the matchmaking queue for automatic matching
    pub fn join_matchmaking_queue(
        ctx: Context<JoinMatchmakingQueue>,
        bet_amount: u64,
        token_mint: Pubkey,
    ) -> Result<()> {
        let queue_position = &mut ctx.accounts.queue_position;
        let clock = Clock::get()?;
        
        // Validate bet amount
        require!(
            bet_amount >= MIN_BET_AMOUNT,
            ErrorCode::BetTooSmall
        );
        
        // Initialize queue position
        queue_position.player = ctx.accounts.player.key();
        queue_position.bet_amount = bet_amount;
        queue_position.token_mint = token_mint;
        queue_position.joined_at = clock.unix_timestamp;
        queue_position.status = QueueStatus::Waiting;
        queue_position.bump = ctx.bumps.queue_position;
        
        // TODO: Implement fund escrow - deposit bet amount to PDA
        // This would require token transfer instructions
        
        msg!(
            "Player {} joined queue: {} {} tokens",
            ctx.accounts.player.key(),
            bet_amount,
            token_mint
        );
        
        Ok(())
    }
    
    /// Cancel queue position and receive instant refund
    pub fn cancel_queue_position(ctx: Context<CancelQueuePosition>) -> Result<()> {
        let queue_position = &ctx.accounts.queue_position;
        
        // Validate queue status
        require!(
            queue_position.status == QueueStatus::Waiting,
            ErrorCode::InvalidQueueStatus
        );
        
        // TODO: Implement instant refund - transfer escrowed funds back
        // This would require token transfer instructions
        
        msg!(
            "Player {} cancelled queue position",
            queue_position.player
        );
        
        Ok(())
    }
    
    /// Create a matched room from two queue positions
    pub fn create_matched_room(
        ctx: Context<CreateMatchedRoom>,
        room_id: u64,
    ) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let player1_queue = &ctx.accounts.player1_queue;
        let player2_queue = &ctx.accounts.player2_queue;
        let clock = Clock::get()?;
        
        // Validate queue positions match
        require!(
            player1_queue.bet_amount == player2_queue.bet_amount,
            ErrorCode::BetAmountMismatch
        );
        require!(
            player1_queue.token_mint == player2_queue.token_mint,
            ErrorCode::TokenMismatch
        );
        require!(
            player1_queue.status == QueueStatus::Waiting,
            ErrorCode::InvalidQueueStatus
        );
        require!(
            player2_queue.status == QueueStatus::Waiting,
            ErrorCode::InvalidQueueStatus
        );
        
        // Initialize room state
        room.room_id = room_id;
        room.creator = player1_queue.player;
        room.player_1 = player1_queue.player;
        room.player_2 = player2_queue.player;
        room.bet_amount = player1_queue.bet_amount;
        room.status = RoomStatus::SelectionsPending;
        room.player_1_selection = None;
        room.player_2_selection = None;
        room.created_at = clock.unix_timestamp;
        room.selection_deadline = clock.unix_timestamp + SELECTION_TIMEOUT_SECONDS;
        room.vrf_result = None;
        room.vrf_status = VrfStatus::None;
        room.winner = None;
        room.bump = ctx.bumps.game_room;
        
        // TODO: Update queue positions status to Matched
        // This would be handled by closing the queue position accounts
        
        msg!(
            "Matched room {} created: {} vs {} for {} tokens",
            room_id,
            player1_queue.player,
            player2_queue.player,
            player1_queue.bet_amount
        );
        
        Ok(())
    }
    
    /// Clean up abandoned queue positions after timeout
    pub fn cleanup_queue_timeout(ctx: Context<CleanupQueueTimeout>) -> Result<()> {
        let queue_position = &ctx.accounts.queue_position;
        let clock = Clock::get()?;
        
        // Check if timeout has been exceeded
        require!(
            clock.unix_timestamp > queue_position.joined_at + QUEUE_TIMEOUT_SECONDS,
            ErrorCode::QueueNotTimedOut
        );
        
        // TODO: Implement refund for timed out positions
        
        msg!(
            "Cleaned up timed out queue position for player {}",
            queue_position.player
        );
        
        Ok(())
    }

    /// Resolve game using simplified randomness (for testing)
    pub fn resolve_game(ctx: Context<ResolveGame>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let global_state = &ctx.accounts.global_state;
        let clock = Clock::get()?;
        
        // Validate room status
        require!(
            room.status == RoomStatus::Resolving,
            ErrorCode::InvalidRoomStatus
        );
        
        let coin_result = if let Some(vrf_result) = room.vrf_result {
            #[cfg(feature = "vrf-enabled")]
            {
                // Use VRF result when available
                require!(
                    room.vrf_status == VrfStatus::Fulfilled,
                    ErrorCode::InvalidRoomStatus
                );
                
                // Convert first 8 bytes of VRF result to u64 for coin flip
                let vrf_value = u64::from_le_bytes([
                    vrf_result[0], vrf_result[1], vrf_result[2], vrf_result[3],
                    vrf_result[4], vrf_result[5], vrf_result[6], vrf_result[7],
                ]);
                
                if vrf_value % 2 == 0 { CoinSide::Heads } else { CoinSide::Tails }
            }
            #[cfg(not(feature = "vrf-enabled"))]
            {
                // Fallback to pseudo-random for testing
                let pseudo_random = (clock.unix_timestamp as u64) ^ (clock.slot * 7919);
                if pseudo_random % 2 == 0 { CoinSide::Heads } else { CoinSide::Tails }
            }
        } else {
            // No VRF result available, use pseudo-random
            let pseudo_random = (clock.unix_timestamp as u64) ^ (clock.slot * 7919);
            let coin_result = if pseudo_random % 2 == 0 { CoinSide::Heads } else { CoinSide::Tails };
            
            // Store pseudo-random result
            let mut vrf_bytes = [0u8; 32];
            vrf_bytes[..8].copy_from_slice(&pseudo_random.to_le_bytes());
            room.vrf_result = Some(vrf_bytes);
            room.vrf_status = VrfStatus::None;
            
            coin_result
        };
        
        // Determine winner based on selections
        let winner = if let (Some(p1_selection), Some(p2_selection)) = 
            (room.player_1_selection, room.player_2_selection) {
            
            if p1_selection == coin_result {
                Some(room.player_1)
            } else if p2_selection == coin_result {
                Some(room.player_2)
            } else {
                // This should not happen as one player must be correct
                return Err(ErrorCode::InvalidGameState.into());
            }
        } else {
            return Err(ErrorCode::MissingSelections.into());
        };
        
        // Update room state
        room.winner = winner;
        room.status = RoomStatus::Completed;
        
        // Calculate payouts (simplified - actual transfer would happen in distribute_payout)
        let total_pot = room.bet_amount * 2;
        let house_fee = (total_pot as u128 * global_state.house_fee_bps as u128 / 10000) as u64;
        let winner_payout = total_pot.saturating_sub(house_fee);
        
        msg!(
            "Game resolved: Room {} - Winner: {} - Coin: {:?} - Payout: {}", 
            room.room_id, 
            winner.unwrap(),
            coin_result,
            winner_payout
        );
        
        Ok(())
    }
}

// Account structures
#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub house_wallet: Pubkey,
    pub house_fee_bps: u16,
    pub total_games: u64,
    pub total_volume: u64,
    pub is_paused: bool,
}

#[account]
pub struct GameRoom {
    pub room_id: u64,
    pub creator: Pubkey,
    pub player_1: Pubkey,
    pub player_2: Pubkey,
    pub bet_amount: u64,
    pub status: RoomStatus,
    pub player_1_selection: Option<CoinSide>,
    pub player_2_selection: Option<CoinSide>,
    pub created_at: i64,
    pub selection_deadline: i64,
    pub vrf_result: Option<[u8; 32]>,
    pub vrf_status: VrfStatus,
    pub winner: Option<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct PlayerStats {
    pub player: Pubkey,
    pub total_games: u64,
    pub wins: u64,
    pub losses: u64,
    pub total_wagered: u64,
    pub total_winnings: u64,
    pub bump: u8,
}

#[account]
pub struct QueuePosition {
    pub player: Pubkey,
    pub bet_amount: u64,
    pub token_mint: Pubkey,
    pub joined_at: i64,
    pub status: QueueStatus,
    pub bump: u8,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum RoomStatus {
    WaitingForPlayer,
    SelectionsPending,
    Resolving,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum CoinSide {
    Heads,
    Tails,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum VrfStatus {
    None,
    Pending,
    Fulfilled,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum QueueStatus {
    Waiting,
    Matched,
    Cancelled,
    TimedOut,
}

// Context structs
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 2 + 8 + 8 + 1,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: House wallet for fee collection
    pub house_wallet: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: u64)]
pub struct CreateRoom<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 8 + 8 + 33 + 1 + 33 + 1,
        seeds = [b"game_room", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: Player stats account - will be initialized if needed
    #[account(mut)]
    pub creator_stats: AccountInfo<'info>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinRoom<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::WaitingForPlayer @ ErrorCode::RoomNotAvailable
    )]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: Player stats account - will be initialized if needed
    #[account(mut)]
    pub joiner_stats: AccountInfo<'info>,
    
    #[account(mut)]
    pub joiner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeSelection<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::SelectionsPending @ ErrorCode::InvalidRoomStatus
    )]
    pub game_room: Account<'info, GameRoom>,
    
    pub player: Signer<'info>,
}

#[cfg(feature = "vrf-enabled")]
#[derive(Accounts)]
pub struct RequestVrf<'info> {
    #[account(mut)]
    pub game_room: Account<'info, GameRoom>,
    
    pub signer: Signer<'info>,
}

#[cfg(feature = "vrf-enabled")]
#[derive(Accounts)]
pub struct VrfCallback<'info> {
    #[account(mut)]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: VRF oracle account - validated by Switchboard program
    #[account(
        constraint = vrf_oracle.owner == &switchboard_v2::ID @ ErrorCode::VrfAccountInvalid
    )]
    pub vrf_oracle: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct JoinMatchmakingQueue<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + 32 + 8 + 32 + 8 + 1 + 1,
        seeds = [b"queue_position", player.key().as_ref()],
        bump
    )]
    pub queue_position: Account<'info, QueuePosition>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelQueuePosition<'info> {
    #[account(
        mut,
        close = player,
        seeds = [b"queue_position", player.key().as_ref()],
        bump
    )]
    pub queue_position: Account<'info, QueuePosition>,
    
    #[account(mut)]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(room_id: u64)]
pub struct CreateMatchedRoom<'info> {
    #[account(
        init,
        payer = matcher,
        space = 8 + 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 8 + 8 + 33 + 1 + 33 + 1,
        seeds = [b"matched_room", &room_id.to_le_bytes()],
        bump
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        mut,
        close = matcher,
        seeds = [b"queue_position", player1_queue.player.as_ref()],
        bump
    )]
    pub player1_queue: Account<'info, QueuePosition>,
    
    #[account(
        mut,
        close = matcher,
        seeds = [b"queue_position", player2_queue.player.as_ref()],
        bump
    )]
    pub player2_queue: Account<'info, QueuePosition>,
    
    #[account(mut)]
    pub matcher: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CleanupQueueTimeout<'info> {
    #[account(
        mut,
        close = cleaner,
        seeds = [b"queue_position", queue_position.player.as_ref()],
        bump
    )]
    pub queue_position: Account<'info, QueuePosition>,
    
    #[account(mut)]
    pub cleaner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveGame<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::Resolving @ ErrorCode::InvalidRoomStatus
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub resolver: Signer<'info>,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("House fee cannot exceed 10%")]
    InvalidHouseFee,
    
    #[msg("Bet amount is below minimum")]
    BetTooSmall,
    
    #[msg("Room is not available for joining")]
    RoomNotAvailable,
    
    #[msg("Cannot join your own room")]
    CannotJoinOwnRoom,
    
    #[msg("Invalid room status for this operation")]
    InvalidRoomStatus,
    
    #[msg("Selection timeout exceeded")]
    SelectionTimeout,
    
    #[msg("Player has already made a selection")]
    AlreadySelected,
    
    #[msg("Player is not in this room")]
    NotInRoom,
    
    #[msg("Invalid game state")]
    InvalidGameState,
    
    #[msg("Missing player selections")]
    MissingSelections,
    
    #[cfg(feature = "vrf-enabled")]
    #[msg("VRF account is invalid or not authorized")]
    VrfAccountInvalid,
    
    #[cfg(feature = "vrf-enabled")]
    #[msg("VRF request has timed out")]
    VrfTimeout,
    
    #[msg("Invalid queue status for this operation")]
    InvalidQueueStatus,
    
    #[msg("Bet amounts do not match")]
    BetAmountMismatch,
    
    #[msg("Token types do not match")]
    TokenMismatch,
    
    #[msg("Queue position has not timed out yet")]
    QueueNotTimedOut,
}