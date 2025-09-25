use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::hash::hash;

declare_id!("YourProgramIDWillGoHere11111111111111111111");

// Constants - Updated Economics
const HOUSE_FEE_PERCENTAGE: u64 = 700; // 7% = 700 basis points (increased for sustainability)
const CANCELLATION_FEE_PERCENTAGE: u64 = 200; // 2% = 200 basis points (covers refund costs)
const MIN_BET_AMOUNT: u64 = 10_000_000; // 0.01 SOL minimum (increased from 0.001)
const MAX_BET_AMOUNT: u64 = 100_000_000_000; // 100 SOL maximum

#[program]
pub mod fair_coin_flipper {
    use super::*;

    pub fn create_game(
        ctx: Context<CreateGame>,
        game_id: u64,
        bet_amount: u64,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        // Validate bet amount
        require!(bet_amount >= MIN_BET_AMOUNT, GameError::BetTooLow);
        require!(bet_amount <= MAX_BET_AMOUNT, GameError::BetTooHigh);

        // Initialize game account
        game.game_id = game_id;
        game.player_a = ctx.accounts.player_a.key();
        game.player_b = Pubkey::default();
        game.bet_amount = bet_amount;
        game.house_wallet = ctx.accounts.house_wallet.key();

        // Commitment phase data (initially empty)
        game.commitment_a = [0; 32];
        game.commitment_b = [0; 32];
        game.commitments_complete = false;

        // Revelation phase data (initially empty)
        game.choice_a = None;
        game.secret_a = None;
        game.choice_b = None;
        game.secret_b = None;

        // Game status
        game.status = GameStatus::WaitingForPlayer;
        game.created_at = clock.unix_timestamp;
        game.resolved_at = None;

        // Result data (initially empty)
        game.coin_result = None;
        game.winner = None;
        game.house_fee = 0;

        // PDA bumps
        game.bump = ctx.bumps.game;
        game.escrow_bump = ctx.bumps.escrow;

        // Transfer bet amount to escrow
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player_a.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            bet_amount,
        )?;

        emit!(GameCreated {
            game_id,
            player_a: game.player_a,
            bet_amount,
        });

        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;

        // Validate game status
        require!(
            game.status == GameStatus::WaitingForPlayer,
            GameError::InvalidGameStatus
        );

        // Prevent player from playing against themselves
        require!(
            ctx.accounts.player_b.key() != game.player_a,
            GameError::CannotPlayAgainstYourself
        );

        // Set Player B data
        game.player_b = ctx.accounts.player_b.key();
        game.status = GameStatus::PlayersReady;

