# GitHub Codespaces Deployment Guide

This guide provides step-by-step instructions for building and deploying the Solana Coin Flipper smart contract and frontend application using GitHub Codespaces.

## Prerequisites

- GitHub account with access to Codespaces
- Your GitHub repository should contain this coin flipper project
- Basic familiarity with terminal commands

## Step 1: Launch GitHub Codespaces

1. Navigate to your GitHub repository containing the coin flipper project
2. Click the green **"Code"** button
3. Select the **"Codespaces"** tab
4. Click **"Create codespace on main"** (or your preferred branch)
5. Wait for the Codespace to fully initialize (this may take several minutes)

## Step 2: Verify Development Environment

Once your Codespace is ready, verify the required tools are installed:

```bash
# Check Node.js version
node --version
# Should show v18.x or higher

# Check npm version  
npm --version

# Check Rust version
rustc --version

# Check Solana CLI version
solana --version

# Check Anchor CLI version
anchor --version
```

If any tools are missing, install them using the provided scripts or install manually.

## Step 3: Install Dependencies

Install all project dependencies:

```bash
# Install Node.js dependencies for the frontend
npm install

# Install Rust dependencies for the smart contract
cd programs/coin-flipper
cargo build-dependencies
cd ../..
```

## Step 4: Configure Solana Environment

Set up your Solana environment for development:

```bash
# Configure Solana to use devnet
solana config set --url https://api.devnet.solana.com

# Generate a new keypair for deployment (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your configuration
solana config get

# Airdrop some SOL for deployment costs
solana airdrop 2

# Check your balance
solana balance
```

**Important:** Save your keypair's seed phrase securely if this is for production use.

## Step 5: Build the Smart Contract

Navigate to the smart contract directory and build:

```bash
# Build the Anchor program
anchor build

# Check build was successful
ls -la target/deploy/
# You should see: coin_flipper.so and coin_flipper-keypair.json
```

## Step 6: Deploy the Smart Contract

Deploy your built smart contract to Solana Devnet:

```bash
# Deploy the program
anchor deploy

# Note down the Program ID that gets printed
# It will look like: Program Id: 7xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Step 7: Initialize the Program State

Initialize the deployed program with configuration:

```bash
# Run the initialization script
anchor run initialize

# Or manually call the initialize instruction
# This sets up the global state with house wallet and fee configuration
```

## Step 8: Update Frontend Configuration

Update your frontend configuration files with the deployed Program ID:

1. **Update `src/config/program.ts`:**
   ```typescript
   // Replace YOUR_DEPLOYED_PROGRAM_ID with the actual ID from step 6
   export const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');
   ```

2. **Update `src/config/constants.ts`:**
   ```typescript
   export const PROGRAM_ID = 'YOUR_DEPLOYED_PROGRAM_ID';
   ```

3. **Update environment files if they exist:**
   ```bash
   # .env
   REACT_APP_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
   
   # .env.production
   REACT_APP_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
   ```

## Step 9: Update IDL Files

Copy the generated IDL (Interface Description Language) files:

```bash
# Copy the generated IDL to the frontend
cp target/idl/coin_flipper.json src/idl/coin_flipper.json

# Backup the old deployed IDL if it exists
mv src/idl/coin_flipper_deployed.json src/idl/coin_flipper_deployed_backup.json

# Copy new deployed IDL
cp target/idl/coin_flipper.json src/idl/coin_flipper_deployed.json
```

## Step 10: Build and Test the Frontend

Build and test your React application:

```bash
# Install any missing dependencies
npm install

# Run ESLint to check for issues
npm run lint

# Build the production version
npm run build

# Start the development server to test
npm start
```

The development server should start and provide a URL (usually http://localhost:3000). In Codespaces, this will be automatically forwarded and accessible via a generated URL.

## Step 11: Test the Application

1. **Open the forwarded port URL** provided by Codespaces
2. **Connect a Solana wallet** (like Phantom) configured for Devnet
3. **Test the core functionality:**
   - Connect wallet
   - Check balance display
   - Create a room with small bet (0.01 SOL)
   - Join the room from another wallet/browser
   - Make selections within the time limit
   - Verify game resolution and payouts

## Step 12: Deploy to Production (Optional)

If you want to deploy the frontend to a hosting service:

### For Vercel:
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### For Netlify:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=build
```

### For GitHub Pages:
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
# "homepage": "https://yourusername.github.io/your-repo-name",
# "predeploy": "npm run build",
# "deploy": "gh-pages -d build"

# Deploy
npm run deploy
```

## Troubleshooting

### Common Issues and Solutions:

**1. "insufficient funds for rent" Error:**
```bash
# Airdrop more SOL
solana airdrop 2
```

**2. Program deployment fails:**
```bash
# Make sure you have enough SOL
solana balance

# Try deploying with more SOL
solana airdrop 5
anchor deploy
```

**3. Frontend can't find rooms:**
- Verify the Program ID is correct in all config files
- Check browser console for connection errors
- Ensure you're connected to the same network (devnet)

**4. Build fails:**
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install

# Clear Rust target directory
cargo clean
anchor build
```

**5. Timeout issues:**
- The smart contract timeout is now set to 120 seconds (2 minutes)
- Make sure to make selections promptly
- Use the "Handle Timeout" button if games get stuck

## Environment Variables

Create a `.env` file in your project root if needed:

```env
# Solana Network
REACT_APP_SOLANA_NETWORK=devnet
REACT_APP_SOLANA_RPC_URL=https://api.devnet.solana.com

# Program ID (replace with your deployed ID)
REACT_APP_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID

# Optional: Analytics or other services
REACT_APP_ANALYTICS_ID=your_analytics_id
```

## File Structure After Deployment

Your project should look like this:

```
flipCoin/
├── programs/
│   └── coin-flipper/
│       ├── src/
│       │   └── lib.rs          # Updated with 120s timeout
│       └── Cargo.toml
├── src/
│   ├── components/
│   │   ├── AboutGame.tsx       # Game rules and info
│   │   ├── CountdownTimer.tsx  # Selection timer
│   │   └── BlockchainGame.tsx  # Main game component
│   ├── config/
│   │   ├── program.ts         # Program ID config
│   │   └── constants.ts       # App constants
│   └── idl/
│       └── coin_flipper.json  # Updated IDL
├── target/
│   └── deploy/
│       ├── coin_flipper.so
│       └── coin_flipper-keypair.json
├── Anchor.toml
└── package.json
```

## Security Notes

- **Never commit private keys** to version control
- Use **environment variables** for sensitive configuration
- The deployed program ID is **public** and safe to share
- Always test on **devnet** before mainnet deployment
- Consider using a **multisig wallet** for program authority on mainnet

## Next Steps

After successful deployment:

1. **Monitor the application** for any runtime issues
2. **Gather user feedback** and iterate on the UI/UX
3. **Consider security audits** before mainnet deployment
4. **Set up monitoring** and analytics
5. **Plan for mainnet migration** when ready

## Support

If you encounter issues:

1. Check the **browser console** for errors
2. Verify **network connectivity** to Solana RPC
3. Ensure **wallet connection** is working
4. Check **Program ID configuration** consistency
5. Review **Solana transaction logs** on the explorer

---

**Happy Deploying!** 🚀

For questions or issues, please check the project's GitHub issues or create a new one with detailed information about your problem.
