use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

declare_id!("DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp");

/// House fee in basis points (3% = 300 basis points)
pub const HOUSE_FEE_BPS: u16 = 300;
/// Minimum bet amount (0.01 SOL)
pub const MIN_BET_AMOUNT: u64 = 10_000_000;
/// Maximum bet amount (1000 SOL) - prevents excessive risk
pub const MAX_BET_AMOUNT: u64 = 1_000_000_000_000;
/// Maximum house fee allowed (10% = 1000 basis points)
pub const MAX_HOUSE_FEE_BPS: u16 = 1000;
/// Resolution fee per player (0.001 SOL each = 0.002 SOL total)
/// This covers the cost of the complex auto-resolution transaction with multiple CPI calls
pub const RESOLUTION_FEE_PER_PLAYER: u64 = 1_000_000;
/// Room expiry timeout (2 hours in seconds)
pub const ROOM_EXPIRY_SECONDS: i64 = 7200;
/// Selection timeout (10 minutes in seconds)
pub const SELECTION_TIMEOUT_SECONDS: i64 = 600;

/// Helper function to validate escrow has sufficient balance before transfers
fn validate_escrow_balance(escrow_account: &AccountInfo, required_amount: u64) -> Result<()> {
    require!(
        escrow_account.lamports() >= required_amount,
        ErrorCode::InsufficientEscrowFunds
    );
    Ok(())
}

#[program]
pub mod coin_flipper {
    use super::*;

    /// Initialize the program with house wallet and fee configuration
    /// Only callable once by the program authority
    pub fn initialize(ctx: Context<Initialize>, house_fee_bps: u16) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Validate house fee is within reasonable bounds
        require!(
            house_fee_bps <= MAX_HOUSE_FEE_BPS,
            ErrorCode::InvalidHouseFee
        );
        
        // Initialize global state
        global_state.authority = ctx.accounts.authority.key();
        global_state.house_wallet = ctx.accounts.house_wallet.key();
        global_state.house_fee_bps = house_fee_bps;
        global_state.total_games = 0;
        global_state.total_volume = 0;
        global_state.is_paused = false;
        global_state.bump = ctx.bumps.global_state;
        
        msg!("Coin Flipper initialized - House fee: {} bps, Authority: {}", 
            house_fee_bps, global_state.authority);
        
