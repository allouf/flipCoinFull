# Complete Game Flow - Fair Coin Flipper

## Why `created_at` in Smart Contract?

`created_at` is used for:
1. **Cancel Protection** - Games can only be cancelled after 1 hour (3600 seconds)
2. **Frontend Queries** - Sort games by creation time
3. **Analytics** - Track how long games take to complete
4. **Audit Trail** - Know when each game started

```rust
// Only allow cancellation after 1 hour
let time_passed = clock.unix_timestamp - game.created_at;
require!(time_passed > 3600, GameError::TooEarlyToCancel);
```

## 🎮 COMPLETE GAME FLOW

### **NORMAL GAME FLOW (Both Players Complete)**

```
Player A                    Smart Contract                    Player B
   |                              |                              |
   |------ 1. CREATE GAME ------->|                              |
   |       (0.01 SOL)             |                              |
   |                              | Status: WaitingForPlayer     |
   |                              | Escrow: 0.01 SOL             |
   |                              |                              |
   |                              |<----- 2. JOIN GAME ----------|
   |                              |        (0.01 SOL)            |
   |                              | Status: PlayersReady         |
   |                              | Escrow: 0.02 SOL             |
   |                              |                              |
   |--- 3. MAKE COMMITMENT ------>|                              |
   |   hash("heads" + 123456)     |                              |
   |                              |                              |
   |                              |<--- 4. MAKE COMMITMENT ------|
   |                              |    hash("tails" + 789012)   |
   |                              | Status: CommitmentsReady     |
   |                              |                              |
   |---- 5. REVEAL CHOICE -------->|                              |
   |    ("heads", 123456)         |                              |
   |                              | Status: RevealingPhase       |
   |                              |                              |
   |                              |<---- 6. REVEAL CHOICE -------|
   |                              |     ("tails", 789012)       |
   |                              |                              |
   |                              | 🎯 AUTO-RESOLUTION!          |
   |                              | Coin flip result: "heads"    |
   |                              | Winner: Player A             |
   |                              | Status: Resolved             |
   |                              |                              |
   |<--- RECEIVE 0.019 SOL -------|                              |
   |     (95% of 0.02)            |                              |
   |                              |                              |
   |                              | House gets 0.001 SOL (5%)    |
```

### **Transaction Details:**

#### **TX 1: Create Game (Player A)**
```typescript
await program.methods.createGame(gameId, betAmount)
  .accounts({
    playerA: walletA,
    game: gamePDA,
    escrow: escrowPDA,
    houseWallet: HOUSE_WALLET,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```
- **Cost**: 0.01 SOL (bet) + ~0.002 SOL (rent for accounts)
- **Result**: Game created, waiting for opponent

#### **TX 2: Join Game (Player B)**
```typescript
await program.methods.joinGame()
  .accounts({
    playerB: walletB,
    game: gamePDA,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```
- **Cost**: 0.01 SOL (bet) + gas
- **Result**: Both players in, ready for commitments

#### **TX 3 & 4: Make Commitments (Both Players)**
```typescript
// Player generates secret locally
const secret = Math.floor(Math.random() * 1000000) + 1000;
const choice = "heads"; // or "tails"
const commitment = hash(choice + secret);

await program.methods.makeCommitment(commitment)
  .accounts({
    player: wallet,
    game: gamePDA,
  })
  .rpc();
```
- **Cost**: Gas only
- **Result**: Commitment stored on-chain (choice hidden)

#### **TX 5 & 6: Reveal Choices (Both Players)**
```typescript
await program.methods.revealChoice(choice, secret)
  .accounts({
    player: wallet,
    game: gamePDA,
    playerA: gameData.playerA,
    playerB: gameData.playerB,
    houseWallet: HOUSE_WALLET,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```
- **First reveal**: Stores choice, waits for other player
- **Second reveal**: Triggers AUTO-RESOLUTION!
  - Flips coin using both secrets
  - Determines winner
  - Transfers funds immediately

## 🔄 EDGE CASES & SCENARIOS