        // Transfer bet amount to escrow
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player_b.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            game.bet_amount,
        )?;

        emit!(PlayerJoined {
            game_id: game.game_id,
            player_b: game.player_b,
        });

        Ok(())
    }

    pub fn make_commitment(
        ctx: Context<MakeCommitment>,
        commitment: [u8; 32],
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        // Validate game status
        require!(
            game.status == GameStatus::PlayersReady ||
            game.status == GameStatus::CommitmentsReady,
            GameError::InvalidGameStatus
        );

        // Security: Prevent zero/empty commitments
        require!(commitment != [0; 32], GameError::InvalidCommitment);

        // Determine if this is Player A or B
        let player = ctx.accounts.player.key();
        let is_player_a = player == game.player_a;
        let is_player_b = player == game.player_b;

        require!(is_player_a || is_player_b, GameError::NotAPlayer);

        // Store commitment
        if is_player_a {
            require!(game.commitment_a == [0; 32], GameError::AlreadyCommitted);
            game.commitment_a = commitment;
        } else {
            require!(game.commitment_b == [0; 32], GameError::AlreadyCommitted);
            game.commitment_b = commitment;
        }

        // Check if both players have committed
        if game.commitment_a != [0; 32] && game.commitment_b != [0; 32] {
            game.commitments_complete = true;
            game.status = GameStatus::CommitmentsReady;
        }

        emit!(CommitmentMade {
            game_id: game.game_id,
            player,
            commitment,
        });

        Ok(())
    }

    pub fn reveal_choice(
        ctx: Context<RevealChoice>,
        choice: CoinSide,
        secret: u64,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game;

        // Validate game status
        require!(
            game.status == GameStatus::CommitmentsReady ||
            game.status == GameStatus::RevealingPhase,
            GameError::InvalidGameStatus
        );

        // Ensure both commitments are made
        require!(
            game.commitments_complete,
            GameError::InvalidGameStatus
        );

        // Get clock for resolution
        let clock = Clock::get()?;

        // Determine if this is Player A or B
        let player = ctx.accounts.player.key();
        let is_player_a = player == game.player_a;
        let is_player_b = player == game.player_b;

        require!(is_player_a || is_player_b, GameError::NotAPlayer);

        // Security: Validate secret strength
        require!(secret > 1, GameError::WeakSecret);
        require!(secret != u64::MAX, GameError::WeakSecret);

        // Validate commitment
        let expected_commitment = if is_player_a {
            game.commitment_a
        } else {
            game.commitment_b
        };

        let actual_commitment = generate_commitment(choice, secret);
        require!(
            actual_commitment == expected_commitment,
            GameError::InvalidCommitment
        );

        // Store revelation
        if is_player_a {
            require!(game.choice_a.is_none(), GameError::AlreadyRevealed);
            game.choice_a = Some(choice);
            game.secret_a = Some(secret);
        } else {
            require!(game.choice_b.is_none(), GameError::AlreadyRevealed);
            game.choice_b = Some(choice);
            game.secret_b = Some(secret);
        }

        game.status = GameStatus::RevealingPhase;

        emit!(ChoiceRevealed {
            game_id: game.game_id,
            player,
            choice,
            secret,
        });

        // Auto-resolve when both revealed
        if game.choice_a.is_some() && game.choice_b.is_some() {
            // Inline resolution to avoid borrowing issues
            let choice_a = game.choice_a.unwrap();
            let secret_a = game.secret_a.unwrap();
            let choice_b = game.choice_b.unwrap();
            let secret_b = game.secret_b.unwrap();

            // Generate random coin flip
            let coin_result = generate_coin_flip(secret_a, secret_b, clock.slot, clock.unix_timestamp);

            // Determine winner
            let winner = determine_winner(
                choice_a,
                choice_b,
                coin_result,
                secret_a,
                secret_b,
                clock.slot,
                game.player_a,
                game.player_b,
            );

            // Calculate payouts
            let total_pot = game.bet_amount * 2;
            let house_fee = total_pot * HOUSE_FEE_PERCENTAGE / 10000;
            let winner_payout = total_pot - house_fee;

            // Update game state
            game.coin_result = Some(coin_result);
            game.winner = Some(winner);
            game.house_fee = house_fee;
            game.status = GameStatus::Resolved;
            game.resolved_at = Some(clock.unix_timestamp);

            // Transfer funds using PDA signer
            let seeds = &[
                b"escrow",
                game.player_a.as_ref(),
                &game.game_id.to_le_bytes(),
                &[game.escrow_bump],
            ];

            // Transfer winner payout
            let winner_account = if winner == game.player_a {
                &ctx.accounts.player_a
            } else {
                &ctx.accounts.player_b
            };

            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: winner_account.to_account_info(),
                    },
                    &[seeds],
                ),
                winner_payout,
            )?;

            // Transfer house fee
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.house_wallet.to_account_info(),
                    },
                    &[seeds],
                ),
                house_fee,
            )?;

            emit!(GameResolved {
                game_id: game.game_id,
                winner,
                coin_result,
                winner_payout,
                house_fee,
                resolved_at: clock.unix_timestamp,
            });
        }

        Ok(())
    }

    // Manual resolution fallback
    pub fn resolve_game_manual(ctx: Context<ResolveGameManual>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        // Validate both players have revealed
        require!(
            game.choice_a.is_some() && game.choice_b.is_some(),
            GameError::NotReadyForResolution
        );

        // Prevent double resolution
        require!(
            game.status != GameStatus::Resolved,
            GameError::AlreadyResolved
        );

        // Inline manual resolution to avoid borrowing issues
        let choice_a = game.choice_a.unwrap();
        let secret_a = game.secret_a.unwrap();
        let choice_b = game.choice_b.unwrap();
        let secret_b = game.secret_b.unwrap();

        // Generate random coin flip
        let coin_result = generate_coin_flip(secret_a, secret_b, clock.slot, clock.unix_timestamp);

        // Determine winner
        let winner = determine_winner(
            choice_a,
            choice_b,
            coin_result,
            secret_a,
            secret_b,
            clock.slot,
            game.player_a,
            game.player_b,
        );

        // Calculate payouts
        let total_pot = game.bet_amount * 2;
        let house_fee = total_pot * HOUSE_FEE_PERCENTAGE / 10000;
        let winner_payout = total_pot - house_fee;

        // Update game state
        game.coin_result = Some(coin_result);
        game.winner = Some(winner);
        game.house_fee = house_fee;
        game.status = GameStatus::Resolved;
        game.resolved_at = Some(clock.unix_timestamp);

        // Transfer funds using PDA signer
        let seeds = &[
            b"escrow",
            game.player_a.as_ref(),
            &game.game_id.to_le_bytes(),
            &[game.escrow_bump],
        ];

        // Transfer winner payout
        let winner_account = if winner == game.player_a {
            &ctx.accounts.player_a
        } else {
            &ctx.accounts.player_b
        };

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: winner_account.to_account_info(),
                },
                &[seeds],
            ),
            winner_payout,
        )?;

        // Transfer house fee
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.escrow.to_account_info(),
                    to: ctx.accounts.house_wallet.to_account_info(),
                },
                &[seeds],
            ),
            house_fee,
        )?;

        emit!(GameResolved {
            game_id: game.game_id,
            winner,
            coin_result,
            winner_payout,
            house_fee,
            resolved_at: clock.unix_timestamp,
        });

        Ok(())
    }

    // Cancel game function with fees
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let clock = Clock::get()?;

        // Only allow cancellation after 1 hour
        let time_passed = clock.unix_timestamp - game.created_at;
        require!(time_passed > 3600, GameError::TooEarlyToCancel);

        // Game must not be resolved
        require!(
            game.status != GameStatus::Resolved,
            GameError::AlreadyResolved
        );

        // Calculate cancellation fee (2% per player)
        let cancellation_fee = game.bet_amount * CANCELLATION_FEE_PERCENTAGE / 10000;
        let refund_amount = game.bet_amount - cancellation_fee;

        // Seeds for PDA signing
        let seeds = &[
            b"escrow",
            game.player_a.as_ref(),
            &game.game_id.to_le_bytes(),
            &[game.escrow_bump],
        ];

        // Refund based on game state
        if game.status == GameStatus::WaitingForPlayer {
            // Only player A joined, refund them minus fee
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.player_a.to_account_info(),
                    },
                    &[seeds],
                ),
                refund_amount,
            )?;

            // House gets the cancellation fee
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.house_wallet.to_account_info(),
                    },
                    &[seeds],
                ),
                cancellation_fee,
            )?;
        } else if game.player_b != Pubkey::default() {
            // Both players joined, refund both minus fees

            // Refund player A
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.player_a.to_account_info(),
                    },
                    &[seeds],
                ),
                refund_amount,
            )?;

            // Refund player B
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.player_b.to_account_info(),
                    },
                    &[seeds],
                ),
                refund_amount,
            )?;

            // House gets both cancellation fees
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.escrow.to_account_info(),
                        to: ctx.accounts.house_wallet.to_account_info(),
                    },
                    &[seeds],
                ),
                cancellation_fee * 2,
            )?;
        }

        game.status = GameStatus::Cancelled;

        emit!(GameCancelled {
            game_id: game.game_id,
            cancelled_at: clock.unix_timestamp,
            total_fees_collected: if game.player_b != Pubkey::default() {
                cancellation_fee * 2
            } else {
                cancellation_fee
            },
        });

        Ok(())
    }
}

