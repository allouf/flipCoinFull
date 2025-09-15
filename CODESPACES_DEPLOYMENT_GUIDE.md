# Complete Codespaces Deployment Guide

## 📁 **Files That Have Been Modified (Copy These)**

### **1. Smart Contract (CRITICAL)**
**File:** `programs/coin-flipper/src/lib.rs`
**Status:** ✅ UPDATED with auto-resolution system
**Key Changes:**
- Added `RESOLUTION_FEE_PER_PLAYER = 1_000_000` (0.001 SOL)
- Added `auto_resolve_game()` function
- Updated `make_selection()` for auto-resolution
- Added escrow balance validation
- Fixed all critical security issues

### **2. Frontend Configuration**
**File:** `src/config/constants.ts`
**Status:** ✅ UPDATED
**Key Changes:**
- Updated `RESOLUTION_FEE_PER_PLAYER = 0.001`

### **3. Frontend Component**
**File:** `src/components/BlockchainGame.tsx`
**Status:** ✅ UPDATED
**Key Changes:**
- Removed manual resolve functionality
- Updated cost calculations
- Added auto-resolution messaging

## 🚀 **Step-by-Step Deployment Process**

### **STEP 1: Push Changes to GitHub**

```powershell
# Navigate to your project root
cd F:\flipCoin

# Add all modified files
git add .

# Commit with descriptive message
git commit -m "feat: implement auto-resolution system with fair fee sharing

- Add automatic game resolution when both players select
- Pre-fund resolution fees (0.001 SOL per player)
- Remove manual resolve requirement
- Fix tie scenario handling
- Add escrow balance validation
- Update frontend cost calculations"

# Push to GitHub
git push origin main
```

### **STEP 2: Open GitHub Codespaces**

1. **Go to your GitHub repository**
2. **Click "Code" > "Codespaces"**
3. **Click "Create codespace on main"** (or use existing one)
4. **Wait for environment to load** (~5-10 minutes)

### **STEP 3: Verify Files in Codespaces**

Once Codespaces loads, verify the updated files:

```bash
# Check smart contract has correct resolution fee
grep -n "RESOLUTION_FEE_PER_PLAYER" programs/coin-flipper/src/lib.rs

# Should show: pub const RESOLUTION_FEE_PER_PLAYER: u64 = 1_000_000;

# Check frontend constant
grep -n "RESOLUTION_FEE_PER_PLAYER" src/config/constants.ts

# Should show: export const RESOLUTION_FEE_PER_PLAYER = 0.001;
```

### **STEP 4: Set Up Environment**

```bash
# Ensure you're on devnet
solana config set --url https://api.devnet.solana.com

# Check wallet
solana address

# Get airdrop for deployment
solana airdrop 5
solana balance
```

### **STEP 5: Build Smart Contract**

```bash
# Navigate to project root
cd /workspaces/flipCoin

# Build the updated contract
anchor build

# Verify build succeeded
ls -la target/deploy/
ls -la target/idl/
```

### **STEP 6: Deploy Smart Contract**

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# IMPORTANT: Note the Program ID from output
# It will look like: "Program Id: DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp"
```

### **STEP 7: Update Program ID (if changed)**

If the Program ID changed during deployment:

```bash
# Update Anchor.toml (should be automatic)
# Update the declare_id! in the smart contract
# Update constants.ts in frontend

# Example if new Program ID is ABC123...
sed -i 's/DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp/ABC123.../g' src/config/constants.ts

# Rebuild if Program ID changed
anchor build
anchor deploy --provider.cluster devnet
```

### **STEP 8: Initialize Program**

```bash
# Install Node dependencies
npm install

# Run initialization script
npm run deploy:init

# OR run manual initialization
npx ts-node scripts/initialize-production.ts
```

### **STEP 9: Build Frontend**

```bash
# Build frontend with updated constants
npm run build

# Start development server for testing
npm start
```

### **STEP 10: Test the System**

Open the frontend (usually `https://CODESPACE_NAME-3000.app.github.dev`) and test:

1. **Create a game** - verify cost shows bet + 0.001 SOL + tx fees
2. **Join the game** - verify same cost structure
3. **Both players select** - verify game auto-resolves
4. **Check no manual resolve buttons** - should be gone
5. **Test timeout scenario** - verify refunds include resolution fees

## 📋 **Verification Checklist**

### **Smart Contract:**
- [ ] `RESOLUTION_FEE_PER_PLAYER = 1_000_000` (1M lamports = 0.001 SOL)
- [ ] `auto_resolve_game()` function exists
- [ ] `make_selection()` calls auto-resolve
- [ ] `validate_escrow_balance()` function exists
- [ ] All timeout constants defined
- [ ] Builds without errors

### **Frontend:**
- [ ] `RESOLUTION_FEE_PER_PLAYER = 0.001` in constants.ts
- [ ] Cost calculations include resolution fee
- [ ] No "Resolve Game" buttons visible
- [ ] Auto-resolution messaging present
- [ ] Builds without errors

### **Deployment:**
- [ ] Program deploys successfully
- [ ] Program initializes without errors
- [ ] Frontend connects to deployed program
- [ ] Test game creation works
- [ ] Test game joining works
- [ ] Test auto-resolution works

## 🔧 **Troubleshooting**

### **Common Issues:**

**1. Build Errors:**
```bash
# Clean and rebuild
cargo clean
anchor build
```

**2. Deployment Fails:**
```bash
# Check wallet balance
solana balance

# Get more SOL
solana airdrop 2

# Try deployment again
anchor deploy --provider.cluster devnet
```

**3. Program ID Mismatch:**
```bash
# Check current Program ID in Anchor.toml
cat Anchor.toml

# Update frontend constants if needed
nano src/config/constants.ts
```

**4. Frontend Build Errors:**
```bash
# Clear cache and rebuild
rm -rf node_modules
npm install
npm run build
```

## 📊 **Expected Costs**

### **Deployment Costs (Devnet):**
- Program deployment: ~0.05-0.1 SOL
- Program initialization: ~0.002 SOL
- Testing transactions: ~0.02 SOL
- **Total needed: ~0.1-0.2 SOL**

### **Game Costs After Deployment:**
- **Create game (0.01 SOL bet):** 0.012 SOL total
- **Join game:** 0.012 SOL total
- **Winner receives:** ~0.0194 SOL
- **House collects:** 0.0026 SOL

## 🎯 **Success Indicators**

**You'll know everything worked when:**
1. ✅ Smart contract deploys without errors
2. ✅ Program initializes successfully
3. ✅ Frontend shows updated cost calculations
4. ✅ Games auto-resolve when both players select
5. ✅ No manual resolve buttons appear
6. ✅ Tie games refund both players properly
7. ✅ Timeout scenarios work correctly

## 📞 **Need Help?**

**If you encounter issues:**
1. Check console logs in browser dev tools
2. Check program logs: `solana logs <PROGRAM_ID> --url devnet`
3. Verify wallet has sufficient SOL
4. Ensure all files were copied correctly
5. Try clean rebuild: `cargo clean && anchor build`

---

**🚀 Ready to deploy! The auto-resolution system will provide a much better user experience with fair cost sharing.**