        Ok(())
    }

    /// Create a new game room with specified bet amount
    /// Escrowing the creator's funds immediately for security
    pub fn create_room(
        ctx: Context<CreateRoom>,
        room_id: u64,
        bet_amount: u64,
    ) -> Result<()> {
        let global_state = &ctx.accounts.global_state;
        
        // Check if program is paused
        require!(!global_state.is_paused, ErrorCode::ProgramPaused);
        
        // Validate bet amount is within allowed range
        require!(
            bet_amount >= MIN_BET_AMOUNT && bet_amount <= MAX_BET_AMOUNT,
            ErrorCode::InvalidBetAmount
        );
        
        let room = &mut ctx.accounts.game_room;
        let clock = Clock::get()?;
        
        // Transfer bet amount + resolution fee share from creator to escrow PDA
        let total_contribution = bet_amount + RESOLUTION_FEE_PER_PLAYER;
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
            }
        );
        transfer(transfer_ctx, total_contribution)?;
        
        // Initialize room state with secure defaults
        room.room_id = room_id;
        room.creator = ctx.accounts.creator.key();
        room.player_1 = ctx.accounts.creator.key();
        room.player_2 = Pubkey::default(); // Will be set when someone joins
        room.bet_amount = bet_amount;
        room.status = RoomStatus::WaitingForPlayer;
        room.player_1_selection = None;
        room.player_2_selection = None;
        room.created_at = clock.unix_timestamp;
        room.vrf_result = None;
        room.winner = None;
        room.total_pot = bet_amount; // Only creator's bet initially (resolution fees separate)
        room.bump = ctx.bumps.game_room;
        room.escrow_bump = ctx.bumps.escrow_account;
        
        msg!("Room {} created - Bet: {} lamports (+ {} resolution fee), Creator: {}", 
            room_id, bet_amount, RESOLUTION_FEE_PER_PLAYER, ctx.accounts.creator.key());
        
        Ok(())
    }

    /// Join an existing game room
    /// Immediately escrows the joiner's matching bet amount
    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        let global_state = &ctx.accounts.global_state;
        
        // Check if program is paused
        require!(!global_state.is_paused, ErrorCode::ProgramPaused);
        
        let room = &mut ctx.accounts.game_room;
        let clock = Clock::get()?;
        
        // Validate room is available for joining
        require!(
            room.status == RoomStatus::WaitingForPlayer,
            ErrorCode::RoomNotAvailable
        );
        
        // Ensure joiner is not the room creator
        require!(
            ctx.accounts.joiner.key() != room.creator,
            ErrorCode::CannotJoinOwnRoom
        );
        
        // Check for room expiry (optional cleanup mechanism)
        let room_age = clock.unix_timestamp - room.created_at;
        require!(room_age < ROOM_EXPIRY_SECONDS, ErrorCode::RoomExpired);
        
        // Transfer matching bet amount + resolution fee share from joiner to escrow PDA
        let total_contribution = room.bet_amount + RESOLUTION_FEE_PER_PLAYER;
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.joiner.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
            }
        );
        transfer(transfer_ctx, total_contribution)?;
        
        // Update room state - now both players have contributed
        room.player_2 = ctx.accounts.joiner.key();
        room.status = RoomStatus::SelectionsPending;
        room.total_pot = room.bet_amount.checked_mul(2)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        msg!("Player {} joined room {} - Total pot: {} lamports (+ {} total resolution fees)", 
            ctx.accounts.joiner.key(), room.room_id, room.total_pot, RESOLUTION_FEE_PER_PLAYER * 2);
        
        Ok(())
    }

    /// Make heads or tails selection
    /// Both players must select before game can be resolved
    pub fn make_selection(
        ctx: Context<MakeSelection>,
        selection: CoinSide,
    ) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let player = ctx.accounts.player.key();
        
        // Validate room is in selection phase
        require!(
            room.status == RoomStatus::SelectionsPending,
            ErrorCode::InvalidRoomStatus
        );
        
        // Record player's selection
        if player == room.player_1 {
            require!(
                room.player_1_selection.is_none(),
                ErrorCode::AlreadySelected
            );
            room.player_1_selection = Some(selection);
            msg!("Player 1 selected: {:?}", selection);
        } else if player == room.player_2 {
            require!(
                room.player_2_selection.is_none(),
                ErrorCode::AlreadySelected
            );
            room.player_2_selection = Some(selection);
            msg!("Player 2 selected: {:?}", selection);
        } else {
            return Err(ErrorCode::NotInRoom.into());
        }
        
        // If both players have selected, auto-resolve immediately
        if room.player_1_selection.is_some() && room.player_2_selection.is_some() {
            msg!("Both players selected - Auto-resolving room {}", room.room_id);
            
            // Perform auto-resolution logic inline
            let global_state = &mut ctx.accounts.global_state;
            let clock = Clock::get()?;
            
            // Get both selections (we know they exist from the check above)
            let p1_selection = room.player_1_selection.unwrap();
            let p2_selection = room.player_2_selection.unwrap();
            
            // Generate coin flip result using multiple entropy sources
            let entropy = clock.unix_timestamp as u64
                ^ clock.slot
                ^ clock.epoch
                ^ room.room_id
                ^ ctx.accounts.player.key().to_bytes()[0] as u64;
            
            // Use a more sophisticated PRNG approach
            let mut seed = entropy;
            seed ^= seed >> 33;
            seed = seed.wrapping_mul(0xff51afd7ed558ccd);
            seed ^= seed >> 33;
            seed = seed.wrapping_mul(0xc4ceb9fe1a85ec53);
            seed ^= seed >> 33;
            
            let coin_result = if seed % 2 == 0 { CoinSide::Heads } else { CoinSide::Tails };
            
            // Store randomness result for transparency
            let mut vrf_bytes = [0u8; 32];
            vrf_bytes[..8].copy_from_slice(&entropy.to_le_bytes());
            vrf_bytes[8..16].copy_from_slice(&seed.to_le_bytes());
            room.vrf_result = Some(vrf_bytes);
            
            msg!("Auto-resolve: Coin result {:?}, P1 choice {:?}, P2 choice {:?}", 
                 coin_result, p1_selection, p2_selection);
            
            // Handle tie scenario (both players chose the same side)
            if p1_selection == p2_selection {
                msg!("Tie scenario detected: Both players chose {:?}. Refunding bets.", p1_selection);
                
                // In a tie, refund each player their bet + resolution fee share
                let refund_per_player = room.bet_amount + RESOLUTION_FEE_PER_PLAYER;
                
                // Validate escrow has sufficient funds for both refunds
                let total_refund = refund_per_player * 2;
                validate_escrow_balance(&ctx.accounts.escrow_account, total_refund)?;
                
                // Create escrow PDA seeds for signing transfers
                let room_id_bytes = room.room_id.to_le_bytes();
                let creator_key = room.creator;
                let escrow_seeds = &[
                    b"escrow",
                    creator_key.as_ref(),
                    room_id_bytes.as_ref(),
                    &[room.escrow_bump],
                ];
                let escrow_signer = &[&escrow_seeds[..]];
                
                // Refund Player 1
                let p1_refund_ctx = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_account.to_account_info(),
                        to: ctx.accounts.player_1.to_account_info(),
                    },
                    escrow_signer,
                );
                transfer(p1_refund_ctx, refund_per_player)?;
                
                // Refund Player 2
                let p2_refund_ctx = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_account.to_account_info(),
                        to: ctx.accounts.player_2.to_account_info(),
                    },
                    escrow_signer,
                );
                transfer(p2_refund_ctx, refund_per_player)?;
                
                // Mark room as completed with no winner (tie)
                room.status = RoomStatus::Completed;
                room.winner = None;
                
                msg!("Tie resolved - Both players refunded {} lamports each", refund_per_player);
                
                return Ok(());
            }
            
            // Normal game resolution - determine winner
            let (winner, winner_account) = if p1_selection == coin_result {
                (Some(room.player_1), &ctx.accounts.player_1)
            } else if p2_selection == coin_result {
                (Some(room.player_2), &ctx.accounts.player_2) 
            } else {
                // This should never happen as one player must be correct
                return Err(ErrorCode::InvalidGameState.into());
            };
            
            // Calculate payouts with overflow protection
            let total_pot = room.total_pot; // This is just the bet amounts (2 * bet_amount)
            let house_fee = (total_pot as u128)
                .checked_mul(global_state.house_fee_bps as u128)
                .ok_or(ErrorCode::ArithmeticOverflow)?
                .checked_div(10000)
                .ok_or(ErrorCode::ArithmeticOverflow)? as u64;
            
            let winner_payout = total_pot
                .checked_sub(house_fee)
                .ok_or(ErrorCode::ArithmeticUnderflow)?;
            
            // Validate escrow has sufficient funds for all transfers
            let total_house_collection = house_fee + (RESOLUTION_FEE_PER_PLAYER * 2);
            let total_required = winner_payout + total_house_collection;
            validate_escrow_balance(&ctx.accounts.escrow_account, total_required)?;
            
            // Create escrow PDA seeds for signing transfers
            let room_id_bytes = room.room_id.to_le_bytes();
            let creator_key = room.creator;
            let escrow_seeds = &[
                b"escrow",
                creator_key.as_ref(),
                room_id_bytes.as_ref(),
                &[room.escrow_bump],
            ];
            let escrow_signer = &[&escrow_seeds[..]];
            
            // Transfer winner payout
            if winner_payout > 0 {
                let winner_transfer_ctx = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_account.to_account_info(),
                        to: winner_account.to_account_info(),
                    },
                    escrow_signer,
                );
                transfer(winner_transfer_ctx, winner_payout)?;
            }
            
            // Transfer house fee from bet winnings + resolution fees to house wallet
            if total_house_collection > 0 {
                let house_transfer_ctx = CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_account.to_account_info(),
                        to: ctx.accounts.house_wallet.to_account_info(),
                    },
                    escrow_signer,
                );
                transfer(house_transfer_ctx, total_house_collection)?;
            }
            
            // Update room state
            room.winner = winner;
            room.status = RoomStatus::Completed;
            
            // Update global statistics
            global_state.total_games = global_state.total_games.saturating_add(1);
            global_state.total_volume = global_state.total_volume.saturating_add(total_pot);
            
            msg!(
                "Game auto-resolved - Room: {}, Winner: {}, Coin: {:?}, Payout: {}, House fees: {}",
                room.room_id,
                winner.unwrap(),
                coin_result,
                winner_payout,
                total_house_collection
            );
        }
        
        Ok(())
    }

    /// DEPRECATED: Manual resolution is no longer needed
    /// Games now auto-resolve when both players make selections
    pub fn resolve_game(_ctx: Context<ResolveGame>) -> Result<()> {
        // DEPRECATED: Manual resolution is no longer needed
        // Games now auto-resolve when both players make selections
        Err(ErrorCode::InvalidRoomStatus.into())
    }

    /// Handle timeout scenarios by refunding both players
    /// Can be called by anyone after the timeout period
    pub fn handle_timeout(ctx: Context<HandleTimeout>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let clock = Clock::get()?;
        
        // Validate timeout conditions
        let timeout_threshold = match room.status {
            RoomStatus::WaitingForPlayer => {
                // Room expires after 2 hours if no one joins
                room.created_at + ROOM_EXPIRY_SECONDS
            },
            RoomStatus::SelectionsPending => {
                // Give players reasonable time to make selections
                room.created_at + SELECTION_TIMEOUT_SECONDS
            },
            _ => return Err(ErrorCode::InvalidTimeoutCondition.into()),
        };
        
        require!(
            clock.unix_timestamp > timeout_threshold,
            ErrorCode::TimeoutNotReached
        );
        
        // Calculate total refund needed and validate escrow balance
        let refund_amount = room.bet_amount + RESOLUTION_FEE_PER_PLAYER;
        let total_refund_needed = if room.player_2 != Pubkey::default() {
            refund_amount * 2  // Both players need refund
        } else {
            refund_amount      // Only creator needs refund
        };
        validate_escrow_balance(&ctx.accounts.escrow_account, total_refund_needed)?;
        
        // Create escrow PDA seeds for signing
        let room_id_bytes = room.room_id.to_le_bytes();
        let creator_key = room.creator;
        let escrow_seeds = &[
            b"escrow",
            creator_key.as_ref(),
            room_id_bytes.as_ref(),
            &[room.escrow_bump],
        ];
        let escrow_signer = &[&escrow_seeds[..]];
        
        // Refund creator (player 1) their bet + resolution fee share
        let p1_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.player_1.to_account_info(),
            },
            escrow_signer,
        );
        transfer(p1_transfer_ctx, refund_amount)?;
        
        // Refund player 2 if they joined (bet + resolution fee share)
        if room.player_2 != Pubkey::default() {
            let p2_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_account.to_account_info(),
                    to: ctx.accounts.player_2.to_account_info(),
                },
                escrow_signer,
            );
            transfer(p2_transfer_ctx, refund_amount)?;
        } else {
            // If player 2 never joined, creator gets full refund including their resolution fee
            // This is already handled above as refund_amount includes resolution fee
        }
        
        // Mark room as cancelled
        room.status = RoomStatus::Cancelled;
        
        msg!("Room {} timed out - All players refunded", room.room_id);
        
        Ok(())
    }

    /// Emergency pause function - only callable by program authority
    pub fn pause_program(ctx: Context<AdminAction>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Verify caller is the program authority
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            ErrorCode::Unauthorized
        );
        
        global_state.is_paused = true;
        msg!("Program paused by authority: {}", ctx.accounts.authority.key());
        
        Ok(())
    }

    /// Emergency unpause function - only callable by program authority
    pub fn unpause_program(ctx: Context<AdminAction>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Verify caller is the program authority
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            ErrorCode::Unauthorized
        );
        
        global_state.is_paused = false;
        msg!("Program unpaused by authority: {}", ctx.accounts.authority.key());
        
        Ok(())
    }

    /// Update house fee - only callable by program authority
    pub fn update_house_fee(ctx: Context<AdminAction>, new_fee_bps: u16) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Verify caller is the program authority
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            ErrorCode::Unauthorized
        );
        
        // Validate new fee is reasonable
        require!(
            new_fee_bps <= MAX_HOUSE_FEE_BPS,
            ErrorCode::InvalidHouseFee
        );
        
        let old_fee = global_state.house_fee_bps;
        global_state.house_fee_bps = new_fee_bps;
        
        msg!("House fee updated from {} bps to {} bps", old_fee, new_fee_bps);
        
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

