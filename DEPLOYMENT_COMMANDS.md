# Solana Coin Flipper - Deployment Commands Reference

## 🎯 Quick Reference

This document provides all the commands needed to deploy the optimized coin flipper smart contract on both local Windows machines and GitHub Codespaces.

## 🖥️ Method 1: Local Windows Deployment

### Prerequisites Installation

```powershell
# Install Rust
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
.\rustup-init.exe -y
$env:PATH += ";$env:USERPROFILE\.cargo\bin"

# Install Solana CLI (Windows)
Invoke-WebRequest -Uri "https://github.com/solana-labs/solana/releases/download/v1.17.22/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "solana-install-init.exe"
.\solana-install-init.exe
$env:PATH += ";$env:USERPROFILE\.local\share\solana\install\active_release\bin"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0 --locked

# Install Node.js (if not installed)
# Download from: https://nodejs.org/en/download/
```

### Configuration and Deployment

```powershell
# Navigate to your project
cd F:\flipCoin

# Configure Solana for devnet
solana config set --url https://api.devnet.solana.com

# Create development wallet
solana-keygen new --no-bip39-passphrase --outfile $env:USERPROFILE\.config\solana\id.json

# Request airdrop
solana airdrop 2

# Install Node.js dependencies
npm install

# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Initialize the contract
npm run deploy:init
```

## ☁️ Method 2: GitHub Codespaces Deployment

### Step 1: Setup Codespaces Environment

```bash
# 1. Go to your GitHub repository
# 2. Click "Code" → "Codespaces" → "Create codespace on main"
# 3. Wait for automatic setup (5-10 minutes)
```

### Step 2: Verify Environment

```bash
# Source environment variables
source ~/.bashrc

# Verify installations
rustc --version
solana --version  
anchor --version
node --version

# Check configuration
solana address
solana config get
solana balance
```

### Step 3: Build and Deploy

```bash
# Build the optimized contract
anchor build

# Verify build artifacts
ls -la target/deploy/coin_flipper.so
ls -la target/idl/coin_flipper.json

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Initialize the program
npm run deploy:init

# Verify deployment
solana program show $(anchor keys list | grep coin_flipper | awk '{print $2}') --url devnet
```

## 🔄 Repository Synchronization

### Syncing Between Codespaces and Local Repo

Since you'll be working with both environments, here's how to keep them synchronized:

#### From Codespaces to Local Windows

```bash
# In Codespaces: Commit and push changes
git add .
git commit -m "Deploy optimized contract with IDL and Program ID"
git push origin main

# Create deployment artifacts
mkdir -p deployment-artifacts
cp target/idl/coin_flipper.json deployment-artifacts/
cp target/deploy/coin_flipper.so deployment-artifacts/
echo "$(anchor keys list | grep coin_flipper | awk '{print $2}')" > deployment-artifacts/program-id.txt

# Commit artifacts
git add deployment-artifacts/
git commit -m "Add deployment artifacts"
git push origin main
```

```powershell
# On Local Windows: Pull changes
cd F:\flipCoin
git pull origin main

# Verify artifacts are synced
ls deployment-artifacts\

# Update local configuration with deployed Program ID
$programId = Get-Content deployment-artifacts\program-id.txt
Write-Host "Program ID: $programId"
```

#### From Local Windows to Codespaces

```powershell
# On Local Windows: Commit and push changes
cd F:\flipCoin
git add .
git commit -m "Update contract or frontend changes"
git push origin main
```

```bash
# In Codespaces: Pull changes
git pull origin main

# Rebuild if needed
anchor build
```

### Synchronizing IDL with Frontend Repository

If you have a separate frontend repository:

```bash
# In Codespaces or Local
# Copy IDL to frontend project
cp target/idl/coin_flipper.json ../frontend-repo/src/idl/

# Or if repositories are separate
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -X PUT \
  -d '{"message":"Update IDL","content":"'$(base64 -w 0 target/idl/coin_flipper.json)'"}' \
  https://api.github.com/repos/YOUR_USERNAME/frontend-repo/contents/src/idl/coin_flipper.json
```

## 📋 Deployment Verification Commands

### Check Program Deployment

```bash
# Get Program ID
PROGRAM_ID=$(anchor keys list | grep coin_flipper | awk '{print $2}')
echo "Program ID: $PROGRAM_ID"

# Verify program exists
solana program show $PROGRAM_ID --url devnet

# Check program account info
solana account $PROGRAM_ID --url devnet --output json

# View program logs
solana logs $PROGRAM_ID --url devnet
```

### Verify Contract Initialization

```bash
# Check global state account
solana account $(solana address-lookup-table derive-from-program $PROGRAM_ID global_state) --url devnet

# Test basic functionality
npm run test:devnet
```

## 🔧 Environment-Specific Commands

### Windows PowerShell Commands

```powershell
# Check Solana configuration
solana config get

# View wallet balance
solana balance

# Generate new keypair
solana-keygen new --outfile keypairs\deploy-keypair.json

# Set custom RPC
solana config set --url https://api.devnet.solana.com

# Build with Windows-specific paths
anchor build --program-name coin_flipper
```

