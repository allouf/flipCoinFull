#!/bin/bash

# GitHub Codespaces Setup Script for Solana Coin Flipper
# This script sets up the development environment with Solana CLI, Anchor, and other dependencies

set -e

echo "🚀 Setting up Solana development environment..."

# Update system packages
sudo apt-get update

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    build-essential \
    pkg-config \
    libudev-dev \
    llvm \
    libclang-dev \
    protobuf-compiler \
    libssl-dev \
    bc \
    curl \
    wget \
    jq

# Install Solana CLI
echo "⛏️ Installing Solana CLI..."
curl -sSfL https://release.solana.com/v1.17.22/install | sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> $HOME/.bashrc

# Verify Solana installation
solana --version

# Install Anchor CLI
echo "⚓ Installing Anchor CLI..."
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0 --locked

# Add cargo bin to PATH
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> $HOME/.bashrc
export PATH="$HOME/.cargo/bin:$PATH"

# Verify Anchor installation
anchor --version

# Configure Solana for devnet
echo "🌐 Configuring Solana for devnet..."
solana config set --url https://api.devnet.solana.com

# Create development wallet if it doesn't exist
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo "🔑 Creating development wallet..."
    mkdir -p "$HOME/.config/solana"
    solana-keygen new --no-bip39-passphrase --silent --outfile "$HOME/.config/solana/id.json"
fi

# Display wallet address
echo "📍 Wallet address: $(solana address)"

# Request airdrop for development
echo "💰 Requesting devnet airdrop..."
solana airdrop 2 --url devnet || echo "⚠️ Airdrop failed (might be rate limited)"

# Install Node.js dependencies
echo "📱 Installing Node.js dependencies..."
npm install

# Install additional Solana development tools
echo "🔧 Installing additional tools..."
cargo install solana-verify
cargo install spl-token-cli

# Create directories for keys and deployment artifacts
mkdir -p keypairs
mkdir -p deployment-artifacts

# Set up environment variables
echo "🔧 Setting up environment variables..."
cat >> $HOME/.bashrc << 'EOF'

# Solana Development Environment
export SOLANA_CLI_CONFIG="$HOME/.config/solana/cli/config.yml"
export ANCHOR_PROVIDER_CLUSTER="devnet"
export ANCHOR_WALLET="$HOME/.config/solana/id.json"

# Aliases for common commands
alias sol='solana'
alias anchor-test='anchor test --skip-local-validator'
alias deploy-devnet='anchor build && anchor deploy --provider.cluster devnet'
alias check-balance='solana balance'
alias airdrop='solana airdrop 2 --url devnet'

EOF

# Make setup script executable
chmod +x .devcontainer/setup.sh

# Display setup summary
echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Environment Summary:"
echo "  • Rust: $(rustc --version)"
echo "  • Node.js: $(node --version)"
echo "  • Solana CLI: $(solana --version)"
echo "  • Anchor CLI: $(anchor --version)"
echo "  • Network: $(solana config get | grep 'RPC URL' | awk '{print $3}')"
echo "  • Wallet: $(solana address)"
echo ""
echo "🎮 Ready to develop your Solana coin flipper!"
echo ""
echo "📚 Useful commands:"
echo "  • anchor build              - Build the program"
echo "  • anchor test              - Run tests"
echo "  • anchor deploy            - Deploy to configured network"
echo "  • solana balance           - Check wallet balance"
echo "  • solana airdrop 2         - Request devnet airdrop"
echo ""
echo "🔗 Next steps:"
echo "  1. Run 'source ~/.bashrc' to load environment variables"
echo "  2. Build the program with 'anchor build'"
echo "  3. Deploy to devnet with 'anchor deploy --provider.cluster devnet'"
echo ""