/// Global program state - stores program configuration and statistics
#[account]
pub struct GlobalState {
    /// Program authority (can pause/unpause, update fees)
    pub authority: Pubkey,        // 32 bytes
    /// House wallet for fee collection
    pub house_wallet: Pubkey,     // 32 bytes
    /// House fee in basis points (e.g., 300 = 3%)
    pub house_fee_bps: u16,       // 2 bytes
    /// Total number of completed games
    pub total_games: u64,         // 8 bytes
    /// Total volume of all bets combined
    pub total_volume: u64,        // 8 bytes
    /// Emergency pause flag
    pub is_paused: bool,          // 1 byte
    /// PDA bump seed
    pub bump: u8,                 // 1 byte
} // Total: 84 bytes + 8 (discriminator) = 92 bytes

/// Individual game room state
#[account]
pub struct GameRoom {
    /// Unique room identifier
    pub room_id: u64,                           // 8 bytes
    /// Room creator (also player_1)
    pub creator: Pubkey,                        // 32 bytes
    /// First player (same as creator)
    pub player_1: Pubkey,                       // 32 bytes
    /// Second player (joins the room)
    pub player_2: Pubkey,                       // 32 bytes
    /// Bet amount in lamports
    pub bet_amount: u64,                        // 8 bytes
    /// Current room status
    pub status: RoomStatus,                     // 1 byte
    /// Player 1's coin selection
    pub player_1_selection: Option<CoinSide>,   // 2 bytes (1 + 1)
    /// Player 2's coin selection
    pub player_2_selection: Option<CoinSide>,   // 2 bytes (1 + 1)
    /// Room creation timestamp
    pub created_at: i64,                        // 8 bytes
    /// VRF/randomness result for transparency
    pub vrf_result: Option<[u8; 32]>,          // 33 bytes (1 + 32)
    /// Game winner (if completed)
    pub winner: Option<Pubkey>,                 // 33 bytes (1 + 32)
    /// Total pot size (both players' bets)
    pub total_pot: u64,                         // 8 bytes
    /// PDA bump seed for game room
    pub bump: u8,                               // 1 byte
    /// PDA bump seed for escrow account
    pub escrow_bump: u8,                        // 1 byte
} // Total: 199 bytes + 8 (discriminator) = 207 bytes

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum RoomStatus {
    /// Waiting for a second player to join
    WaitingForPlayer,
    /// Both players joined, waiting for selections
    SelectionsPending,
    /// Both players selected, ready to resolve
    Resolving,
    /// Game completed successfully
    Completed,
    /// Game cancelled (timeout or other reason)
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum CoinSide {
    Heads,
    Tails,
}

// ============================================================================
// Context Structures
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 84, // discriminator + GlobalState
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: House wallet for fee collection - validated by authority
    pub house_wallet: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(room_id: u64)]
