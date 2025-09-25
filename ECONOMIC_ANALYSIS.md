# Economic Analysis - Smart Contract Fee Structure

## ⚠️ THE PROBLEM YOU IDENTIFIED

You're absolutely right! The current implementation has a **critical economic flaw**:

### Current Implementation Issues:
```rust
// In cancel_game function - WHO PAYS FOR THIS?
refund_from_escrow(&escrow, &player_a, bet_amount, seeds, bump)?;
refund_from_escrow(&escrow, &player_b, bet_amount, seeds, bump)?;
```

**PROBLEM**: The escrow only has the players' bets. When we refund, we need to:
1. Return full bet amounts to players
2. Pay Solana transaction fees
3. Pay for account rent

**The escrow doesn't have extra funds for fees!**

## 💰 ECONOMIC SCENARIOS

### Scenario 1: Normal Game Resolution
- Escrow: 0.02 SOL (both bets)
- Winner gets: 0.019 SOL (95%)
- House gets: 0.001 SOL (5%)
- ✅ Works fine!

### Scenario 2: Cancellation/Refund
- Escrow: 0.02 SOL
- Need to refund: 0.02 SOL
- Transaction fees: ~0.0001 SOL
- **❌ WHERE DO FEES COME FROM?**

## 🔧 SOLUTION OPTIONS

### Option 1: Increase House Fee (Your Suggestion)
```rust
const HOUSE_FEE_PERCENTAGE: u64 = 1000; // 10% instead of 5%
```

**Pros:**
- More revenue to cover operational costs
- Buffer for refund scenarios
- Sustainable business model

**Cons:**
- Less attractive to players
- Competition might offer better rates

### Option 2: Cancellation Fee
```rust
pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
    // ...

    // Deduct cancellation fee (e.g., 2%)
    let cancellation_fee = game.bet_amount * 20 / 1000; // 0.02%
    let refund_amount = game.bet_amount - cancellation_fee;

    // Refund players minus fee
    refund_from_escrow(&escrow, &player_a, refund_amount, ...)?;
    refund_from_escrow(&escrow, &player_b, refund_amount, ...)?;

    // House keeps cancellation fees to cover costs
    refund_from_escrow(&escrow, &house_wallet, cancellation_fee * 2, ...)?;
}
```

### Option 3: Require Canceller to Pay
```rust
pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
    // Canceller must attach 0.001 SOL to cover fees
    let fee = 1_000_000; // 0.001 SOL

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.canceller.to_account_info(),
                to: ctx.accounts.house_wallet.to_account_info(),
            },
        ),
        fee,
    )?;

    // Now refund players full amounts
    // ...
}
```

### Option 4: No Refunds (Harsh but Simple)
```rust
// Remove cancel_game entirely
// If players don't complete, house keeps funds after timeout
```

## 📊 RECOMMENDED FEE STRUCTURE

### Balanced Approach (RECOMMENDED):
```rust
// Fair fees that cover all scenarios
const HOUSE_FEE_PERCENTAGE: u64 = 700; // 7% (up from 5%)
const CANCELLATION_FEE: u64 = 200; // 2% cancellation penalty
const MIN_BET_AMOUNT: u64 = 10_000_000; // 0.01 SOL (up from 0.001)
```

### Why This Works:
1. **7% house fee** - Competitive but sustainable
2. **2% cancellation fee** - Discourages abandonment
3. **0.01 SOL minimum** - Ensures fees are meaningful

### Revenue Projection:
- **Completed game**: House gets 7% of pot
- **Cancelled game**: House gets 2% to cover costs
- **No losses** for the house in any scenario

## 🎯 IMPLEMENTATION CHANGES NEEDED

### Update 1: Increase House Fee
```rust
const HOUSE_FEE_PERCENTAGE: u64 = 700; // 7% = 700 basis points
```

### Update 2: Add Cancellation Fee
```rust
pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let clock = Clock::get()?;

    // Check timeout (1 hour)
    let time_passed = clock.unix_timestamp - game.created_at;
    require!(time_passed > 3600, GameError::TooEarlyToCancel);

    // Calculate refunds with cancellation fee
    let cancellation_fee_per_player = game.bet_amount * 100 / 10000; // 1% each
    let refund_amount = game.bet_amount - cancellation_fee_per_player;

    if game.status == GameStatus::WaitingForPlayer {
        // Only player A to refund
        transfer_from_escrow_pda(
            &ctx.accounts.escrow,
            &ctx.accounts.player_a,
            refund_amount,
            // ... seeds
        )?;

        // House gets the cancellation fee
        transfer_from_escrow_pda(
            &ctx.accounts.escrow,
            &ctx.accounts.house_wallet,
            cancellation_fee_per_player,
            // ... seeds
        )?;
    } else {
        // Both players to refund
        // Refund player A
        transfer_from_escrow_pda(
            &ctx.accounts.escrow,
            &ctx.accounts.player_a,
            refund_amount,
            // ... seeds
        )?;

        // Refund player B
        transfer_from_escrow_pda(
            &ctx.accounts.escrow,
            &ctx.accounts.player_b,
            refund_amount,
            // ... seeds
        )?;

        // House gets both cancellation fees
        transfer_from_escrow_pda(
            &ctx.accounts.escrow,
            &ctx.accounts.house_wallet,
            cancellation_fee_per_player * 2,
            // ... seeds
        )?;
    }

    game.status = GameStatus::Cancelled;

    emit!(GameCancelled {
        game_id: game.game_id,
        cancelled_at: clock.unix_timestamp,
        total_fees_collected: cancellation_fee_per_player * num_players,
    });

    Ok(())
}
```

### Update 3: Minimum Bet Increase
```rust
const MIN_BET_AMOUNT: u64 = 10_000_000; // 0.01 SOL (was 0.001)
```

## 💡 ALTERNATIVE: REMOVE CANCELLATION ENTIRELY

**Simplest Solution:**
```rust
// No cancel_game function at all
// Players must complete or lose their bets
// House keeps abandoned game funds after 24 hours
```

**Pros:**
- No refund complexity
- No economic issues
- Encourages completion
- Maximum revenue

**Cons:**
- Less user-friendly
- Might deter new players
- Potential bad reviews

## 📈 FINAL RECOMMENDATION

### For Launch:
1. **Set house fee to 7%** - Covers all operational costs
2. **Add 2% cancellation fee** - Discourages abandonment
3. **Minimum bet 0.01 SOL** - Ensures meaningful games

### For Future:
- Monitor cancellation rates
- Adjust fees based on data
- Consider removing cancellation if abuse occurs

### Expected Outcomes:
- **90% games complete**: House earns 7%
- **10% games cancelled**: House earns 2%
- **Average house revenue**: 6.5% of all bets
- **Sustainable model** with no losses

## 🎮 Player Communication

Make it clear in UI:
```
✅ Completed Games: 7% house fee
⚠️ Cancelled Games: 2% cancellation fee
⏰ Cancellation available after 1 hour
💰 Minimum bet: 0.01 SOL
```

This ensures players understand the economics before playing!