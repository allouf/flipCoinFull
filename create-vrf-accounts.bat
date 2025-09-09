@echo off
echo 🎲 Creating Real VRF Accounts for Coin Flipper
echo ================================================

echo.
echo 📋 DEPLOYMENT DETAILS:
echo Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
echo VRF Authority: CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8
echo VRF Queue: F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy
echo.

echo ⚠️  PREREQUISITES:
echo 1. Install Switchboard CLI: npm install -g @switchboard-xyz/cli
echo 2. Fund a keypair with ~3 SOL on devnet
echo 3. Set SOLANA_CLUSTER=devnet and keypair path
echo.

pause

echo 🚀 CREATING VRF ACCOUNT 1 (Primary)...
sb solana vrf create ^
  --cluster devnet ^
  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy ^
  --authority CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8 ^
  --callback vrf_callback ^
  --maxResult 1

echo.
echo 🚀 CREATING VRF ACCOUNT 2 (Secondary)...
sb solana vrf create ^
  --cluster devnet ^
  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy ^
  --authority CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8 ^
  --callback vrf_callback ^
  --maxResult 1

echo.
echo 🚀 CREATING VRF ACCOUNT 3 (Tertiary)...
sb solana vrf create ^
  --cluster devnet ^
  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy ^
  --authority CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8 ^
  --callback vrf_callback ^
  --maxResult 1

echo.
echo ✅ VRF ACCOUNTS CREATION COMPLETED!
echo.
echo 📝 NEXT STEPS:
echo 1. Copy the 3 VRF public keys from the output above
echo 2. Update Vercel environment variables:
echo    REACT_APP_VRF_ACCOUNT_1_PUBKEY=YOUR_FIRST_VRF_PUBKEY
echo    REACT_APP_VRF_ACCOUNT_2_PUBKEY=YOUR_SECOND_VRF_PUBKEY
echo    REACT_APP_VRF_ACCOUNT_3_PUBKEY=YOUR_THIRD_VRF_PUBKEY
echo.

pause
