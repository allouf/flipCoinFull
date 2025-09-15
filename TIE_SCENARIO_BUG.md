# Tie Scenario Bug - Smart Contract Issue

## Problem Description

The current smart contract has a critical bug in the `resolve_game` function that **fails to handle tie scenarios** properly.

### What is a Tie Scenario?

A tie occurs when:
1. **Both players select the same side** (both choose Heads OR both choose Tails)
2. **The coin result is the opposite** of what both players selected
3. **Neither player wins** because neither guessed correctly

### Current Smart Contract Logic (BUGGY)

```rust
// Determine the winner
let (winner, winner_account) = if p1_selection == coin_result {
    (Some(room.player_1), &ctx.accounts.player_1)
} else if p2_selection == coin_result {
    (Some(room.player_2), &ctx.accounts.player_2)
} else {
    // This should never happen as one player must be correct ← WRONG!
    return Err(ErrorCode::InvalidGameState.into());
};
```

### Why This is Wrong

The comment says "This should never happen as one player must be correct" but this is **false**:
- Players can freely choose the same side
- If both choose Heads and coin lands Tails → **neither is correct**
- If both choose Tails and coin lands Heads → **neither is correct**

## Error Symptoms

When a tie occurs, users see:
- `InvalidGameState` error (Error Code: 6007)
- `AccountDidNotSerialize` error (Error Code: 3004)
- Game appears "stuck" in resolving state
- Resolution transaction fails repeatedly

## Workaround Solutions

### Immediate Solution (Frontend)

1. **Detect tie scenarios** before attempting resolution
2. **Use `handleTimeout` function** to refund both players their bets
3. **This is the fairest outcome** until smart contract is fixed

⚠️ **LIMITATION**: The smart contract has a **second bug** - it doesn't allow timeouts on games in "Resolving" status. So if a tie game reaches "Resolving" state, it becomes permanently stuck and requires manual intervention.

### Frontend Implementation

The frontend now:
- ✅ **Detects potential ties** by comparing player selections
- ✅ **Warns users** when both players selected the same side
- ✅ **Provides clear error messages** explaining the tie situation
- ✅ **Suggests using "Handle Timeout"** to refund both players

## Proper Smart Contract Fix (Requires Redeployment)

```rust
// Determine the winner(s) - FIXED VERSION
let (winner, loser) = match (p1_selection == coin_result, p2_selection == coin_result) {
    (true, false) => (Some(room.player_1), Some(room.player_2)),  // P1 wins
    (false, true) => (Some(room.player_2), Some(room.player_1)),  // P2 wins
    (true, true) | (false, false) => (None, None), // TIE - refund both
};

// Handle payouts based on outcome
if let Some(winner_key) = winner {
    // Normal win scenario - winner gets pot minus house fee
    // ... existing payout logic
} else {
    // TIE scenario - refund both players their original bets
    let refund_amount = room.bet_amount; // Each player gets their bet back
    // Transfer refunds to both players
    // ... refund logic
}
```

## Game Examples

### Example 1: Normal Game (Works Fine)
- Player 1 selects: **Heads**
- Player 2 selects: **Tails**
- Coin result: **Heads**
- Winner: **Player 1** ✅

### Example 2: Tie Scenario (Currently Broken)
- Player 1 selects: **Heads**
- Player 2 selects: **Heads**  ← Same as P1
- Coin result: **Tails**       ← Opposite of both
- Result: **Neither wins** → Should refund both
- Current behavior: **ERROR** ❌

## User Instructions

### If you encounter an "InvalidGameState" error:

1. **Check the console logs** - look for "TIE SCENARIO DETECTED"
2. **Both players selected the same side** (both Heads or both Tails)
3. **Try "Handle Timeout" button** to fairly refund both players
4. **If Handle Timeout also fails**: The game is permanently stuck due to smart contract bugs

### If Handle Timeout fails with "InvalidTimeoutCondition":

- The game is in "Resolving" status where timeouts aren't allowed
- This is **a second bug** in the smart contract
- The game cannot be resolved or refunded through normal means
- **Manual intervention by program administrator is required**

## Technical Notes

- This affects any game where both players make identical selections
- The bug is in the smart contract logic, not the frontend
- Using `handleTimeout` is the fairest workaround
- Players get their original bets refunded (no house fee in ties)
- This maintains game integrity while working around the bug

## Status

- **Bug identified**: ✅
- **Frontend workaround**: ✅ Implemented
- **Smart contract fix**: ⏳ Requires redeployment
- **User guidance**: ✅ Clear error messages provided

---

**Bottom Line**: If you see "InvalidGameState" error, it's likely a tie. Use "Handle Timeout" to refund both players fairly.
