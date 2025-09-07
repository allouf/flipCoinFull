# 🚀 Smart Contract Deployment & Initialization Guide

## 🔍 **Critical Issues Found & Fixed**

### ❌ **Issues Identified:**
1. **Missing fee collection account initialization** - Smart contract expects `house_wallet` during initialization
2. **VRF features need proper configuration** - Environment variables for VRF accounts not set up
3. **Program ID mismatch** - Test expects different program ID than declared
4. **Missing deployment script** - No automated deployment process

### ✅ **Solutions Implemented Below**

---

## 📋 **Pre-Deployment Checklist**

### 1. **Environment Setup**
- [ ] Solana CLI installed and configured
- [ ] Anchor CLI installed (v0.29.0)
- [ ] Wallet funded with SOL for deployment fees
- [ ] Node.js dependencies installed

### 2. **Smart Contract Configuration**
- [ ] Program ID updated in `Anchor.toml` and `lib.rs`
- [ ] VRF accounts configured in `.env`
- [ ] House fee percentage set (default 3%)
- [ ] Minimum bet amount configured (default 0.01 SOL)

### 3. **Deployment Preparation**
- [ ] Target network selected (devnet/mainnet)
- [ ] Deployment wallet has sufficient balance
- [ ] House wallet created for fee collection
- [ ] VRF oracle accounts ready (if using VRF)

---

## 🛠 **Step-by-Step Deployment Process**

### **Step 1: Generate New Program Keypair**
```bash
# Generate new program keypair
solana-keygen new -o target/deploy/coin_flipper-keypair.json --no-bip39-passphrase

# Get the program ID
solana address -k target/deploy/coin_flipper-keypair.json
```

### **Step 2: Update Program ID in Code**
Update the program ID in these files:
- `programs/coin-flipper/src/lib.rs` - `declare_id!("NEW_PROGRAM_ID")`
- `Anchor.toml` - `coin_flipper = "NEW_PROGRAM_ID"`

### **Step 3: Create House Wallet**
```bash
# Generate house wallet for fee collection
solana-keygen new -o house-wallet.json --no-bip39-passphrase

# Get the house wallet address
solana address -k house-wallet.json
```

### **Step 4: Build and Deploy**
```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Or deploy to mainnet
anchor deploy --provider.cluster mainnet
```

### **Step 5: Initialize the Program**
```bash
# Initialize with house wallet and fee (3% = 300 basis points)
anchor run initialize --provider.cluster devnet
```

---

## 🔧 **Smart Contract Initialization Explanation**

### **What Happens During Initialization:**
1. **Global State Creation**: Creates a Program Derived Account (PDA) to store global configuration
2. **Authority Setup**: Sets the deploying wallet as the program authority
3. **House Wallet Configuration**: Sets the wallet that will receive fees from games
4. **Fee Configuration**: Sets the percentage fee (in basis points - 300 = 3%)
5. **Counter Initialization**: Initializes game counters and volume tracking

### **Required Parameters:**
- `authority` - Wallet that deployed the program (automatic)
- `house_wallet` - PublicKey where fees will be sent
- `house_fee_bps` - Fee percentage in basis points (300 = 3%, max 1000 = 10%)

### **Account Structure Created:**
```rust
pub struct GlobalState {
    pub authority: Pubkey,      // Program admin
    pub house_wallet: Pubkey,   // Fee collection wallet
    pub house_fee_bps: u16,     // Fee percentage (3% = 300)
    pub total_games: u64,       // Games played counter
    pub total_volume: u64,      // Total SOL wagered
    pub is_paused: bool,        // Emergency pause flag
}
```

---

## 🔑 **VRF Configuration (If Using Switchboard)**

