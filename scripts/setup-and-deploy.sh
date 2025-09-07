#!/bin/bash

# Setup and Deploy Script for Solana Coin Flipper
# This script sets up the environment and deploys the smart contract to devnet

set -e  # Exit on error

echo "================================================"
echo "Solana Coin Flipper - Setup and Deploy Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Check if Solana CLI is installed
echo ""
echo "Step 1: Checking Solana CLI..."
if ! command -v solana &> /dev/null; then
    print_error "Solana CLI not found. Installing..."
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"
    print_status "Solana CLI installed"
else
    print_status "Solana CLI found: $(solana --version)"
fi

# Step 2: Check if Anchor is installed
echo ""
echo "Step 2: Checking Anchor..."
if ! command -v anchor &> /dev/null; then
    print_error "Anchor not found. Installing..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install 0.29.0
    avm use 0.29.0
    print_status "Anchor installed"
else
    print_status "Anchor found: $(anchor --version)"
fi

# Step 3: Configure Solana for devnet
echo ""
echo "Step 3: Configuring Solana for devnet..."
solana config set --url https://api.devnet.solana.com
print_status "Connected to devnet"

# Step 4: Check for existing wallet
echo ""
echo "Step 4: Checking wallet configuration..."
WALLET_PATH="/home/$USER/.config/solana/devnet.json"

if [ ! -f "$WALLET_PATH" ]; then
    print_warning "Wallet not found. Creating new wallet..."
    solana-keygen new --outfile "$WALLET_PATH" --no-bip39-passphrase
    print_status "New wallet created at $WALLET_PATH"
else
    print_status "Wallet found at $WALLET_PATH"
fi

# Set the wallet as default
solana config set --keypair "$WALLET_PATH"
WALLET_ADDRESS=$(solana address)
print_status "Wallet address: $WALLET_ADDRESS"

# Step 5: Check wallet balance
echo ""
echo "Step 5: Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    print_warning "Low balance: $BALANCE SOL"
    print_status "Requesting airdrop..."
    solana airdrop 2
    sleep 5
    BALANCE=$(solana balance | awk '{print $1}')
    print_status "New balance: $BALANCE SOL"
else
    print_status "Wallet balance: $BALANCE SOL"
fi

# Step 6: Build the Anchor program
echo ""
echo "Step 6: Building the Anchor program..."
cd programs/coin-flipper

# Check if Cargo.toml exists
if [ ! -f "Cargo.toml" ]; then
    print_error "Cargo.toml not found in programs/coin-flipper"
    exit 1
fi

# Build with Anchor
anchor build
print_status "Program built successfully"

# Step 7: Deploy the program
echo ""
echo "Step 7: Deploying to devnet..."
PROGRAM_ID=$(anchor deploy --provider.cluster devnet | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
    print_error "Failed to get program ID"
    exit 1
fi

print_status "Program deployed! Program ID: $PROGRAM_ID"

# Step 8: Update Anchor.toml with new program ID
echo ""
echo "Step 8: Updating Anchor.toml..."
sed -i "s/coin_flipper = \".*\"/coin_flipper = \"$PROGRAM_ID\"/" ../../Anchor.toml
print_status "Anchor.toml updated with new program ID"

# Step 9: Verify deployment
echo ""
echo "Step 9: Verifying deployment..."
solana program show "$PROGRAM_ID"

echo ""
echo "================================================"
echo "         DEPLOYMENT SUCCESSFUL!"
echo "================================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Wallet Address: $WALLET_ADDRESS"
echo "Network: Devnet"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Next steps:"
echo "1. Update your frontend with the new program ID"
echo "2. Run 'npm run deploy:init' to initialize the program"
echo "3. Test the deployed program using 'anchor test'"
echo ""