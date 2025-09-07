# Create Real Switchboard VRF Accounts

## Prerequisites

1. **Install Switchboard CLI** (requires Node.js 20+):
```bash
npm install -g @switchboard-xyz/cli
```

2. **Create Solana Keypair for Devnet**:
```bash
solana-keygen new --outfile ~/.config/solana/devnet-keypair.json
solana config set --keypair ~/.config/solana/devnet-keypair.json
solana config set --url https://api.devnet.solana.com
```

3. **Fund Your Keypair**:
```bash
solana airdrop 2
```

## Devnet VRF Account Creation

### Known Devnet Oracle Queue
- **Queue Public Key**: `F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy`
- **Network**: Devnet
- **Type**: Permissionless (no authorization required)

### Create VRF Accounts

**1. Primary VRF Account:**
```bash
sb solana vrf create \
  --keypair ~/.config/solana/devnet-keypair.json \
  --cluster devnet \
  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy \
  --authority HSNpbt8Z741Be4NU1Btf8Yka9aGj167GquHVQMHrXTrT \
  --callback vrf_callback \
  --maxResult 1
```

**2. Secondary VRF Account:**
```bash
sb solana vrf create \
  --keypair ~/.config/solana/devnet-keypair.json \
  --cluster devnet \
  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy \
  --authority HSNpbt8Z741Be4NU1Btf8Yka9aGj167GquHVQMHrXTrT \
  --callback vrf_callback \
  --maxResult 1
```

**3. Tertiary VRF Account:**
```bash
sb solana vrf create \
  --keypair ~/.config/solana/devnet-keypair.json \
  --cluster devnet \
  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy \
  --authority HSNpbt8Z741Be4NU1Btf8Yka9aGj167GquHVQMHrXTrT \
  --callback vrf_callback \
  --maxResult 1
```

## Program Authority PDA

**CALCULATED FOR YOUR DEPLOYED PROGRAM:**

- **Program ID**: `EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou` (your deployed contract)
- **VRF Authority PDA**: `HSNpbt8Z741Be4NU1Btf8Yka9aGj167GquHVQMHrXTrT`
- **Global State PDA**: `51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed`

This PDA is calculated as:
```rust
// In your Anchor program
let (program_authority, _bump) = Pubkey::find_program_address(
    &[b"COIN_FLIP_VRF_AUTH"],
    &program_id  // EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
);
```

## Expected Costs

- **VRF Account Creation**: ~0.2 SOL per account
- **VRF Request**: ~0.002 SOL per request
- **Oracle Rewards**: Funded automatically from account balance

## After Creation

1. **Copy Public Keys**: Save the generated VRF account public keys
2. **Update Environment**: Replace placeholder addresses in `.env.staging`
3. **Fund Accounts**: Each VRF account needs 0.1+ SOL for oracle rewards
4. **Test Integration**: Run validation script to confirm accounts work

## Funding VRF Accounts

After creation, fund each VRF account for ongoing operation:
```bash
sb solana vrf fund \
  --cluster devnet \
  --vrfKey YOUR_VRF_ACCOUNT_PUBKEY \
  --amount 0.5
```

## Example Output Format

When you create VRF accounts, you'll get output like:
```
✅ VRF Account Created: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHR1
   Queue: F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy
   Authority: [YOUR_PROGRAM_PDA]
   Callback: [YOUR_CALLBACK_FUNCTION]
```

Use these public keys in your `.env.staging` configuration.