### **Required Environment Variables:**
```bash
# Add to .env file
VRF_ACCOUNT_1_PUBKEY=your_switchboard_vrf_account_1
VRF_ACCOUNT_2_PUBKEY=your_switchboard_vrf_account_2
VRF_ACCOUNT_3_PUBKEY=your_switchboard_vrf_account_3

# VRF Health Monitoring
VRF_MAX_QUEUE_DEPTH=20
VRF_MAX_RESPONSE_TIME=10000
VRF_MIN_SUCCESS_RATE=0.8
```

### **VRF Account Setup:**
1. Create Switchboard VRF accounts on chosen network
2. Fund VRF accounts with sufficient SOL for requests  
3. Configure VRF accounts in program initialization
4. Test VRF integration with sample requests

---

## 🧪 **Testing & Verification**

### **Post-Deployment Tests:**
```bash
# Run anchor tests
anchor test

# Test program initialization
anchor test --grep "Program Initialization"

# Test room creation
anchor test --grep "Room Creation" 

# Test VRF integration (if enabled)
anchor test --grep "VRF Integration"
```

### **Manual Verification:**
1. **Check Global State**: Verify authority, house wallet, and fee settings
2. **Create Test Room**: Ensure room creation works with valid bet amounts
3. **Test Game Flow**: Complete a full game from creation to resolution
4. **Verify Fee Collection**: Confirm house fees are collected properly
5. **Test Error Handling**: Verify invalid inputs are rejected

---

## 💰 **Fee Collection Setup**

### **House Wallet Security:**
- Use a multisig wallet for mainnet deployments
- Keep private keys secure and backed up
- Consider using a hardware wallet
- Set up monitoring for fee collection

### **Fee Structure:**
- **Default**: 3% of total pot (300 basis points)
- **Range**: 0.1% to 10.0% (10 to 1000 basis points)
- **Calculation**: `house_fee = (total_pot * house_fee_bps) / 10000`
- **Example**: 1 SOL pot × 3% = 0.03 SOL house fee

---

## ⚠️ **Security Considerations**

### **Before Mainnet Deployment:**
- [ ] Code audit completed
- [ ] Security review of VRF integration
- [ ] Test all edge cases thoroughly
- [ ] Verify program upgrade authority
- [ ] Set up monitoring and alerting
- [ ] Prepare incident response plan

### **Access Controls:**
- [ ] Authority wallet secured with multisig
- [ ] House wallet properly configured
- [ ] VRF oracle permissions validated
- [ ] Program freeze/pause mechanisms tested

---

## 🚨 **Troubleshooting Common Issues**

### **Program ID Mismatch:**
```bash
# Error: Program ID in declare_id! doesn't match keypair
# Solution: Update lib.rs with correct program ID
```

### **Insufficient Funds:**
```bash
# Error: Not enough SOL for deployment
# Solution: Fund deployment wallet
solana airdrop 2 --url devnet
```

### **House Wallet Not Found:**
```bash
# Error: House wallet account not found during initialization
# Solution: Ensure house wallet exists and is funded
```

### **VRF Account Invalid:**
```bash
# Error: VRF account not recognized by Switchboard
# Solution: Use valid Switchboard VRF accounts for your network
```

---

## 📚 **Next Steps After Deployment**

1. **Frontend Integration**: Update frontend with new program ID
2. **VRF Service Setup**: Configure VRF request handling
3. **Monitoring Setup**: Implement transaction and error monitoring  
4. **User Testing**: Conduct beta testing with real users
5. **Performance Optimization**: Monitor and optimize gas usage
6. **Documentation**: Update user-facing documentation

---

## 🎯 **Quick Deployment Commands**

```bash
# Full deployment sequence
anchor build
anchor deploy --provider.cluster devnet
anchor run initialize --provider.cluster devnet
anchor test

# Update frontend with new program ID
# Start frontend with updated configuration
npm start
```

**Total Estimated Time**: 15-30 minutes depending on network conditions

**Estimated Cost**: 
- Devnet: Free (with airdrops)
- Mainnet: ~0.5-1.0 SOL for deployment and initialization