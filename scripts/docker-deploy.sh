#!/bin/bash

# Docker-based deployment script for Solana Coin Flipper
# This script uses Docker to build and deploy without local Rust/Solana installation

set -e

echo "================================================"
echo "Solana Coin Flipper - Docker Deploy Script"
echo "================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Create Dockerfile for Solana development
cat > Dockerfile.solana << 'EOF'
FROM projectserum/build:v0.27.0

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
RUN cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0

WORKDIR /workspace

# Copy the project files
COPY . .

# Set up Solana for devnet
RUN solana config set --url https://api.devnet.solana.com

# Create a new keypair for deployment
RUN solana-keygen new --no-bip39-passphrase --force

# Build script
CMD ["bash", "-c", "\
    echo 'Building program...' && \
    cd programs/coin-flipper && \
    cargo build-bpf && \
    echo 'Program built successfully!' && \
    PROGRAM_SO=$(find target/deploy -name '*.so' | head -n 1) && \
    echo 'Requesting airdrop...' && \
    solana airdrop 2 && \
    sleep 5 && \
    echo 'Deploying program...' && \
    PROGRAM_ID=$(solana program deploy $PROGRAM_SO --output json | jq -r '.programId') && \
    echo \"DEPLOYMENT_SUCCESS:$PROGRAM_ID\" \
"]
EOF

echo "Building Docker image..."
docker build -f Dockerfile.solana -t solana-coin-flipper .

echo "Running deployment in Docker..."
OUTPUT=$(docker run --rm solana-coin-flipper)

# Extract program ID
PROGRAM_ID=$(echo "$OUTPUT" | grep "DEPLOYMENT_SUCCESS:" | cut -d: -f2)

if [ -n "$PROGRAM_ID" ]; then
    echo ""
    echo "================================================"
    echo "         DEPLOYMENT SUCCESSFUL!"
    echo "================================================"
    echo ""
    echo "Program ID: $PROGRAM_ID"
    echo "Network: Devnet"
    echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
    
    # Update Anchor.toml
    sed -i "s/coin_flipper = \".*\"/coin_flipper = \"$PROGRAM_ID\"/" Anchor.toml
    echo "Updated Anchor.toml with new program ID"
else
    echo "Error: Failed to deploy program"
    echo "Output: $OUTPUT"
    exit 1
fi

# Clean up
rm -f Dockerfile.solana

echo ""
echo "Next steps:"
echo "1. Update your frontend .env with the new program ID"
echo "2. Initialize the program with your configuration"
echo "3. Test the deployed program"