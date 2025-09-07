use anchor_lang::prelude::*;
use switchboard_v2::{AggregatorAccountData, SwitchboardDecimal, SWITCHBOARD_PROGRAM_ID};
use std::convert::TryInto;

declare_id!("CoinF1ipperProgramID11111111111111111111111");

pub const HOUSE_FEE_BPS: u16 = 300; // 3% = 300 basis points
pub const MIN_BET_AMOUNT: u64 = 10_000_000; // 0.01 SOL in lamports
pub const SELECTION_TIMEOUT_SECONDS: i64 = 30;

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
        let escrow = &mut ctx.accounts.escrow_account;
        let creator_stats = &mut ctx.accounts.creator_stats;
        let clock = Clock::get()?;
        
        // Validate bet amount
        require!(
            bet_amount >= MIN_BET_AMOUNT,
            ErrorCode::BetTooSmall
        );
        
        // Initialize room state with bump
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
        room.winner = None;
        room.bump = ctx.bumps.game_room;
        
        // Initialize escrow account
        escrow.room_id = room_id;
        escrow.player_1 = ctx.accounts.creator.key();
        escrow.player_2 = Pubkey::default();
        escrow.amount = 0; // Will be funded when both players join
        escrow.status = EscrowStatus::Funded;
        escrow.bump = ctx.bumps.escrow_account;
        
        // Initialize or update creator stats
        if creator_stats.player == Pubkey::default() {
            creator_stats.player = ctx.accounts.creator.key();
            creator_stats.total_games = 0;
            creator_stats.wins = 0;
            creator_stats.losses = 0;
            creator_stats.total_wagered = 0;
            creator_stats.total_winnings = 0;
            creator_stats.bump = ctx.bumps.creator_stats;
        }
        
        msg!("Room {} created with bet: {} lamports", room_id, bet_amount);
        
        emit!(RoomCreatedEvent {
            room_id,
            creator: ctx.accounts.creator.key(),
            bet_amount,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Join an existing game room
    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let escrow = &mut ctx.accounts.escrow_account;
        let joiner_stats = &mut ctx.accounts.joiner_stats;
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
        
        // Update escrow account
        escrow.player_2 = ctx.accounts.joiner.key();
        escrow.amount = room.bet_amount * 2; // Total pot from both players
        
        // Initialize or update joiner stats
        if joiner_stats.player == Pubkey::default() {
            joiner_stats.player = ctx.accounts.joiner.key();
            joiner_stats.total_games = 0;
            joiner_stats.wins = 0;
            joiner_stats.losses = 0;
            joiner_stats.total_wagered = 0;
            joiner_stats.total_winnings = 0;
            joiner_stats.bump = ctx.bumps.joiner_stats;
        }
        
        msg!("Player {} joined room {}", ctx.accounts.joiner.key(), room.room_id);
        
        emit!(RoomJoinedEvent {
            room_id: room.room_id,
            joiner: ctx.accounts.joiner.key(),
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }
    
    /// Close a completed game room and clean up state
    pub fn close_room(ctx: Context<CloseRoom>) -> Result<()> {
        let room = &ctx.accounts.game_room;
        
        // Validate room can be closed
        require!(
            room.status == RoomStatus::Completed || room.status == RoomStatus::Cancelled,
            ErrorCode::CannotCloseActiveRoom
        );
        
        // Only creator or winner can close the room
        let signer = ctx.accounts.closer.key();
        require!(
            signer == room.creator || 
            room.winner == Some(signer),
            ErrorCode::UnauthorizedClose
        );
        
        msg!("Room {} closed by {}", room.room_id, signer);
        
        Ok(())
    }
    
    /// Update global state statistics
    pub fn update_global_stats(
        ctx: Context<UpdateGlobalStats>,
        total_volume_delta: u64,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Only authority can update global stats
        require!(
            ctx.accounts.authority.key() == global_state.authority,
            ErrorCode::UnauthorizedUpdate
        );
        
        global_state.total_games = global_state.total_games.checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        global_state.total_volume = global_state.total_volume.checked_add(total_volume_delta)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        
        msg!("Global stats updated: {} games, {} volume", 
             global_state.total_games, global_state.total_volume);
        
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
            room.status = RoomStatus::WaitingForVrf;
            msg!("Both players selected, requesting VRF");
        }
        
        Ok(())
    }
    
    /// Request VRF randomness for coin flip
    pub fn request_randomness(ctx: Context<RequestRandomness>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        
        // Validate room status
        require!(
            room.status == RoomStatus::WaitingForVrf,
            ErrorCode::InvalidRoomStatus
        );
        
        // Update room status
        room.status = RoomStatus::Resolving;
        
        msg!("VRF randomness requested for room {}", room.room_id);
        
        emit!(VrfRequestedEvent {
            room_id: room.room_id,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
    
    /// Resolve game using VRF result
    pub fn resolve_game(ctx: Context<ResolveGame>) -> Result<()> {
        let room = &mut ctx.accounts.game_room;
        let escrow = &mut ctx.accounts.escrow_account;
        let global_state = &ctx.accounts.global_state;
        let clock = Clock::get()?;
        
        // Validate room status
        require!(
            room.status == RoomStatus::Resolving,
            ErrorCode::InvalidRoomStatus
        );
        
        // Get VRF result from Switchboard feed
        let vrf_account_info = &ctx.accounts.vrf_account;
        let vrf_data = AggregatorAccountData::new(vrf_account_info)?;
        
        // Get the latest round data
        let decimal_result = vrf_data.get_result()?;
        let vrf_value = decimal_result.try_into_u128()?;
        
        // Convert VRF result to coin flip (0 = Heads, 1 = Tails)
        let coin_result = if vrf_value % 2 == 0 { CoinSide::Heads } else { CoinSide::Tails };
        
        // Store VRF result
        room.vrf_result = Some(vrf_value.to_le_bytes().try_into().unwrap_or([0u8; 32]));
        
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
        
        // Calculate payouts
        let total_pot = escrow.amount;
        let house_fee = (total_pot as u128 * global_state.house_fee_bps as u128 / 10000) as u64;
        let winner_payout = total_pot.saturating_sub(house_fee);
        
        // Update escrow status
        escrow.status = EscrowStatus::Released;
        
        msg!(
            "Game resolved: Room {} - Winner: {} - Coin: {:?} - Payout: {}", 
            room.room_id, 
            winner.unwrap(),
            coin_result,
            winner_payout
        );
        
        emit!(GameResolvedEvent {
            room_id: room.room_id,
            winner: winner.unwrap(),
            coin_result,
            total_pot,
            house_fee,
            winner_payout,
            vrf_result: vrf_value as u64,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }
    
    /// Distribute payouts to winner and house
    pub fn distribute_payout(
        ctx: Context<DistributePayout>,
        amount: u64,
        house_fee: u64,
    ) -> Result<()> {
        let room = &ctx.accounts.game_room;
        let escrow = &mut ctx.accounts.escrow_account;
        
        // Validate game is completed
        require!(
            room.status == RoomStatus::Completed,
            ErrorCode::InvalidRoomStatus
        );
        
        require!(
            room.winner.is_some(),
            ErrorCode::NoWinner
        );
        
        // Validate escrow is released
        require!(
            escrow.status == EscrowStatus::Released,
            ErrorCode::EscrowNotReleased
        );
        
        // Transfer winner payout (in a real implementation, this would use actual SOL transfers)
        // For now, we'll mark the payout as distributed
        msg!(
            "Payout distributed: Winner {} receives {} lamports, House fee: {} lamports",
            room.winner.unwrap(),
            amount,
            house_fee
        );
        
        emit!(PayoutDistributedEvent {
            room_id: room.room_id,
            winner: room.winner.unwrap(),
            amount,
            house_fee,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
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
    pub winner: Option<Pubkey>,
    pub bump: u8, // Store PDA bump seed
}

#[account]
pub struct EscrowAccount {
    pub room_id: u64,
    pub player_1: Pubkey,
    pub player_2: Pubkey,
    pub amount: u64,
    pub status: EscrowStatus,
    pub bump: u8, // Store PDA bump seed
}

#[account]
pub struct PlayerStats {
    pub player: Pubkey,
    pub total_games: u64,
    pub wins: u64,
    pub losses: u64,
    pub total_wagered: u64,
    pub total_winnings: u64,
    pub bump: u8, // Store PDA bump seed
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum RoomStatus {
    WaitingForPlayer,
    SelectionsPending,
    WaitingForVrf,
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
pub enum EscrowStatus {
    Funded,
    Released,
    Refunded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq)]
pub enum GameResult {
    Player1Wins,
    Player2Wins,
    Draw, // Should not happen in coin flip
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
        space = 8 + 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 8 + 8 + 33 + 33 + 1, // Added 1 for bump
        seeds = [b"game_room", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 32 + 8 + 1 + 1, // EscrowAccount size
        seeds = [b"escrow", creator.key().as_ref(), &room_id.to_le_bytes()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1, // PlayerStats size
        seeds = [b"player_stats", creator.key().as_ref()],
        bump
    )]
    pub creator_stats: Account<'info, PlayerStats>,
    
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
    
    #[account(
        mut,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = escrow_account.bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        init_if_needed,
        payer = joiner,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1, // PlayerStats size
        seeds = [b"player_stats", joiner.key().as_ref()],
        bump
    )]
    pub joiner_stats: Account<'info, PlayerStats>,
    
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
pub struct CloseRoom<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::Completed || game_room.status == RoomStatus::Cancelled @ ErrorCode::CannotCloseActiveRoom,
        close = closer
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        mut,
        constraint = escrow_account.room_id == game_room.room_id @ ErrorCode::EscrowRoomMismatch,
        close = closer
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub closer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateGlobalStats<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(constraint = authority.key() == global_state.authority @ ErrorCode::UnauthorizedUpdate)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RequestRandomness<'info> {
    #[account(
        mut,
        constraint = game_room.status == RoomStatus::WaitingForVrf @ ErrorCode::InvalidRoomStatus
    )]
    pub game_room: Account<'info, GameRoom>,
    
    pub requester: Signer<'info>,
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
        constraint = escrow_account.room_id == game_room.room_id @ ErrorCode::EscrowRoomMismatch,
        seeds = [b"escrow", game_room.creator.as_ref(), &game_room.room_id.to_le_bytes()],
        bump = escrow_account.bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// CHECK: VRF account from Switchboard - will be validated in instruction
    #[account(
        constraint = vrf_account.owner == &SWITCHBOARD_PROGRAM_ID @ ErrorCode::VrfAccountInvalid
    )]
    pub vrf_account: AccountInfo<'info>,
    
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributePayout<'info> {
    #[account(
        constraint = game_room.status == RoomStatus::Completed @ ErrorCode::InvalidRoomStatus,
        constraint = game_room.winner.is_some() @ ErrorCode::NoWinner
    )]
    pub game_room: Account<'info, GameRoom>,
    
    #[account(
        mut,
        constraint = escrow_account.room_id == game_room.room_id @ ErrorCode::EscrowRoomMismatch,
        constraint = escrow_account.status == EscrowStatus::Released @ ErrorCode::EscrowNotReleased
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    /// CHECK: Winner account - validated by game_room.winner
    #[account(mut, constraint = winner_account.key() == game_room.winner.unwrap() @ ErrorCode::NoWinner)]
    pub winner_account: AccountInfo<'info>,
    
    /// CHECK: House wallet for fee collection
    #[account(mut)]
    pub house_wallet: AccountInfo<'info>,
    
    #[account(mut)]
    pub distributor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct RoomCreatedEvent {
    pub room_id: u64,
    pub creator: Pubkey,
    pub bet_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RoomJoinedEvent {
    pub room_id: u64,
    pub joiner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VrfRequestedEvent {
    pub room_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct GameResolvedEvent {
    pub room_id: u64,
    pub winner: Pubkey,
    pub coin_result: CoinSide,
    pub total_pot: u64,
    pub house_fee: u64,
    pub winner_payout: u64,
    pub vrf_result: u64,
    pub timestamp: i64,
}

#[event]
pub struct PayoutDistributedEvent {
    pub room_id: u64,
    pub winner: Pubkey,
    pub amount: u64,
    pub house_fee: u64,
    pub timestamp: i64,
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
    
    #[msg("Cannot close active room")]
    CannotCloseActiveRoom,
    
    #[msg("Unauthorized to close room")]
    UnauthorizedClose,
    
    #[msg("Unauthorized to update")]
    UnauthorizedUpdate,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Escrow room ID mismatch")]
    EscrowRoomMismatch,
    
    #[msg("Invalid game state")]
    InvalidGameState,
    
    #[msg("Missing player selections")]
    MissingSelections,
    
    #[msg("No winner determined")]
    NoWinner,
    
    #[msg("Escrow not released")]
    EscrowNotReleased,
    
    #[msg("VRF account invalid")]
    VrfAccountInvalid,
}