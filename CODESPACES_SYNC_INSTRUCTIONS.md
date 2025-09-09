# Codespaces to Local Sync Instructions

## ⚠️ Important: Codespaces has uncommitted deployment changes

Your Codespaces repo has the actual deployed smart contract with uncommitted changes. Follow these steps to sync properly:

## Step 1: In Codespaces Terminal

```bash
# Save the current deployed lib.rs
cat programs/coin-flipper/src/lib.rs > deployed_lib.rs

# Save the deployment configuration
cat Anchor.toml > deployed_anchor.toml

# Check which initialize script worked
ls -la initialize*.js

# Save the working initialize script (use the one that worked)
cat initialize-final.js > deployed_initialize.js  # or initialize-program.js

# Create a deployment info file
cat > DEPLOYMENT_INFO.txt << EOF
Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
House Wallet: CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp
Global State PDA: 51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed
Network: Solana Devnet
Deployed: $(date)
EOF

# Commit ONLY the necessary files
git add deployed_lib.rs deployed_anchor.toml deployed_initialize.js DEPLOYMENT_INFO.txt
git add .gitignore  # if you created it
git commit -m "Save deployed configuration - Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou"
git push origin main
```

## Step 2: On Local Machine

```bash
# Fetch the updates
git fetch codespaces

# Get the deployed files
git checkout codespaces/main -- deployed_lib.rs deployed_anchor.toml deployed_initialize.js DEPLOYMENT_INFO.txt

# Copy to correct locations
cp deployed_lib.rs programs/coin-flipper/src/lib.rs
cp deployed_anchor.toml Anchor.toml
cp deployed_initialize.js initialize-program.js

# Verify the program ID is correct
grep "declare_id" programs/coin-flipper/src/lib.rs
# Should show: declare_id!("EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou");

# Clean up temporary files
rm deployed_*.* 

# Run verification
node verify-sync.js
```

## Step 3: Clean Up Codespaces Repo

After syncing, in Codespaces:

```bash
# Discard sensitive files (DO NOT COMMIT THESE)
git restore ALL_WALLET_CREDENTIALS.txt HOUSE_WALLET_CREDENTIALS.txt
rm ALL_WALLET_CREDENTIALS.txt HOUSE_WALLET_CREDENTIALS.txt

# Remove large files
rm solana.tar.bz2

# Keep only essential files in Codespaces repo
git clean -fd  # Remove untracked files (be careful!)
```

## Important Files to Sync

✅ **MUST SYNC:**
- `programs/coin-flipper/src/lib.rs` - The deployed smart contract
- `Anchor.toml` - Deployment configuration
- `initialize-program.js` or `initialize-final.js` - The working initialization script

❌ **DO NOT SYNC:**
- `*_CREDENTIALS.txt` - Contains private keys!
- `*.tar.bz2` - Large binary files
- `node_modules/` - Can be regenerated
- `target/` - Build artifacts
- `Cargo.lock` - Will be regenerated

## Current Deployment Info

```
Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
House Wallet: CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp
Global State PDA: 51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed
Network: Solana Devnet
Explorer: https://explorer.solana.com/address/EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou?cluster=devnet
```

## Verification

After syncing, verify with:
```bash
node verify-sync.js
```

Should show all green checkmarks!