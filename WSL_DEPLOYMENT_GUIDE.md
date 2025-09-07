# 🐧 WSL Deployment Guide for Solana Coin Flipper

## 📋 **Deployment Options for WSL Users**

Since you're using WSL, you have **multiple deployment options**. The automated scripts work in WSL, but you might prefer manual steps for better control.

---

## 🎯 **Option 1: Manual Deployment (Recommended for WSL)**

This gives you full control and visibility over each step:

### **Step 1: Install Anchor in WSL**
```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installation
anchor --version
```

### **Step 2: Configure Solana CLI**
```bash
# Install Solana CLI if needed
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Generate deployer keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/devnet.json

# Request airdrop for deployment
solana airdrop 2
```

### **Step 3: Build the Program**
```bash
cd /mnt/f/Andrius/flipCoin  # Navigate to your project
anchor build
```

### **Step 4: Deploy the Program**
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Note the program ID from the output
# Example: Program Id: GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn
```

### **Step 5: Initialize with Your Choice of House Wallet**

**Option A: Use Your Existing Wallet**
```bash
# Initialize with your existing wallet (replace with your wallet address)
ts-node scripts/deploy.ts --house-wallet YOUR_EXISTING_WALLET_PUBLIC_KEY

# Example:
ts-node scripts/deploy.ts --house-wallet 7MyTjPanYuFCAh7HBuGYDDQYXjvEUsaiNizfMWQgXzxd
```

**Option B: Generate New House Wallet**
```bash
# Generate and use a new house wallet
ts-node scripts/deploy.ts

# This will create house-wallet.json and use it for fee collection
```

**Option C: Manual Initialization (Full Control)**
```bash
# Create initialization script manually
cat > init.ts << 'EOF'
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlipper } from "./target/types/coin_flipper";
import { PublicKey, SystemProgram } from "@solana/web3.js";

async function initialize() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.CoinFlipper as Program<CoinFlipper>;
  
  // YOUR CONFIGURATION HERE
  const HOUSE_WALLET = new PublicKey("YOUR_WALLET_ADDRESS_HERE");
  const HOUSE_FEE_BPS = 300; // 3% fee
  
  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from('global_state')],
    program.programId
  );
  
  const tx = await program.methods
    .initialize(HOUSE_FEE_BPS)
    .accounts({
      globalState: globalStatePda,
      authority: provider.wallet.publicKey,
      houseWallet: HOUSE_WALLET,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
    
  console.log("Initialized with tx:", tx);
  console.log("House wallet:", HOUSE_WALLET.toString());
  console.log("House fee:", HOUSE_FEE_BPS / 100, "%");
}

initialize().catch(console.error);
EOF

# Run the initialization
ts-node init.ts
```

---

## 🚀 **Option 2: Automated Deployment (Works in WSL)**

The automated scripts DO work in WSL, but you need proper setup:

### **Prerequisites**
```bash
# Ensure Node.js and npm are installed in WSL
node --version  # Should show v16+ 
npm --version   # Should show v8+

# Install TypeScript and ts-node globally
npm install -g typescript ts-node
```

### **Deploy with Existing Wallet**
```bash
# Build and deploy, then initialize with your wallet
anchor build
anchor deploy --provider.cluster devnet

# Initialize with your existing wallet
npm run deploy:init -- --house-wallet YOUR_WALLET_PUBLIC_KEY
```

### **Or Use Full Automated Deployment**
```bash
# This will build, deploy, and initialize everything
npm run deploy:devnet

# With custom house wallet:
HOUSE_WALLET=YOUR_WALLET_PUBLIC_KEY npm run deploy:devnet
```

---

## 💼 **House Wallet Options Explained**

### **1. Use Your Existing Wallet (Recommended)**
```bash
ts-node scripts/deploy.ts --house-wallet YOUR_WALLET_PUBLIC_KEY
```
**Pros:**
- You control the wallet completely
- Can be your main wallet or a dedicated fee wallet
- No new keys to manage

**Cons:**
- Fees mix with your other transactions

### **2. Generate New Dedicated Wallet**
```bash
ts-node scripts/deploy.ts
```
**Pros:**
- Clean separation of fee funds
- Easy to track fee revenue
- Dedicated for this purpose

**Cons:**
- New wallet to secure and backup
- Need to manage another keypair

### **3. Use Multisig (For Production)**
```bash
# Create multisig with Squads Protocol or similar
# Then use the multisig address as house wallet
ts-node scripts/deploy.ts --house-wallet MULTISIG_ADDRESS
```

---

## 📝 **Updated NPM Scripts for Flexibility**

Add these to your `package.json`:

```json
{
  "scripts": {
    "deploy:build": "anchor build",
    "deploy:program": "anchor deploy --provider.cluster devnet",
    "deploy:init": "ts-node scripts/deploy.ts",
    "deploy:init:custom": "ts-node scripts/deploy.ts --house-wallet",
    "deploy:full": "npm run deploy:build && npm run deploy:program && npm run deploy:init",
    "deploy:verify": "ts-node scripts/pre-deploy-check.ts"
  }
}
```

---

## 🔍 **Verification After Deployment**

### **Check Program Deployment**
```bash
# View program account
solana program show GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn

# Check program logs
solana logs GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn
```

### **Verify Initialization**
```bash
# Run tests
anchor test

# Or check manually with script
cat > verify.ts << 'EOF'
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlipper } from "./target/types/coin_flipper";
import { PublicKey } from "@solana/web3.js";

async function verify() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.CoinFlipper as Program<CoinFlipper>;
  
  const [globalStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from('global_state')],
    program.programId
  );
  
  const state = await program.account.globalState.fetch(globalStatePda);
  
  console.log("✅ Program Initialized!");
  console.log("Authority:", state.authority.toString());
  console.log("House Wallet:", state.houseWallet.toString());
  console.log("House Fee:", state.houseFeeBps / 100, "%");
  console.log("Total Games:", state.totalGames.toString());
  console.log("Is Paused:", state.isPaused);
}

verify().catch(console.error);
EOF

ts-node verify.ts
```

---

## ⚠️ **Common WSL Issues & Solutions**

### **Issue 1: Anchor not found**
```bash
# Solution: Install in WSL, not Windows
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

### **Issue 2: Permission denied on node_modules**
```bash
# Solution: Clear and reinstall
rm -rf node_modules
npm install
```

### **Issue 3: Can't connect to localhost RPC**
```bash
# Solution: Use proper RPC endpoint
solana config set --url https://api.devnet.solana.com
```

### **Issue 4: File watching issues**
```bash
# Solution: Increase watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 🎯 **Quick Start Commands**

### **For New Deployment with Your Wallet:**
```bash
# 1. Build
anchor build

# 2. Deploy  
anchor deploy --provider.cluster devnet

# 3. Initialize with your wallet
ts-node scripts/deploy.ts --house-wallet YOUR_WALLET_ADDRESS
```

### **For New Deployment with Generated Wallet:**
```bash
# All in one command
npm run deploy:devnet
```

### **Just Check if Ready:**
```bash
npm run pre-deploy-check
```

---

## 💡 **Recommendations**

1. **For Testing**: Use generated wallet (easier)
2. **For Production**: Use your existing secure wallet or multisig
3. **For WSL**: Manual steps give better control and visibility
4. **For Quick Deploy**: Automated scripts work fine in WSL

---

## 📞 **Need Help?**

If you encounter issues:
1. Run `npm run pre-deploy-check` first
2. Check Solana logs: `solana logs`
3. Verify wallet balance: `solana balance`
4. Ensure correct network: `solana config get`

The smart contract is fully ready for deployment with flexible house wallet configuration!