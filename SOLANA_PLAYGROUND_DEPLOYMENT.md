# Solana Playground Deployment Guide - Fixed Fair Coin Flipper

## 📋 Step-by-Step Deployment Instructions

### 1. **Open Solana Playground**
Go to: https://beta.solpg.io/

### 2. **Create New Project**
1. Click "Create a new project"
2. Name it: `fair-coin-flipper`
3. Select: "Anchor (Rust)" framework
4. Click "Create"

### 3. **Replace the Code**
1. In the file explorer, open `src/lib.rs`
2. Delete all existing code
3. Copy ALL content from `lib_fixed.rs` file
4. Paste into `lib.rs`
5. Save (Ctrl+S or Cmd+S)

### 4. **Update Program ID**
1. In Solana Playground, click "Build" in the left sidebar
2. After building, click "Deploy"
3. It will generate a new Program ID
4. Copy the Program ID
5. Replace line 8 in lib.rs:
   ```rust
   declare_id!("YOUR_NEW_PROGRAM_ID_HERE");
   ```

### 5. **Build & Deploy**
```bash
# In Solana Playground terminal:

# 1. Build the program
build

# 2. Deploy to devnet
deploy

# 3. Copy the deployed Program ID
```

### 6. **Test the Smart Contract**

#### Test Script 1: Complete Game Flow
```typescript
// Test complete game flow
const gameId = Date.now();
const betAmount = 0.01 * LAMPORTS_PER_SOL;

// 1. Create Game (Player A)
const secret_a = Math.floor(Math.random() * 1000000) + 1000;
const choice_a = "heads"; // or "tails"
const commitment_a = generateCommitment(choice_a, secret_a);

await program.methods
  .createGame(new BN(gameId), new BN(betAmount))
  .accounts({
    playerA: wallet1.publicKey,
    game: gamePDA,
    escrow: escrowPDA,
    houseWallet: houseWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 2. Join Game (Player B)
await program.methods
  .joinGame()
  .accounts({
    playerB: wallet2.publicKey,
    game: gamePDA,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 3. Make Commitments
// Player A commits
await program.methods
  .makeCommitment(commitment_a)
  .accounts({
    player: wallet1.publicKey,
    game: gamePDA,
  })
  .rpc();

// Player B commits
const secret_b = Math.floor(Math.random() * 1000000) + 1000;
const choice_b = "tails";
const commitment_b = generateCommitment(choice_b, secret_b);

await program.methods
  .makeCommitment(commitment_b)
  .accounts({
    player: wallet2.publicKey,
    game: gamePDA,
  })
  .rpc();

// 4. Reveal Choices (auto-resolves on 2nd reveal)
// Player A reveals
await program.methods
  .revealChoice({ heads: {} }, new BN(secret_a))
  .accounts({
    player: wallet1.publicKey,
    game: gamePDA,
    playerA: wallet1.publicKey,
    playerB: wallet2.publicKey,
    houseWallet: houseWallet.publicKey,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Player B reveals (triggers auto-resolution)
await program.methods
  .revealChoice({ tails: {} }, new BN(secret_b))
  .accounts({
    player: wallet2.publicKey,
    game: gamePDA,
    playerA: wallet1.publicKey,
    playerB: wallet2.publicKey,
    houseWallet: houseWallet.publicKey,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Check game state - should be resolved with winner and payouts
const gameAccount = await program.account.game.fetch(gamePDA);
console.log("Winner:", gameAccount.winner.toString());
console.log("Coin Result:", gameAccount.coinResult);
console.log("House Fee:", gameAccount.houseFee.toNumber() / LAMPORTS_PER_SOL);
```

#### Test Script 2: Tie Scenario
```typescript
// Test tie-breaking mechanism
// Both players choose same side
const choice = "heads";
const secret_a = 123456;
const secret_b = 654321;

// Follow same flow as above but both choose "heads"
// The tiebreaker will deterministically choose a winner
```

## 🔧 Key Fixes Implemented

### 1. **Escrow Account Initialization**
- ✅ Escrow now properly initialized as `SystemAccount` in `CreateGame`
- ✅ Uses PDA with correct seeds

### 2. **Auto-Resolution Fixed**
- ✅ `RevealChoice` context includes all required accounts
- ✅ Funds automatically transfer when 2nd player reveals
- ✅ Winner receives payout, house receives fee

### 3. **Manual Resolution Fallback**
- ✅ New `resolve_game_manual` function for stuck games
- ✅ Anyone can call after both players reveal

### 4. **Cancel Function**
- ✅ Games can be cancelled after 1 hour if stuck
- ✅ Refunds players appropriately

### 5. **Timestamp Fix**
- ✅ `created_at` now set using Clock::get()

### 6. **Additional Security**
- ✅ Prevent playing against yourself
- ✅ Better error messages

## 📝 Frontend Integration Updates

After deployment, update your frontend:

### 1. Update Program ID
```typescript
// src/config/program.ts
export const PROGRAM_ID = new PublicKey("YOUR_NEW_DEPLOYED_PROGRAM_ID");
```

### 2. Update Reveal Function
```typescript
// When calling revealChoice, pass all accounts:
await program.methods
  .revealChoice(choice, secret)
  .accounts({
    player: wallet.publicKey,
    game: gamePDA,
    playerA: gameData.playerA,
    playerB: gameData.playerB,
    houseWallet: HOUSE_WALLET,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Add Cancel Function (Optional)
```typescript
// For games stuck > 1 hour
await program.methods
  .cancelGame()
  .accounts({
    canceller: wallet.publicKey,
    game: gamePDA,
    playerA: gameData.playerA,
    playerB: gameData.playerB,
    escrow: escrowPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## ✅ Testing Checklist

- [ ] Deploy to Solana Playground
- [ ] Create game - verify bet transfers to escrow
- [ ] Join game - verify bet transfers to escrow
- [ ] Both players commit - verify commitments stored
- [ ] First player reveals - verify choice stored
- [ ] Second player reveals - verify auto-resolution
- [ ] Check winner received payout
- [ ] Check house received fee
- [ ] Test tie scenario - verify tiebreaker works
- [ ] Test cancel after 1 hour (optional)

## 🎯 Expected Results

After successful deployment and testing:
1. **Games resolve automatically** when 2nd player reveals
2. **Winner receives 95%** of total pot
3. **House receives 5%** fee
4. **Ties always produce a winner** via cryptographic tiebreaker
5. **No funds get stuck** in escrow

## 🚨 Common Issues & Solutions

### Issue: "AccountNotInitialized"
**Solution**: Make sure escrow account is passed correctly in all instructions

### Issue: "InvalidAccountData"
**Solution**: Rebuild and redeploy after any code changes

### Issue: Funds not transferring
**Solution**: Verify all accounts are passed in RevealChoice

### Issue: "Custom program error: 0x..."
**Solution**: Check error codes at bottom of lib.rs for meaning

## 🎉 Success!

Once deployed and tested, your smart contract will:
- ✅ Handle complete game flow without errors
- ✅ Transfer funds correctly to winners
- ✅ Collect house fees properly
- ✅ Resolve ties deterministically
- ✅ Prevent MEV attacks
- ✅ Work seamlessly with your frontend

Update your frontend with the new Program ID and you're ready to go!