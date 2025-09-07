#!/bin/bash

# Build script for Solana coin-flipper program
# This script builds the program without requiring full Anchor CLI

echo "Building coin-flipper program..."

# Navigate to program directory
cd programs/coin-flipper

# Build with cargo for local testing
echo "Building with cargo..."
cargo build --release --target wasm32-unknown-unknown 2>/dev/null || cargo build --release

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "Build succeeded!"
    echo "Note: For deployment, you'll need Solana CLI installed."
else
    echo "Build failed. Checking cargo version..."
    cargo --version
    echo ""
    echo "To deploy to Solana, you need:"
    echo "1. Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools"
    echo "2. Run: solana-keygen new --outfile ~/.config/solana/devnet.json"
    echo "3. Run: anchor build && anchor deploy"
fi