// Cryptographically secure commitment generation
pub fn generate_commitment(choice: CoinSide, secret: u64) -> [u8; 32] {
    let choice_byte = match choice {
        CoinSide::Heads => 0u8,
        CoinSide::Tails => 1u8,
    };

    let mut commitment_data = Vec::with_capacity(16);
    commitment_data.push(choice_byte);
    commitment_data.extend_from_slice(&[0u8; 7]); // Padding
    commitment_data.extend_from_slice(&secret.to_le_bytes());

    // Double hash for security
    let first_hash = hash(&commitment_data);
    let final_hash = hash(&first_hash.to_bytes());
    final_hash.to_bytes()
}

// Cryptographically secure random coin flip
fn generate_coin_flip(secret_a: u64, secret_b: u64, slot: u64, timestamp: i64) -> CoinSide {
    // Use player secrets as primary entropy
    let secret_entropy = secret_a.wrapping_mul(secret_b);

    // Additional blockchain entropy
    let slot_entropy = slot;
    let time_entropy = timestamp as u64;

    // Combine all entropy sources
    let mut entropy_data = Vec::with_capacity(32);
    entropy_data.extend_from_slice(&secret_entropy.to_le_bytes());
    entropy_data.extend_from_slice(&slot_entropy.to_le_bytes());
    entropy_data.extend_from_slice(&time_entropy.to_le_bytes());

    // Double hash for security
    let first_hash = hash(&entropy_data);
    let final_hash = hash(&first_hash.to_bytes());
    let hash_bytes = final_hash.to_bytes();

    // Use multiple bytes for better randomness
    let random_value = u64::from_le_bytes([
        hash_bytes[0], hash_bytes[1], hash_bytes[2], hash_bytes[3],
        hash_bytes[4], hash_bytes[5], hash_bytes[6], hash_bytes[7]
    ]);

    if random_value % 2 == 0 {
        CoinSide::Heads
    } else {
        CoinSide::Tails
    }
}