### **Case 1: Both Players Choose SAME Side**
```
Player A: "heads" + secret_123456
Player B: "heads" + secret_789012

Coin Result: "tails"
Both wrong → Tiebreaker activated
Winner: Determined by hash(secrets + slot) % 2
```

### **Case 2: Both Players Choose DIFFERENT Sides**
```
Player A: "heads" + secret_123456
Player B: "tails" + secret_789012

Coin Result: "heads"
Winner: Player A (chose correctly)
```

### **Case 3: Both Correct (Both win the flip)**
```
Player A: "heads"
Player B: "heads"
Coin Result: "heads"

Both correct → Tiebreaker activated
Winner: Cryptographic 50/50 selection
```

### **Case 4: Player B Never Joins**
```
Hour 0: Player A creates game
Hour 1+: Anyone can call cancelGame()
Result: Player A gets full refund
```

### **Case 5: Player B Joins but Never Commits**
```
Player A: Creates & commits
Player B: Joins but disappears
Hour 1+: cancelGame() available
Result: Both get refunds
```

### **Case 6: One Player Never Reveals**
```
Both commit, but Player B never reveals
Hour 1+: cancelGame() OR
Anyone calls manualResolve (if we implement timeout logic)
```

## 📊 GAME STATE TRANSITIONS

```
WaitingForPlayer → PlayersReady → CommitmentsReady → RevealingPhase → Resolved
       ↓                ↓                ↓                  ↓
   [Cancelled]      [Cancelled]      [Cancelled]       [Cancelled]
  (after 1 hour)   (after 1 hour)  (after 1 hour)    (not allowed)
```

## 🎯 WHO DOES WHAT?

### **Player A (Game Creator)**
1. Creates game with bet
2. Waits for opponent
3. Makes commitment
4. Reveals choice
5. Receives winnings (if wins)

### **Player B (Game Joiner)**
1. Browses available games
2. Joins game with bet
3. Makes commitment
4. Reveals choice
5. Receives winnings (if wins)

### **Smart Contract**
1. Holds funds in escrow
2. Validates commitments
3. Verifies reveals match commitments
4. Generates random coin flip
5. Determines winner (with tiebreaker)
6. Distributes funds automatically

### **House Wallet**
- Receives 5% fee from every resolved game
- Passive recipient (no actions needed)

## 🔒 SECURITY GUARANTEES

1. **No Cheating**: Can't see opponent's choice until you reveal
2. **No Front-Running**: Commitment locks your choice
3. **Always a Winner**: Tiebreaker ensures no draws
4. **No Stuck Funds**: Auto-resolution or cancel after timeout
5. **MEV Resistant**: Miners can't manipulate outcome

## 💰 MONEY FLOW

```
Initial State:
- Player A: 10 SOL
- Player B: 10 SOL
- Escrow: 0 SOL
- House: 0 SOL

After Both Join (0.01 SOL each):
- Player A: 9.99 SOL
- Player B: 9.99 SOL
- Escrow: 0.02 SOL
- House: 0 SOL

After Resolution (A wins):
- Player A: 10.009 SOL (won 0.019)
- Player B: 9.99 SOL (lost bet)
- Escrow: 0 SOL
- House: 0.001 SOL (5% fee)
```

## 🚨 IMPORTANT NOTES

1. **Commitment Phase**: Players can commit in ANY order
2. **Reveal Phase**: Players can reveal in ANY order
3. **Auto-Resolution**: Happens on the 2nd reveal automatically
4. **No Manual Resolution Needed**: Unless something goes wrong
5. **Cancel Protection**: Can't cancel immediately (1 hour wait)

## ✅ COMPLETE TRANSACTION LIST

For a successful game, exactly **6 transactions**:
1. Create Game (Player A)
2. Join Game (Player B)
3. Make Commitment (Player A)
4. Make Commitment (Player B)
5. Reveal Choice (Player A)
6. Reveal Choice (Player B) - triggers resolution

That's it! No 7th transaction needed for resolution.