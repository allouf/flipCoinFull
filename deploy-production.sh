<<<<<<< HEAD
#!/bin/bash

# Production Deployment Script for Solana Coin Flipper
# This script deploys the production-ready smart contract with real money transfers

set -e  # Exit on error

echo "================================================"
echo "Solana Coin Flipper - Production Deployment"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

if ! command -v node &> /dev/null; then
    print_error "Node.js not found"
    exit 1
fi

print_status "All dependencies found"

# Check Solana configuration
echo ""
echo "Step 2: Checking Solana configuration..."
SOLANA_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
WALLET_PATH=$(solana config get | grep "Keypair Path" | awk '{print $3}')

echo "RPC URL: $SOLANA_URL"
echo "Wallet: $WALLET_PATH"

if [[ "$SOLANA_URL" == *"mainnet"* ]]; then
    print_warning "You are connected to MAINNET!"
    echo "This will deploy with REAL MONEY. Are you sure? (yes/no)"
    read -r confirm
    if [[ $confirm != "yes" ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
elif [[ "$SOLANA_URL" == *"devnet"* ]]; then
    print_status "Connected to devnet - safe for testing"
else
    print_error "Unknown network: $SOLANA_URL"
    exit 1
fi

# Check wallet balance
echo ""
echo "Step 3: Checking wallet balance..."
BALANCE=$(solana balance | awk '{print $1}')

if (( $(echo "$BALANCE < 1" | bc -l) )); then
    print_error "Insufficient balance: $BALANCE SOL"
    echo "You need at least 1 SOL for deployment"
    
    if [[ "$SOLANA_URL" == *"devnet"* ]]; then
        print_status "Requesting devnet airdrop..."
        solana airdrop 2
        BALANCE=$(solana balance | awk '{print $1}')
    else
        exit 1
    fi
fi

print_status "Wallet balance: $BALANCE SOL"

# Replace lib.rs with production version
echo ""
echo "Step 4: Preparing production code..."
if [[ -f "programs/coin-flipper/src/lib_production.rs" ]]; then
    cp programs/coin-flipper/src/lib.rs programs/coin-flipper/src/lib_backup.rs
    cp programs/coin-flipper/src/lib_production.rs programs/coin-flipper/src/lib.rs
    print_status "Production code activated"
else
    print_error "Production code not found at programs/coin-flipper/src/lib_production.rs"
    exit 1
fi

# Build the program
echo ""
echo "Step 5: Building the program..."
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
echo "Step 6: Deploying to Solana..."
PROGRAM_SO="programs/coin-flipper/target/deploy/coin_flipper.so"

if [[ ! -f "$PROGRAM_SO" ]]; then
    print_error "Program binary not found: $PROGRAM_SO"
    exit 1
fi

echo "Deploying program binary..."
DEPLOY_OUTPUT=$(solana program deploy "$PROGRAM_SO" 2>&1)

if [[ $? -eq 0 ]]; then
    PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')
    
    if [[ -z "$PROGRAM_ID" ]]; then
        print_error "Could not extract Program ID from deployment output"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Program deployed successfully!"
    echo "Program ID: $PROGRAM_ID"
else
    print_error "Deployment failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Update Anchor.toml
echo ""
echo "Step 7: Updating configuration..."
sed -i.bak "s/coin_flipper = \".*\"/coin_flipper = \"$PROGRAM_ID\"/" Anchor.toml
print_status "Anchor.toml updated with new Program ID"

# Build IDL and types
echo ""
echo "Step 8: Generating IDL and types..."
anchor build

# Initialize the program
echo ""
echo "Step 9: Initializing the program..."

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    print_status "Installing Node.js dependencies..."
    npm install
fi

# Run initialization
echo "Running initialization script..."
if [[ -f "scripts/initialize-production.ts" ]]; then
    npx ts-node scripts/initialize-production.ts
    
    if [[ $? -eq 0 ]]; then
        print_status "Program initialized successfully!"
    else
        print_error "Initialization failed"
        exit 1
    fi
else
    print_error "Initialization script not found"
    exit 1
fi

# Final verification
echo ""
echo "Step 10: Final verification..."
solana program show "$PROGRAM_ID" >/dev/null 2>&1

if [[ $? -eq 0 ]]; then
    print_status "Program verification successful"
else
    print_error "Program verification failed"
    exit 1
fi

# Success summary
echo ""
echo "================================================"
echo "         PRODUCTION DEPLOYMENT SUCCESSFUL!"
echo "================================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Network: $SOLANA_URL"
echo "Wallet: $(solana address)"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=$(echo $SOLANA_URL | grep -o 'devnet\|mainnet')"
echo ""
echo "✅ Smart contract features:"
echo "  - Real SOL transfers and escrow"
echo "  - Automatic winner payouts"
echo "  - House fee collection (3%)"
echo "  - Timeout handling with refunds"
echo "  - Emergency pause functionality"
echo ""
echo "🎮 Ready for production use!"
echo ""
echo "Next steps:"
echo "1. Test the complete game flow"
echo "2. Set up your frontend with the new Program ID"
echo "3. Configure your house wallet for fee collection"
echo ""

# Restore original lib.rs
if [[ -f "programs/coin-flipper/src/lib_backup.rs" ]]; then
    mv programs/coin-flipper/src/lib_backup.rs programs/coin-flipper/src/lib.rs
    print_status "Original lib.rs restored"
fi

echo "Deployment completed successfully! 🚀"
=======
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
>>>>>>> a3240bbb5f653348ce26db5b5699e8140160ba70
