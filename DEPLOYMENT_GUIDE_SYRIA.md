# Deployment Guide for Syria (with Sanctions)

## Problem
- npm and many development tools are blocked in Syria
- ProtonVPN on Windows doesn't automatically route WSL traffic
- Direct deployment from WSL fails due to SSL/connection errors

## Solution Options

### Option 1: Configure ProtonVPN for WSL (Recommended)

1. **In ProtonVPN Settings:**
   - Go to Settings → Split Tunneling
   - Add WSL to the list of apps that use VPN
   - Or enable "VPN for all apps"

2. **Configure WSL Proxy:**
   ```bash
   # In WSL terminal
   cd /mnt/f/Andrius/flipCoin
   chmod +x scripts/setup-wsl-proxy.sh
   ./scripts/setup-wsl-proxy.sh
   ```

3. **If ProtonVPN uses SOCKS5 (port 1080):**
   ```bash
   # In WSL
   export ALL_PROXY=socks5://$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):1080
   ```

### Option 2: Use GitHub Codespaces (Easiest)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Open GitHub Codespaces:**
   - Go to your repo on GitHub
   - Click "Code" → "Codespaces" → "Create codespace"
   - This gives you a free cloud development environment

3. **In Codespace terminal:**
   ```bash
   # Install Solana
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   
   # Install Anchor
   cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0
   
   # Build and deploy
   cd programs/coin-flipper
   cargo build-bpf
   solana program deploy target/deploy/coin_flipper.so
   ```

### Option 3: Deploy from Windows (Using Solana CLI for Windows)

1. **Download Solana for Windows:**
   - Use your browser (with VPN) to download: https://github.com/solana-labs/solana/releases
   - Get `solana-release-x86_64-pc-windows-msvc.tar.bz2`

2. **Extract and Install:**
   ```powershell
   # In PowerShell
   tar -xf solana-release-x86_64-pc-windows-msvc.tar.bz2
   cd solana-release
   .\solana.exe --version
   ```

3. **Deploy:**
   ```powershell
   # Configure for devnet
   .\solana.exe config set --url https://api.devnet.solana.com
   
   # Create wallet
   .\solana.exe keygen new
   
   # Airdrop SOL
   .\solana.exe airdrop 2
   
   # Deploy program
   .\solana.exe program deploy F:\Andrius\flipCoin\programs\coin-flipper\target\deploy\coin_flipper.so
   ```

### Option 4: Use a VPS

1. **Get a cheap VPS** (DigitalOcean, Linode, etc.) - $5/month
2. **SSH into VPS** (your VPN will work for this)
3. **Clone repo and deploy from VPS:**
   ```bash
   git clone <your-repo>
   cd flipCoin
   # Run normal deployment commands
   ```

## Quick Fix for Your Current Situation

Since you already have the code ready, the fastest solution is:

1. **Use GitHub Codespaces** (free 60 hours/month)
2. **Or fix WSL proxy:**
   ```bash
   # In WSL, set proxy to your Windows host
   export ALL_PROXY=socks5://172.24.16.1:1080  # Adjust IP and port
   ```

3. **Test connection:**
   ```bash
   curl -I https://google.com
   ```

## Important Notes

- ProtonVPN typically uses port 1080 for SOCKS5
- The Windows host IP in WSL2 can be found with: `cat /etc/resolv.conf | grep nameserver`
- If nothing works, GitHub Codespaces is your best bet - it's free and bypasses all local issues

## Program Already Built

Good news: Your program seems to be already compiled. The `.so` file should be at:
```
F:\Andrius\flipCoin\programs\coin-flipper\target\deploy\coin_flipper.so
```

You just need to deploy it to Solana devnet, which requires internet access with proper proxy configuration.