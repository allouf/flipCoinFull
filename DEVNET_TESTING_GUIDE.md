# Solana Coin Flipper - Devnet Testing Guide

## 🚀 Quick Setup for Testing

The app is now configured for **Devnet** by default, so you can test without spending real SOL!

## 1. Wallet Setup for Devnet

### Using Your Existing Phantom Wallet

**Good news:** You can use your existing Phantom wallet on Devnet! You don't need to create a new account.

**Steps:**
1. Open your Phantom wallet extension
2. Click on the settings (gear icon)  
3. Go to "Developer Settings" or "Change Network"
4. Select **"Devnet"** from the network dropdown
5. Your wallet will now be on Devnet with a 0 SOL balance

### Alternative: Creating a New Devnet Wallet

If you prefer a separate wallet for testing:
1. Create a new wallet in Phantom
2. Switch it to Devnet network
3. Save the seed phrase separately for testing

## 2. Getting Test SOL (Devnet)

### Method 1: Solana CLI Airdrop (Recommended)

**Install Solana CLI:**
```bash
# Windows (using Chocolatey)
choco install solana

# Or download from: https://github.com/solana-labs/solana/releases
```

**Get Test SOL:**
```bash
# Configure CLI for devnet
solana config set --url https://api.devnet.solana.com

# Airdrop 2 SOL to your wallet
solana airdrop 2 YOUR_WALLET_ADDRESS

# Check balance
solana balance YOUR_WALLET_ADDRESS
```

**Your wallet address:** `EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2`

**Commands for your wallet:**
```bash
solana config set --url https://api.devnet.solana.com
solana airdrop 2 EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2
solana balance EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2
```

### Method 2: Web Faucet

1. Visit: https://faucet.solana.com/
2. Select "Devnet"
3. Enter your wallet address: `EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2`
4. Complete any CAPTCHA if required
5. Click "Request Airdrop"

### Method 3: SolFaucet (Alternative)

1. Visit: https://solfaucet.com/
2. Enter your wallet address
3. Select Devnet
4. Request tokens

## 3. Testing Your Setup

### Step 1: Check Wallet Connection
1. Open your app at `http://localhost:3002`
2. Make sure your Phantom is on **Devnet**
3. Click "Connect Wallet" 
4. Select Phantom from the modal
5. Approve connection
6. You should see your wallet address and SOL balance

### Step 2: Network Verification
1. Check the network selector in the top-right
2. It should show "Devnet"
3. If not, click and select "Devnet"

### Step 3: Test Coin Flip
1. Scroll to "Try Your Luck" section
2. Click "Heads" or "Tails"
3. Click "Flip Coin!"
4. Wait for result
5. Click "Play Again" to reset

### Step 4: Test Modal
1. Disconnect wallet (click dropdown → Disconnect)
2. Click "Connect Wallet" again
3. Modal should appear centered and fully accessible
4. Try closing with: backdrop click, Escape key, or X button

## 4. Troubleshooting

### Issue: Wallet Won't Connect
**Solution:**
- Ensure Phantom is on Devnet network
- Try refreshing both the wallet and the page
- Clear browser cache if needed

### Issue: 0 SOL Balance
**Solution:**
- Double-check you're on Devnet in both wallet and app
- Run the airdrop commands above
- Wait a few minutes for the airdrop to process

### Issue: Airdrop Failed
**Solution:**
- You can only request 2 SOL per airdrop
- Wait 24 hours between airdrops
- Try the web faucet as an alternative

### Issue: Modal Behind Other Elements
**Solution:**
- This should be fixed with the latest updates
- Try refreshing the page
- Check browser zoom level (should be 100%)

## 5. What You Can Test

### ✅ Currently Working Features:
- Wallet connection (Phantom, Solflare, Ledger)
- Network switching (Mainnet, Devnet, Testnet)
- Coin flip animation and logic
- Modal positioning and accessibility
- Wallet disconnect functionality
- Balance display
- Responsive design

### 🚧 Features Coming Soon:
- Real betting with SOL
- Room creation and joining
- Multiplayer functionality
- Smart contract integration
- VRF (verifiable randomness)

## 6. Using Different Networks

### Testnet Setup (Alternative to Devnet)
```bash
# Switch to testnet
solana config set --url https://api.testnet.solana.com
solana airdrop 1 EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2
```

**In the app:**
1. Click network selector
2. Choose "Testnet"  
3. Your balance will update

### Mainnet (Real SOL) ⚠️
**Warning:** Only use mainnet when you want to spend real SOL!
- Switch app to "Mainnet"
- Switch Phantom to Mainnet
- You'll need real SOL for transactions

## 7. Expected Test Flow

**Complete testing scenario:**
1. ✅ Switch Phantom to Devnet
2. ✅ Get 2 SOL via airdrop
3. ✅ Connect wallet to app
4. ✅ Verify balance shows ~2 SOL
5. ✅ Test coin flip functionality  
6. ✅ Test modal positioning
7. ✅ Test wallet disconnect/reconnect
8. ✅ Test network switching
9. ✅ Test responsive design (mobile)

## 8. Development Notes

The app is now configured for safe testing:
- **Default network:** Devnet
- **No real money risk:** All transactions are on Devnet
- **Free testing:** Unlimited test SOL available
- **Wallet compatibility:** Works with your existing Phantom wallet

## 9. Next Steps for Full Implementation

Once basic testing is complete, we'll add:
1. **Smart contracts** (Anchor programs)
2. **Real betting logic** with escrow
3. **VRF integration** for provably fair randomness
4. **Room management** system
5. **WebSocket** real-time updates
6. **Tournament** modes

## 10. Need Help?

If you encounter any issues:
1. Check that both wallet and app are on same network
2. Ensure you have test SOL in your wallet
3. Try refreshing the page
4. Clear browser cache/cookies
5. Restart Phantom extension

**Ready to test?** Follow steps 1-2 to get set up, then start testing! 🎲