pub struct CreateRoom<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 199, // discriminator + GameRoom
        seeds = [b"game_room", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: Escrow PDA to hold game funds securely
    #[account(
        mut,
        seeds = [b"escrow", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
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
    
    /// CHECK: Escrow PDA - seeds validated
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(mut)]
    pub joiner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeSelection<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::SelectionsPending @ ErrorCode::InvalidRoomStatus,
        constraint = player.key() == game_room.player_1 || player.key() == game_room.player_2 @ ErrorCode::NotInRoom
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// CHECK: Escrow PDA holding game funds
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    /// CHECK: Player 1 for potential payout
    #[account(
        mut,
        constraint = player_1.key() == game_room.player_1 @ ErrorCode::InvalidPlayer
    )]
    pub player_1: AccountInfo<'info>,
    
    /// CHECK: Player 2 for potential payout
    #[account(
        mut,
        constraint = player_2.key() == game_room.player_2 @ ErrorCode::InvalidPlayer
    )]
    pub player_2: AccountInfo<'info>,
    
    /// CHECK: House wallet for fee collection
    #[account(
        mut,
        constraint = house_wallet.key() == global_state.house_wallet @ ErrorCode::InvalidHouseWallet
    )]
    pub house_wallet: AccountInfo<'info>,
    
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveGame<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::Resolving @ ErrorCode::InvalidRoomStatus
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// CHECK: Escrow PDA holding game funds
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    /// CHECK: Player 1 for payout
    #[account(
        mut,
        constraint = player_1.key() == game_room.player_1 @ ErrorCode::InvalidPlayer
    )]
    pub player_1: AccountInfo<'info>,
    
    /// CHECK: Player 2 for payout
    #[account(
        mut,
        constraint = player_2.key() == game_room.player_2 @ ErrorCode::InvalidPlayer
    )]
    pub player_2: AccountInfo<'info>,
    
    /// CHECK: House wallet for fee collection
    #[account(
        mut,
        constraint = house_wallet.key() == global_state.house_wallet @ ErrorCode::InvalidHouseWallet
    )]
    pub house_wallet: AccountInfo<'info>,
    
    pub resolver: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct HandleTimeout<'info> {
    #[account(mut)]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: Escrow PDA holding funds
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    /// CHECK: Player 1 for refund
    #[account(
        mut,
        constraint = player_1.key() == game_room.player_1 @ ErrorCode::InvalidPlayer
    )]
    pub player_1: AccountInfo<'info>,
    
    /// CHECK: Player 2 for refund
    #[account(
        mut,
        constraint = player_2.key() == game_room.player_2 @ ErrorCode::InvalidPlayer
    )]
    pub player_2: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub authority: Signer<'info>,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("House fee cannot exceed maximum allowed percentage")]
    InvalidHouseFee,
    
    #[msg("Bet amount is outside allowed range")]
    InvalidBetAmount,
    
    #[msg("Room is not available for joining")]
    RoomNotAvailable,
    
    #[msg("Cannot join your own room")]
    CannotJoinOwnRoom,
    
    #[msg("Invalid room status for this operation")]
    InvalidRoomStatus,
    
    #[msg("Player has already made a selection")]
    AlreadySelected,
    
    #[msg("Player is not participating in this room")]
    NotInRoom,
    
    #[msg("Invalid game state detected")]
    InvalidGameState,
    
    #[msg("Both players must make selections before resolving")]
    MissingSelections,
    
    #[msg("Timeout condition not met")]
    InvalidTimeoutCondition,
    
    #[msg("Timeout period has not been reached")]
    TimeoutNotReached,
    
    #[msg("Unauthorized access - invalid authority")]
    Unauthorized,
    
    #[msg("Invalid house wallet provided")]
    InvalidHouseWallet,
    
    #[msg("Invalid player account")]
    InvalidPlayer,
    
    #[msg("Program is currently paused")]
    ProgramPaused,
    
    #[msg("Room has expired and cannot be joined")]
    RoomExpired,
    
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    
    #[msg("Arithmetic underflow occurred")]
    ArithmeticUnderflow,
    
    #[msg("Escrow account has insufficient funds")]
    InsufficientEscrowFunds,
}
