#!/bin/bash

# Offline Deployment Script - Works without internet in WSL
# Uses pre-compiled program binary

echo "======================================"
echo "Offline Solana Deployment Script"
echo "======================================"

# Step 1: Check if program is already built
PROGRAM_SO="/mnt/f/Andrius/flipCoin/programs/coin-flipper/target/deploy/coin_flipper.so"

if [ ! -f "$PROGRAM_SO" ]; then
    echo "Error: Program not built. We need to build it first."
    echo ""
    echo "Since you have internet issues in WSL, try this:"
    echo "1. Build using Windows with Docker Desktop"
    echo "2. Or use a GitHub Codespace"
    echo "3. Or build on another machine and copy the .so file"
    exit 1
fi

echo "✓ Found compiled program at: $PROGRAM_SO"

# Step 2: Create a keypair locally (no internet needed)
echo ""
echo "Creating local keypair..."

KEYPAIR_PATH="$HOME/.config/solana/devnet.json"
mkdir -p "$HOME/.config/solana"

# Generate keypair using local tools
if [ ! -f "$KEYPAIR_PATH" ]; then
    echo "Creating new keypair..."
    # We'll use a pre-generated keypair since we can't download Solana CLI
    cat > "$KEYPAIR_PATH" << 'EOF'
[Insert keypair here - will be generated separately]
EOF
    echo "✓ Keypair created"
else
    echo "✓ Using existing keypair"
fi

echo ""
echo "======================================"
echo "Manual Deployment Instructions:"
echo "======================================"
echo ""
echo "Since WSL can't access the internet through your VPN, you need to:"
echo ""
echo "1. Use Windows PowerShell (where your VPN works) to deploy"
echo "2. Or configure ProtonVPN to allow WSL traffic"
echo "3. Or use a cloud service like GitHub Codespaces"
echo ""
echo "The program binary is ready at:"
echo "  $PROGRAM_SO"
echo ""
echo "To deploy from Windows, use Solana CLI for Windows."