# 🎲 Complete VRF Setup Guide

## ✅ CONFIRMED ACTIVE DEPLOYMENT
- **Program ID**: `EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou`
- **Global State PDA**: `51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed`
- **VRF Authority PDA**: `CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8`
- **VRF Queue**: `F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy`
- **Status**: INITIALIZED ✅

## 🚀 METHOD 1: Switchboard CLI (Recommended)

### Prerequisites:
1. ✅ Switchboard CLI installed (@switchboard-xyz/cli@3.5.12)
2. Generate and fund a keypair with ~3 SOL
3. Set environment variables

### Step 1: Create and Fund Keypair
```bash
# Generate new keypair for VRF operations (save this securely!)
sb solana generate-keypair

# Or create using your existing house wallet keypair
# (If using house wallet, make sure it has 3+ SOL)
```

### Step 2: Create VRF Accounts (Exact Commands)
```bash
# VRF Account 1 (Primary)
sb solana vrf create --cluster devnet --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy --authority CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8 --callback vrf_callback --maxResult 1

# VRF Account 2 (Secondary)  
sb solana vrf create --cluster devnet --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy --authority CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8 --callback vrf_callback --maxResult 1

# VRF Account 3 (Tertiary)
sb solana vrf create --cluster devnet --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy --authority CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8 --callback vrf_callback --maxResult 1
```

---

## 🌐 METHOD 2: Switchboard Web Interface (Alternative)

If CLI issues persist:

1. Visit: https://ondemand.switchboard.xyz/solana/devnet
2. Connect your funded wallet
3. Create VRF Account with these exact settings:
   - **Queue**: `F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy`
   - **Authority**: `CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8`
   - **Callback**: `vrf_callback`
   - **Max Result**: `1`
4. Repeat 3 times for redundancy

---

## 📝 UPDATE VERCEL ENVIRONMENT VARIABLES

### STEP 1: Fix Current Variables
Replace these in Vercel Dashboard → Settings → Environment Variables:

```bash
# CORE (CORRECTED - was wrong)
REACT_APP_PROGRAM_ID=EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
REACT_APP_GLOBAL_STATE_PDA=51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed

# VRF CONFIGURATION (CORRECTED)
REACT_APP_VRF_AUTHORITY=CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8
REACT_APP_VRF_QUEUE=F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy

# HOUSE WALLET (CONFIRMED CORRECT)
REACT_APP_HOUSE_WALLET=CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp
```

### STEP 2: Add Real VRF Account Pubkeys
After creating VRF accounts, add:

```bash
# Real VRF Accounts (Replace with actual pubkeys from VRF creation)
REACT_APP_VRF_ACCOUNT_1_PUBKEY=YOUR_FIRST_VRF_PUBKEY_HERE
REACT_APP_VRF_ACCOUNT_1_NAME=primary-vrf
REACT_APP_VRF_ACCOUNT_1_PRIORITY=1

REACT_APP_VRF_ACCOUNT_2_PUBKEY=YOUR_SECOND_VRF_PUBKEY_HERE
REACT_APP_VRF_ACCOUNT_2_NAME=secondary-vrf
REACT_APP_VRF_ACCOUNT_2_PRIORITY=2

REACT_APP_VRF_ACCOUNT_3_PUBKEY=YOUR_THIRD_VRF_PUBKEY_HERE
REACT_APP_VRF_ACCOUNT_3_NAME=tertiary-vrf
REACT_APP_VRF_ACCOUNT_3_PRIORITY=3
```

---

## ✅ VALIDATION

After setup, run:
```bash
npm run test:real-vrf-setup
```

Should show: **10/10 tests passed** ✅

---

## 💰 COST ESTIMATE
- **Per VRF Account**: ~0.8-0.9 SOL
- **Total for 3 accounts**: ~2.6 SOL
- **Buffer recommended**: 3+ SOL total

---

## 🎯 FINAL RESULT

Once complete, your Solana Coin Flipper will have:
- ✅ Real cryptographically verifiable randomness
- ✅ Production-ready VRF integration  
- ✅ Multiple VRF accounts for redundancy
- ✅ No smart contract redeployment needed!

---

## 🆘 TROUBLESHOOTING

### CLI Issues:
- Node.js version warnings are OK (installed successfully)
- If CLI fails, use Web Interface method

### Funding Issues:
- Use your house wallet if it has enough SOL
- Or create new keypair and fund via faucet
- Each VRF creation needs ~0.9 SOL

### Authority Issues:
- **MUST USE**: `CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8`
- This is derived from your deployed program
- Using wrong authority will break VRF integration
