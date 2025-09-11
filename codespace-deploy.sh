#!/bin/bash

# GitHub Codespace Deployment Script for Solana Coin Flipper
# Run this script inside your GitHub Codespace

set -e

echo "================================================"
echo "Solana Coin Flipper - Codespace Deploy"
echo "================================================"

# Step 1: Install Rust
echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Step 2: Install Solana CLI
echo "Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Step 3: Install Anchor
echo "Installing Anchor CLI..."
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0

# Step 4: Configure Solana for devnet
echo "Configuring Solana for devnet..."
solana config set --url https://api.devnet.solana.com

# Step 5: Create a new wallet
echo "Creating wallet..."
solana-keygen new --no-bip39-passphrase --force

# Step 6: Get airdrop
echo "Requesting airdrop..."
solana airdrop 2
sleep 5

# Step 7: Build the program
echo "Building program..."
cd programs/coin-flipper
cargo build-bpf

# Step 8: Deploy the program
echo "Deploying to devnet..."
PROGRAM_ID=$(solana program deploy target/deploy/coin_flipper.so --output json | jq -r '.programId // empty')

if [ -z "$PROGRAM_ID" ]; then
    # Fallback if jq is not available
    DEPLOY_OUTPUT=$(solana program deploy target/deploy/coin_flipper.so)
    PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')
fi

if [ -n "$PROGRAM_ID" ]; then
    echo ""
    echo "================================================"
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "================================================"
    echo ""
    echo "Program ID: $PROGRAM_ID"
    echo ""
    echo "Update your Anchor.toml with:"
    echo "coin_flipper = \"$PROGRAM_ID\""
    echo ""
    echo "Explorer URL:"
    echo "https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
    
    # Update Anchor.toml
    cd ../..
    sed -i "s/coin_flipper = \".*\"/coin_flipper = \"$PROGRAM_ID\"/" Anchor.toml
    echo ""
    echo "✅ Anchor.toml updated!"
else
    echo "❌ Deployment failed. Please check the output above."
    exit 1
fi