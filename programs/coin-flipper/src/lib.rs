use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};

#[cfg(feature = "vrf-enabled")]
use switchboard_v2::VrfAccountData;

declare_id!("EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou");

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
        global_state.bump = ctx.bumps.global_state;
        
        msg!("Program initialized with house fee: {} bps", house_fee_bps);
        
        Ok(())
    }

    /// Create a new game room with specified bet amount and escrow funds
    pub fn create_room(
        ctx: Context<CreateRoom>,
        room_id: u64,
        bet_amount: u64,
    ) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let clock = Clock::get()?;
        
        // Validate bet amount
        require!(
            bet_amount >= MIN_BET_AMOUNT,
            ErrorCode::BetTooSmall
        );
        
        // Transfer bet amount from creator to escrow PDA
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
            }
        );
        transfer(transfer_ctx, bet_amount)?;
        
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
        room.selection_deadline = 0;
        room.vrf_result = None;
        room.vrf_status = VrfStatus::None;
        room.winner = None;
        room.total_pot = bet_amount;
        room.bump = ctx.bumps.game_room;
        room.escrow_bump = ctx.bumps.escrow_account;
        
        msg!("Room {} created with bet: {} lamports, funds escrowed", room_id, bet_amount);
        
        Ok(())
    }

    /// Join an existing game room and escrow matching funds
    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
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
        
        // Transfer matching bet amount from joiner to escrow PDA
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.joiner.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
            }
        );
        transfer(transfer_ctx, room.bet_amount)?;
        
        // Update room state
        room.player_2 = ctx.accounts.joiner.key();
        room.status = RoomStatus::SelectionsPending;
        room.selection_deadline = clock.unix_timestamp + SELECTION_TIMEOUT_SECONDS;
        room.total_pot = room.bet_amount * 2; // Now both players have contributed
        
        msg!("Player {} joined room {} with {} lamports", 
            ctx.accounts.joiner.key(), 
            room.room_id,
            room.bet_amount
        );
        
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
            room.status = RoomStatus::Resolving;
            msg!("Both players selected, ready to resolve");
        }
        
        Ok(())
    }

    /// Resolve game and distribute payouts
    pub fn resolve_game(ctx: Context<ResolveGame>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let global_state = &ctx.accounts.global_state;
        let clock = Clock::get()?;
        
        // Validate room status
        require!(
            room.status == RoomStatus::Resolving,
            ErrorCode::InvalidRoomStatus
        );
        
        // Validate both players have made selections
        require!(
            room.player_1_selection.is_some() && room.player_2_selection.is_some(),
            ErrorCode::MissingSelections
        );
        
        // Generate coin flip result (pseudo-random for now)
        let pseudo_random = (clock.unix_timestamp as u64) ^ (clock.slot * 7919) ^ room.room_id;
        let coin_result = if pseudo_random % 2 == 0 { CoinSide::Heads } else { CoinSide::Tails };
        
        // Store result
        let mut vrf_bytes = [0u8; 32];
        vrf_bytes[..8].copy_from_slice(&pseudo_random.to_le_bytes());
        room.vrf_result = Some(vrf_bytes);
        
        // Determine winner based on selections
        let (winner, winner_account) = if let (Some(p1_selection), Some(p2_selection)) = 
            (room.player_1_selection, room.player_2_selection) {
            
            if p1_selection == coin_result {
                (Some(room.player_1), &ctx.accounts.player_1)
            } else if p2_selection == coin_result {
                (Some(room.player_2), &ctx.accounts.player_2)
            } else {
                // This should not happen as one player must be correct
                return Err(ErrorCode::InvalidGameState.into());
            }
        } else {
            return Err(ErrorCode::MissingSelections.into());
        };
        
        // Calculate payouts
        let total_pot = room.total_pot;
        let house_fee = (total_pot as u128 * global_state.house_fee_bps as u128 / 10000) as u64;
        let winner_payout = total_pot.saturating_sub(house_fee);
        
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
        
        // Transfer winner payout from escrow to winner
        let winner_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: winner_account.to_account_info(),
            },
            escrow_signer,
        );
        transfer(winner_transfer_ctx, winner_payout)?;
        
        // Transfer house fee from escrow to house wallet
        if house_fee > 0 {
            let house_transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_account.to_account_info(),
                    to: ctx.accounts.house_wallet.to_account_info(),
                },
                escrow_signer,
            );
            transfer(house_transfer_ctx, house_fee)?;
        }
        
        // Update room state and global statistics
        room.winner = winner;
        room.status = RoomStatus::Completed;
        
        // Update global state
        let global_state = &mut ctx.accounts.global_state;
        global_state.total_games = global_state.total_games.saturating_add(1);
        global_state.total_volume = global_state.total_volume.saturating_add(total_pot);
        
        msg!(
            "Game resolved: Room {} - Winner: {} - Coin: {:?} - Payout: {} - House Fee: {}", 
            room.room_id, 
            winner.unwrap(),
            coin_result,
            winner_payout,
            house_fee
        );
        
        Ok(())
    }

    /// Handle timeout scenarios - refund players if game doesn't complete
    pub fn handle_timeout(ctx: Context<HandleTimeout>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let clock = Clock::get()?;
        
        // Check if timeout conditions are met
        require!(
            room.status == RoomStatus::SelectionsPending && 
            clock.unix_timestamp > room.selection_deadline,
            ErrorCode::InvalidTimeoutCondition
        );
        
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
        
        // Refund both players their original bets
        let refund_amount = room.bet_amount;
        
        // Refund player 1
        let p1_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.player_1.to_account_info(),
            },
            escrow_signer,
        );
        transfer(p1_transfer_ctx, refund_amount)?;
        
        // Refund player 2 if they joined
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
        }
        
        // Update room status
        room.status = RoomStatus::Cancelled;
        
        msg!("Room {} timed out - players refunded", room.room_id);
        
        Ok(())
    }

    /// Emergency pause function (only authority can call)
    pub fn pause_program(ctx: Context<PauseProgram>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            ErrorCode::Unauthorized
        );
        
        global_state.is_paused = true;
        msg!("Program paused by authority");
        
        Ok(())
    }

    /// Emergency unpause function (only authority can call)
    pub fn unpause_program(ctx: Context<UnpauseProgram>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            ErrorCode::Unauthorized
        );
        
        global_state.is_paused = false;
        msg!("Program unpaused by authority");
        
        Ok(())
    }
}

