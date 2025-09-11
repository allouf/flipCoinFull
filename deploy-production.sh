  #!/bin/bash

  # Production Deployment Script for Solana Coin Flipper
  set -e

  echo "================================================"
  echo "Solana Coin Flipper - Production Deployment"
  echo "================================================"

  # Colors
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  NC='\033[0m'

  print_status() {
      echo -e "${GREEN}[✓]${NC} $1"
  }

  print_error() {
      echo -e "${RED}[✗]${NC} $1"
  }

  print_warning() {
      echo -e "${YELLOW}[!]${NC} $1"
  }

  # Check dependencies
  echo ""
  echo "Step 1: Checking dependencies..."

  if ! command -v solana &> /dev/null; then
      print_error "Solana CLI not found"
      exit 1
  fi

  if ! command -v anchor &> /dev/null; then
      print_error "Anchor CLI not found"
      exit 1
  fi

  print_status "Dependencies found"

  # Check Solana config
  echo ""
  echo "Step 2: Checking Solana configuration..."
  SOLANA_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
  echo "RPC URL: $SOLANA_URL"

  # Check wallet balance
  echo ""
  echo "Step 3: Checking wallet balance..."
  BALANCE=$(solana balance | awk '{print $1}')

  if (( $(echo "$BALANCE < 1" | bc -l) )); then
      print_warning "Low balance: $BALANCE SOL"
      if [[ "$SOLANA_URL" == *"devnet"* ]]; then
          print_status "Requesting devnet airdrop..."
          solana airdrop 2
      fi
  fi

  print_status "Wallet balance: $(solana balance)"

  # Build the program
  echo ""
  echo "Step 4: Building the program..."
  cd programs/coin-flipper
  cargo build-bpf

  if [[ $? -eq 0 ]]; then
      print_status "Program built successfully"
  else
      print_error "Build failed"
      exit 1
  fi

  cd ../..

  # Deploy the program
  echo ""
  echo "Step 5: Deploying to Solana..."
  PROGRAM_SO="programs/coin-flipper/target/deploy/coin_flipper.so"

  DEPLOY_OUTPUT=$(solana program deploy "$PROGRAM_SO" 2>&1)
  PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')

  if [[ -n "$PROGRAM_ID" ]]; then
      print_status "Program deployed successfully!"
      echo "Program ID: $PROGRAM_ID"
  else
      print_error "Deployment failed"
      echo "$DEPLOY_OUTPUT"
      exit 1
  fi

  # Update Anchor.toml
  echo ""
  echo "Step 6: Updating Anchor.toml..."
  sed -i "s/coin_flipper = \".*\"/coin_flipper = \"$PROGRAM_ID\"/" Anchor.toml
  print_status "Anchor.toml updated"

  # Install Node dependencies
  echo ""
  echo "Step 7: Installing dependencies..."
  npm install @coral-xyz/anchor @solana/web3.js typescript ts-node --save

  # Generate IDL
  echo ""
  echo "Step 8: Generating IDL..."
  anchor build

  echo ""
  echo "================================================"
  echo "         DEPLOYMENT SUCCESSFUL!"
  echo "================================================"
  echo ""
  echo "Program ID: $PROGRAM_ID"
  echo "Network: $SOLANA_URL"
  echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
  echo ""
  echo "Next: Initialize the program with your house wallet"
  echo ""
