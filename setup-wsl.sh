#!/bin/bash

echo "==================================="
echo "Solana Coin Flipper - WSL Setup"
echo "==================================="

# Step 1: Install Rust
echo ""
echo "Step 1: Installing Rust..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "Rust already installed: $(rustc --version)"
fi

# Step 2: Install Solana CLI
echo ""
echo "Step 2: Installing Solana CLI..."
if ! command -v solana &> /dev/null; then
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
else
    echo "Solana already installed: $(solana --version)"
fi

# Step 3: Install Node.js and npm (needed for Anchor)
echo ""
echo "Step 3: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

# Step 4: Install Anchor
echo ""
echo "Step 4: Installing Anchor..."
if ! command -v anchor &> /dev/null; then
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install 0.29.0
    avm use 0.29.0
else
    echo "Anchor already installed: $(anchor --version)"
fi

# Step 5: Configure Solana for Devnet
echo ""
echo "Step 5: Configuring Solana for Devnet..."
solana config set --url https://api.devnet.solana.com

# Step 6: Create wallet if it doesn't exist
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo ""
    echo "Step 6: Creating new wallet..."
    solana-keygen new --outfile ~/.config/solana/id.json --no-bip39-passphrase
    echo ""
    echo "Requesting airdrop..."
    solana airdrop 2
else
    echo "Wallet already exists: $(solana address)"
fi

echo ""
echo "==================================="
echo "Setup complete! Now building the program..."
echo "==================================="

# Step 7: Build the program
cd /mnt/f/Andrius/flipCoin
anchor build

echo ""
echo "==================================="
if [ $? -eq 0 ]; then
    echo "✅ BUILD SUCCESSFUL!"
    echo "Next steps:"
    echo "1. Deploy with: anchor deploy"
    echo "2. Note the Program ID from deployment"
    echo "3. Update frontend with the new Program ID"
else
    echo "❌ BUILD FAILED"
    echo "Please check the error messages above"
fi
echo "==================================="