// Account structures
#[account]
pub struct GlobalState {
    pub authority: Pubkey,        // 32
    pub house_wallet: Pubkey,     // 32
    pub house_fee_bps: u16,       // 2
    pub total_games: u64,         // 8
    pub total_volume: u64,        // 8
    pub is_paused: bool,          // 1
    pub bump: u8,                 // 1
} // Total: 84 bytes + 8 (discriminator) = 92

#[account]
pub struct GameRoom {
    pub room_id: u64,                           // 8
    pub creator: Pubkey,                        // 32
    pub player_1: Pubkey,                       // 32
    pub player_2: Pubkey,                       // 32
    pub bet_amount: u64,                        // 8
    pub status: RoomStatus,                     // 1
    pub player_1_selection: Option<CoinSide>,   // 2
    pub player_2_selection: Option<CoinSide>,   // 2
    pub created_at: i64,                        // 8
    pub selection_deadline: i64,                // 8
    pub vrf_result: Option<[u8; 32]>,          // 33
    pub vrf_status: VrfStatus,                  // 1
    pub winner: Option<Pubkey>,                 // 33
    pub total_pot: u64,                         // 8
    pub bump: u8,                               // 1
    pub escrow_bump: u8,                        // 1
} // Total: 207 bytes + 8 (discriminator) = 215

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

// Context structs
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 84, // discriminator + GlobalState size
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
        space = 8 + 207, // discriminator + GameRoom size
        seeds = [b"game_room", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: Escrow PDA to hold game funds
    #[account(
        mut,
        seeds = [b"escrow", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
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
    
    /// CHECK: Escrow PDA to hold game funds
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
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
    
    /// CHECK: Escrow PDA holding the game funds
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    /// CHECK: Player 1 account for potential payout
    #[account(mut)]
    pub player_1: AccountInfo<'info>,
    
    /// CHECK: Player 2 account for potential payout
    #[account(mut)]
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
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::SelectionsPending @ ErrorCode::InvalidRoomStatus
    )]
    pub game_room: Account<'info, GameRoom>,
    
    /// CHECK: Escrow PDA holding the game funds
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = game_room.escrow_bump
    )]
    pub escrow_account: AccountInfo<'info>,
    
    /// CHECK: Player 1 account for refund
    #[account(mut)]
    pub player_1: AccountInfo<'info>,
    
    /// CHECK: Player 2 account for refund
    #[account(mut)]
    pub player_2: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PauseProgram<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnpauseProgram<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub authority: Signer<'info>,
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
    
    #[msg("Invalid timeout condition")]
    InvalidTimeoutCondition,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Invalid house wallet")]
    InvalidHouseWallet,
    
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    
    #[msg("Program is paused")]
    ProgramPaused,
}