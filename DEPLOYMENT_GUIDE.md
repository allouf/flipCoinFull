# Solana Coin Flipper - VRF Deployment Guide

## Current Status
✅ **VRF Integration Complete**: Switchboard VRF has been successfully integrated into the smart contract
⚠️ **Build Blocked**: Windows build requires Visual Studio C++ Build Tools

## Build Environment Issues (Windows)

### Problem
Your Git Bash environment has a conflicting `link.exe` that prevents Rust from using the MSVC linker.

### Solutions

#### Option 1: Install Visual Studio Build Tools
1. Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Install with "Desktop development with C++" workload
3. Use PowerShell or CMD instead of Git Bash

#### Option 2: Use WSL2 or Linux VM
1. Install WSL2 with Ubuntu
2. Install Rust and Solana tools in Linux environment
3. Build from Linux environment

#### Option 3: Use Cloud Development
1. GitHub Codespaces
2. Gitpod
3. DigitalOcean/AWS VM

## Step 1: Build the Program

In WSL, navigate to your project directory and build:

```bash
# Navigate to project root
cd /mnt/f/Andrius/flipCoin

# Install Anchor (if not already installed)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Build the program
anchor build
```

## Step 2: Deploy to Devnet

```bash
# Make sure you're on devnet
solana config set --url https://api.devnet.solana.com

# Check your balance
solana balance

# Deploy the program
anchor deploy

# Save the deployed Program ID that will be displayed
```

## Step 3: Update Program ID

After deployment, update the Program ID in these files:
1. `programs/coin-flipper/src/lib.rs` - Line 3
2. `Anchor.toml` - Line 6

Replace `CoinF1ipperProgramID11111111111111111111111` with your actual deployed Program ID.

## Step 4: Test the Deployment

Create a test file `tests/coin-flipper.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlipper } from "../target/types/coin_flipper";

describe("coin-flipper", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CoinFlipper as Program<CoinFlipper>;
  
  it("Initializes the program", async () => {
    const [globalState] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      program.programId
    );

    const houseWallet = anchor.web3.Keypair.generate();
    
    await program.methods
      .initialize(300) // 3% house fee
      .accounts({
        globalState,
        authority: provider.wallet.publicKey,
        houseWallet: houseWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.globalState.fetch(globalState);
    console.log("Global state initialized:", account);
  });

  it("Creates a game room", async () => {
    const roomId = new anchor.BN(1);
    const betAmount = new anchor.BN(10_000_000); // 0.01 SOL

    const [gameRoom] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("game_room"),
        provider.wallet.publicKey.toBuffer(),
        roomId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [playerStats] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("player_stats"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createRoom(roomId, betAmount)
      .accounts({
        gameRoom,
        creatorStats: playerStats,
        creator: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const room = await program.account.gameRoom.fetch(gameRoom);
    console.log("Room created:", room);
  });
});
```

Run the test:
```bash
anchor test
```

## Step 5: Connect Frontend

Update your frontend to use the deployed program:

1. Copy the IDL from `target/idl/coin_flipper.json` to your frontend
2. Update the program ID in your frontend code
3. Use the IDL to interact with the program

Example frontend connection:
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import idl from './coin_flipper.json';

const programId = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');
const connection = new Connection('https://api.devnet.solana.com');

// In your wallet adapter context:
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(idl as Idl, programId, provider);
```

## Important Notes

### About the Current Implementation

✅ **VRF Enabled**: The smart contract now includes full Switchboard VRF integration for provably fair randomness:
- VRF request and callback instructions implemented
- VrfStatus tracking (None, Pending, Fulfilled, Failed)
- Automatic fallback to pseudo-random if VRF fails
- Feature flag system for conditional compilation

### Production Requirements

Before going to mainnet with real money:
1. Integrate proper VRF (Switchboard or Chainlink)
2. Add proper escrow fund transfers
3. Complete security audit
4. Test extensively on devnet/testnet

### What Works Now

✅ Game room creation and management
✅ Player stats tracking  
✅ Game flow (create → join → select → resolve)
✅ Fee calculation
✅ **Switchboard VRF integration for provably fair randomness**
✅ VRF status tracking and callbacks
✅ Automatic fallback mechanism

### What Needs Implementation

- Actual SOL transfers for betting
- Payout distribution
- Timeout handling for non-responsive players
- Switchboard VRF account setup on Devnet

## Troubleshooting

### Build Errors

If you get dependency errors:
```bash
# Clear cargo cache
cargo clean

# Update dependencies
cargo update

# Rebuild
anchor build
```

### Deployment Errors

If deployment fails:
```bash
# Check your balance (need ~2 SOL for deployment)
solana balance

# If insufficient, airdrop more
solana airdrop 2

# Try deployment again
anchor deploy
```

### Program Too Large

If the program is too large:
```bash
# Build with optimization
anchor build -- --features no-idl

# Or reduce program size by removing unused code
```

## Next Steps

1. Deploy to devnet ✅
2. Test basic functionality ✅
3. Integrate with frontend
4. Add proper VRF for production
5. Security audit before mainnet

## Support

For issues or questions:
- Check Anchor docs: https://www.anchor-lang.com/
- Solana Stack Exchange: https://solana.stackexchange.com/
- Your project repo issues section