// Determine winner with secure tiebreaker
fn determine_winner(
    choice_a: CoinSide,
    choice_b: CoinSide,
    coin_result: CoinSide,
    secret_a: u64,
    secret_b: u64,
    slot: u64,
    player_a: Pubkey,
    player_b: Pubkey,
) -> Pubkey {
    let a_correct = choice_a == coin_result;
    let b_correct = choice_b == coin_result;

    match (a_correct, b_correct) {
        (true, false) => player_a,  // Only A correct
        (false, true) => player_b,  // Only B correct
        _ => {
            // Tie - use cryptographic tiebreaker
            let entropy_mix = secret_a.wrapping_mul(secret_b).wrapping_add(slot);
            let tiebreaker_data = [entropy_mix.to_le_bytes(), slot.to_le_bytes()].concat();
            let tiebreaker_hash = hash(&tiebreaker_data);
            let tiebreaker_bytes = tiebreaker_hash.to_bytes();

            let tiebreaker_value = u64::from_le_bytes([
                tiebreaker_bytes[0], tiebreaker_bytes[1], tiebreaker_bytes[2], tiebreaker_bytes[3],
                tiebreaker_bytes[4], tiebreaker_bytes[5], tiebreaker_bytes[6], tiebreaker_bytes[7]
            ]);

            if tiebreaker_value % 2 == 0 {
                player_a
            } else {
                player_b
            }
        }
    }
}

// Account Structures
#[account]
pub struct Game {
    pub game_id: u64,
    pub player_a: Pubkey,
    pub player_b: Pubkey,
    pub bet_amount: u64,
    pub house_wallet: Pubkey,

    // Commitment Phase
    pub commitment_a: [u8; 32],
    pub commitment_b: [u8; 32],
    pub commitments_complete: bool,

    // Revelation Phase
    pub choice_a: Option<CoinSide>,
    pub secret_a: Option<u64>,
    pub choice_b: Option<CoinSide>,
    pub secret_b: Option<u64>,

    // Resolution
    pub status: GameStatus,
    pub coin_result: Option<CoinSide>,
    pub winner: Option<Pubkey>,
    pub house_fee: u64,

    // Timestamps
    pub created_at: i64,
    pub resolved_at: Option<i64>,

