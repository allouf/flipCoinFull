# Setup and Deploy Script for Solana Coin Flipper (Windows)
# This script sets up the environment and deploys the smart contract to devnet

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Solana Coin Flipper - Setup and Deploy Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to print status messages
function Write-Success {
    param($Message)
    Write-Host "[✓] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Error {
    param($Message)
    Write-Host "[✗] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param($Message)
    Write-Host "[!] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

# Step 1: Check if running in WSL
Write-Host ""
Write-Host "Step 1: Checking environment..." -ForegroundColor White

$wslAvailable = $false
try {
    $wslStatus = wsl --status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $wslAvailable = $true
        Write-Success "WSL is available"
    }
} catch {
    Write-Warning "WSL is not available or not configured"
}

if (-not $wslAvailable) {
    Write-Error "This script requires WSL (Windows Subsystem for Linux)"
    Write-Host "Please install WSL by running: wsl --install" -ForegroundColor Yellow
    Exit 1
}

# Step 2: Run setup in WSL
Write-Host ""
Write-Host "Step 2: Running setup in WSL..." -ForegroundColor White

# Create a temporary script to run in WSL
$wslScript = @'
#!/bin/bash
set -e

# Install Rust if not present
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Install Solana CLI if not present
if ! command -v solana &> /dev/null; then
    echo "Installing Solana CLI..."
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
fi

# Install essential build tools
sudo apt-get update -qq
sudo apt-get install -y build-essential pkg-config libssl-dev libudev-dev

# Configure Solana for devnet
solana config set --url https://api.devnet.solana.com

# Create wallet if not exists
WALLET_PATH="$HOME/.config/solana/devnet.json"
if [ ! -f "$WALLET_PATH" ]; then
    echo "Creating new wallet..."
    solana-keygen new --outfile "$WALLET_PATH" --no-bip39-passphrase --force
fi

solana config set --keypair "$WALLET_PATH"
WALLET_ADDRESS=$(solana address)
echo "Wallet address: $WALLET_ADDRESS"

# Check balance and airdrop if needed
BALANCE=$(solana balance | awk '{print $1}')
if [ $(echo "$BALANCE < 2" | bc) -eq 1 ]; then
    echo "Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

echo "Setup complete!"
'@

# Convert script path to WSL path
$projectPath = (Get-Location).Path
$wslPath = $projectPath -replace '\\', '/' -replace '^([A-Z]):', '/mnt/$1'.ToLower()

# Save script to a file
$scriptPath = Join-Path $projectPath "scripts\wsl-setup.sh"
$wslScript | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "Running WSL setup script..." -ForegroundColor Yellow
wsl bash -c "cd '$wslPath' && chmod +x scripts/wsl-setup.sh && bash scripts/wsl-setup.sh"

# Step 3: Build and deploy using WSL
Write-Host ""
Write-Host "Step 3: Building and deploying program..." -ForegroundColor White

$buildScript = @'
#!/bin/bash
set -e

source "$HOME/.cargo/env"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI via Cargo
if ! command -v anchor &> /dev/null; then
    echo "Installing Anchor..."
    cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0
fi

# Build the program
echo "Building program..."
cd programs/coin-flipper
cargo build-bpf

# Get the deployed program path
PROGRAM_SO=$(find target/deploy -name "*.so" | head -n 1)
if [ -z "$PROGRAM_SO" ]; then
    echo "Error: Could not find built program (.so file)"
    exit 1
fi

# Deploy the program
echo "Deploying program..."
PROGRAM_ID=$(solana program deploy "$PROGRAM_SO" --output json | jq -r '.programId')

if [ -z "$PROGRAM_ID" ]; then
    echo "Error: Failed to deploy program"
    exit 1
fi

echo "PROGRAM_DEPLOYED:$PROGRAM_ID"
'@

$buildScript | Out-File -FilePath "$projectPath\scripts\wsl-build.sh" -Encoding UTF8

Write-Host "Building and deploying program in WSL..." -ForegroundColor Yellow
$output = wsl bash -c "cd '$wslPath' && chmod +x scripts/wsl-build.sh && bash scripts/wsl-build.sh"

# Extract program ID from output
$programId = $output | Select-String -Pattern "PROGRAM_DEPLOYED:(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }

if ($programId) {
    Write-Success "Program deployed successfully!"
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "         DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Program ID: $programId" -ForegroundColor Cyan
    Write-Host "Network: Devnet" -ForegroundColor Cyan
    Write-Host "Explorer: https://explorer.solana.com/address/$programId?cluster=devnet" -ForegroundColor Cyan
    
    # Update Anchor.toml with new program ID
    $anchorTomlPath = Join-Path $projectPath "Anchor.toml"
    $anchorToml = Get-Content $anchorTomlPath -Raw
    $anchorToml = $anchorToml -replace 'coin_flipper = ".*"', "coin_flipper = `"$programId`""
    $anchorToml | Out-File -FilePath $anchorTomlPath -Encoding UTF8
    
    Write-Success "Updated Anchor.toml with new program ID"
} else {
    Write-Error "Failed to deploy program"
    Exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your frontend .env with the new program ID" -ForegroundColor White
Write-Host "2. Run 'npm run deploy:init' to initialize the program" -ForegroundColor White
Write-Host "3. Test the deployed program" -ForegroundColor White