### Linux/Codespaces Commands

```bash
# Set environment variables
export ANCHOR_PROVIDER_CLUSTER=devnet
export ANCHOR_WALLET=$HOME/.config/solana/id.json

# Build with verbose output
anchor build --verifiable

# Deploy with specific keypair
anchor deploy --provider.cluster devnet --program-keypair keypairs/deploy-keypair.json

# Test with local validator (if needed)
solana-test-validator &
anchor test --skip-deploy
```

## 🌐 Network Configuration

### Switch Between Networks

```bash
# Devnet (for testing)
solana config set --url https://api.devnet.solana.com
anchor deploy --provider.cluster devnet

# Mainnet (production - BE VERY CAREFUL!)
solana config set --url https://api.mainnet-beta.solana.com
anchor deploy --provider.cluster mainnet-beta

# Testnet (alternative testing)
solana config set --url https://api.testnet.solana.com
anchor deploy --provider.cluster testnet
```

### Multiple Environment Management

```bash
# Create environment-specific configs
mkdir -p configs

# Devnet config
cat > configs/devnet.json << EOF
{
  "cluster": "devnet",
  "wallet": "$HOME/.config/solana/devnet.json",
  "programId": "DEVNET_PROGRAM_ID_HERE"
}
EOF

# Mainnet config
cat > configs/mainnet.json << EOF
{
  "cluster": "mainnet-beta", 
  "wallet": "$HOME/.config/solana/mainnet.json",
  "programId": "MAINNET_PROGRAM_ID_HERE"
}
EOF
```

## 🚀 Complete Deployment Workflow

### New Deployment (First Time)

```bash
# 1. Setup environment
source ~/.bashrc  # (Codespaces) or refresh PowerShell (Windows)

# 2. Configure network
solana config set --url https://api.devnet.solana.com

# 3. Check balance
solana balance
# If insufficient: solana airdrop 2

# 4. Build program
anchor build

# 5. Deploy program  
anchor deploy --provider.cluster devnet

# 6. Note the Program ID from output
PROGRAM_ID="<PROGRAM_ID_FROM_OUTPUT>"

# 7. Verify Program ID in files
grep -r $PROGRAM_ID Anchor.toml programs/coin-flipper/src/lib.rs

# 8. Initialize contract
npm run deploy:init

# 9. Test deployment
npm run test:devnet

# 10. Commit and sync
git add .
git commit -m "Deploy contract to devnet"
git push origin main
```

### Update Deployment (Contract Changes)

```bash
# 1. Make contract changes
# 2. Build updated contract
anchor build

# 3. Upgrade deployment (if using upgradeable program)
anchor upgrade target/deploy/coin_flipper.so --program-id $PROGRAM_ID --provider.cluster devnet

# 4. Or deploy new program (if not upgradeable)
anchor deploy --provider.cluster devnet

# 5. Update IDL if interface changed
anchor idl upgrade $PROGRAM_ID --provider.cluster devnet --filepath target/idl/coin_flipper.json

# 6. Test changes
npm run test:devnet

# 7. Sync repositories
git add .
git commit -m "Update contract deployment"
git push origin main
```

## 🔍 Troubleshooting Commands

### Common Issues

```bash
# Program ID mismatch
anchor keys list
grep -r "declare_id" programs/coin-flipper/src/lib.rs

# Insufficient balance
solana balance
solana airdrop 2 --url devnet

# Build issues
cargo clean
anchor clean
anchor build

# Deployment verification
solana program show $PROGRAM_ID --url devnet

# Account issues  
solana account $PROGRAM_ID --url devnet
```

### Debugging Tools

```bash
# View detailed logs
solana logs $PROGRAM_ID --url devnet --output json

# Transaction history
solana transaction-history $(solana address) --url devnet

# Program buffer account (for upgrades)
solana program show --programs --url devnet

# IDL verification
anchor idl fetch $PROGRAM_ID --provider.cluster devnet
```

## 📦 Final Sync and Distribution

### Create Release Package

```bash
# Create deployment package
mkdir -p release
cp target/deploy/coin_flipper.so release/
cp target/idl/coin_flipper.json release/
echo $PROGRAM_ID > release/program-id.txt
echo "devnet" > release/network.txt

# Create archive
tar -czf coin-flipper-v1.0.0.tar.gz release/

# Upload to GitHub releases
gh release create v1.0.0 coin-flipper-v1.0.0.tar.gz --notes "Production-ready coin flipper deployment"
```

### Update Frontend Repository

```bash
# If frontend is in separate repo
git clone https://github.com/YOUR_USERNAME/frontend-repo
cp target/idl/coin_flipper.json frontend-repo/src/idl/
cd frontend-repo
git add .
git commit -m "Update IDL for contract v1.0.0"
git push origin main
```

Your coin flipper smart contract is now ready for production use! 🎮✨