    // PDAs
    pub bump: u8,
    pub escrow_bump: u8,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameStatus {
    WaitingForPlayer,
    PlayersReady,
    CommitmentsReady,
    RevealingPhase,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CoinSide {
    Heads,
    Tails,
}

// Context Structs
#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub player_a: Signer<'info>,

    #[account(
        init,
        payer = player_a,
        space = 8 + std::mem::size_of::<Game>(),
        seeds = [b"game", player_a.key().as_ref(), &game_id.to_le_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"escrow", player_a.key().as_ref(), &game_id.to_le_bytes()],
        bump
    )]
    /// CHECK: This is a PDA used for escrow
    pub escrow: AccountInfo<'info>,

    /// CHECK: This is the house wallet for collecting fees
    pub house_wallet: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub player_b: Signer<'info>,

    #[account(mut)]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [b"escrow", game.player_a.as_ref(), &game.game_id.to_le_bytes()],
        bump = game.escrow_bump
    )]
    /// CHECK: This is a PDA used for escrow
    pub escrow: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeCommitment<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub game: Account<'info, Game>,
}

#[derive(Accounts)]
pub struct RevealChoice<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub game: Account<'info, Game>,

    // Required accounts for auto-resolution transfers
    #[account(mut)]
    /// CHECK: Player A account for transfers
    pub player_a: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: Player B account for transfers
    pub player_b: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: House wallet for collecting fees
    pub house_wallet: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"escrow", game.player_a.as_ref(), &game.game_id.to_le_bytes()],
        bump = game.escrow_bump
    )]
    /// CHECK: This is a PDA used for escrow
    pub escrow: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveGameManual<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(mut)]
    pub game: Account<'info, Game>,

    #[account(mut)]
    /// CHECK: Player A account for transfers
    pub player_a: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: Player B account for transfers
    pub player_b: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: House wallet for collecting fees
    pub house_wallet: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"escrow", game.player_a.as_ref(), &game.game_id.to_le_bytes()],
        bump = game.escrow_bump
    )]
    /// CHECK: This is a PDA used for escrow
    pub escrow: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut)]
    pub canceller: Signer<'info>,

    #[account(mut)]
    pub game: Account<'info, Game>,

    #[account(mut)]
    /// CHECK: Player A account for transfers
    pub player_a: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: Player B account for transfers
    pub player_b: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: House wallet for collecting fees
    pub house_wallet: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"escrow", game.player_a.as_ref(), &game.game_id.to_le_bytes()],
        bump = game.escrow_bump
    )]
    /// CHECK: This is a PDA used for escrow
    pub escrow: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub player_a: Pubkey,
    pub bet_amount: u64,
}

#[event]
pub struct PlayerJoined {
    pub game_id: u64,
    pub player_b: Pubkey,
}

#[event]
pub struct CommitmentMade {
    pub game_id: u64,
    pub player: Pubkey,
    pub commitment: [u8; 32],
}

#[event]
pub struct ChoiceRevealed {
    pub game_id: u64,
    pub player: Pubkey,
    pub choice: CoinSide,
    pub secret: u64,
}

#[event]
pub struct GameResolved {
    pub game_id: u64,
    pub winner: Pubkey,
    pub coin_result: CoinSide,
    pub winner_payout: u64,
    pub house_fee: u64,
    pub resolved_at: i64,
}

#[event]
pub struct GameCancelled {
    pub game_id: u64,
    pub cancelled_at: i64,
    pub total_fees_collected: u64,
}

// Error Codes
#[error_code]
pub enum GameError {
    #[msg("Bet amount is too low")]
    BetTooLow,
    #[msg("Bet amount is too high")]
    BetTooHigh,
    #[msg("Invalid game status for this operation")]
    InvalidGameStatus,
    #[msg("Player is not part of this game")]
    NotAPlayer,
    #[msg("Invalid commitment provided")]
    InvalidCommitment,
    #[msg("Choice already revealed")]
    AlreadyRevealed,
    #[msg("Player has already made a commitment")]
    AlreadyCommitted,
    #[msg("Secret value is too weak, use a strong random value")]
    WeakSecret,
    #[msg("Game is not ready for resolution")]
    NotReadyForResolution,
    #[msg("Game is already resolved")]
    AlreadyResolved,
    #[msg("Too early to cancel the game")]
    TooEarlyToCancel,
    #[msg("Cannot play against yourself")]
    CannotPlayAgainstYourself,
}