# Switchboard VRF Production Setup Guide

## Overview

This guide explains how to obtain and configure production Switchboard VRF accounts for the Solana Coin Flipper betting game. Switchboard VRF provides verifiable randomness essential for fair gameplay.

## Prerequisites

### 1. Development Environment
- Solana CLI installed and configured
- Anchor framework (v0.29.0+)
- Node.js with TypeScript
- Sufficient SOL for account creation and rent

### 2. Account Requirements
- **Devnet**: 0.2 SOL per VRF account (for rent exemption)
- **Mainnet**: 0.2 SOL per VRF account + additional SOL for requests
- **Request Cost**: ~0.002 SOL per VRF request (50x cheaper than original)

## Production VRF Account Setup Process

### Step 1: Create Program Authority PDA

The program authority is a PDA (Program Derived Address) that will sign on behalf of your program when requesting randomness.

```typescript
// In your Anchor program
const [programAuthority, programAuthorityBump] = await PublicKey.findProgramAddress(
  [Buffer.from("COIN_FLIP_VRF_AUTH")], // Custom seed for your program
  program.programId
);
```

### Step 2: Create VRF Accounts

You need to create multiple VRF accounts for redundancy. Each account requires:

1. **Authority**: Your program's PDA authority
2. **Callback Function**: The function that receives randomness results
3. **Queue**: The Switchboard oracle queue to use

#### For Devnet:

```bash
# Use Switchboard CLI to create VRF accounts
npm install -g @switchboard-xyz/cli

# Create VRF account 1
sb solana vrf create \
  --keypair your-wallet.json \
  --cluster devnet \
  --authority YOUR_PROGRAM_AUTHORITY_PDA \
  --callback your_program_callback_function
```

#### For Mainnet:

```bash
# Create VRF account for mainnet
sb solana vrf create \
  --keypair your-wallet.json \
  --cluster mainnet-beta \
  --authority YOUR_PROGRAM_AUTHORITY_PDA \
  --callback your_program_callback_function
```

### Step 3: Configure Multiple VRF Accounts for Redundancy

For production reliability, create at least 3 VRF accounts:

#### Account Configuration Template:

```typescript
// VRF Account 1 - Primary
export const VRF_ACCOUNT_1 = {
  publicKey: "YOUR_ACTUAL_VRF_ACCOUNT_1_PUBKEY", // Replace with actual
  name: "switchboard-primary",
  priority: 1,
};

// VRF Account 2 - Secondary
export const VRF_ACCOUNT_2 = {
  publicKey: "YOUR_ACTUAL_VRF_ACCOUNT_2_PUBKEY", // Replace with actual
  name: "switchboard-secondary", 
  priority: 2,
};

// VRF Account 3 - Tertiary
export const VRF_ACCOUNT_3 = {
  publicKey: "YOUR_ACTUAL_VRF_ACCOUNT_3_PUBKEY", // Replace with actual
  name: "switchboard-tertiary",
  priority: 3,
};
```

## Environment Variable Configuration

### Development (.env.development)

```bash
# VRF Account Configuration - DEVELOPMENT
REACT_APP_VRF_ACCOUNT_1_PUBKEY=11111111111111111111111111111112
REACT_APP_VRF_ACCOUNT_1_NAME=dev-primary
REACT_APP_VRF_ACCOUNT_1_PRIORITY=1

REACT_APP_VRF_ACCOUNT_2_PUBKEY=11111111111111111111111111111113
REACT_APP_VRF_ACCOUNT_2_NAME=dev-secondary
REACT_APP_VRF_ACCOUNT_2_PRIORITY=2

REACT_APP_VRF_ACCOUNT_3_PUBKEY=11111111111111111111111111111114
REACT_APP_VRF_ACCOUNT_3_NAME=dev-tertiary
REACT_APP_VRF_ACCOUNT_3_PRIORITY=3
```

### Production (.env.production)

```bash
# VRF Account Configuration - PRODUCTION
REACT_APP_VRF_ACCOUNT_1_PUBKEY=YOUR_ACTUAL_SWITCHBOARD_VRF_ACCOUNT_1
REACT_APP_VRF_ACCOUNT_1_NAME=switchboard-primary
REACT_APP_VRF_ACCOUNT_1_PRIORITY=1

REACT_APP_VRF_ACCOUNT_2_PUBKEY=YOUR_ACTUAL_SWITCHBOARD_VRF_ACCOUNT_2
REACT_APP_VRF_ACCOUNT_2_NAME=switchboard-secondary
REACT_APP_VRF_ACCOUNT_2_PRIORITY=2

REACT_APP_VRF_ACCOUNT_3_PUBKEY=YOUR_ACTUAL_SWITCHBOARD_VRF_ACCOUNT_3
REACT_APP_VRF_ACCOUNT_3_NAME=switchboard-tertiary
REACT_APP_VRF_ACCOUNT_3_PRIORITY=3

# Production Health Thresholds (stricter than dev)
REACT_APP_VRF_MAX_QUEUE_DEPTH=10
REACT_APP_VRF_MAX_RESPONSE_TIME=8000
REACT_APP_VRF_MIN_SUCCESS_RATE=0.95
REACT_APP_VRF_HEALTH_CHECK_INTERVAL=30000
```

## Obtaining Real Production VRF Account Addresses

### Method 1: Switchboard CLI (Recommended)

```bash
# Install Switchboard CLI
npm install -g @switchboard-xyz/cli

# Login to Switchboard (if required)
sb config set authority your-wallet.json

# Create VRF accounts for your specific network
sb solana vrf create --cluster devnet --authority YOUR_PROGRAM_PDA
sb solana vrf create --cluster devnet --authority YOUR_PROGRAM_PDA  
sb solana vrf create --cluster devnet --authority YOUR_PROGRAM_PDA

# List your created VRF accounts
sb solana vrf list --cluster devnet
```

### Method 2: Programmatic Creation

```typescript
import { VrfAccount } from '@switchboard-xyz/solana.js';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

export async function createProductionVRFAccount(
  connection: Connection,
  payer: Keypair,
  authority: PublicKey,
  callback: PublicKey
): Promise<PublicKey> {
  try {
    // Create VRF account
    const vrfAccount = await VrfAccount.create(connection, {
      queue: SWITCHBOARD_QUEUE_PUBKEY, // Use appropriate queue for your network
      callback: callback,
      authority: authority,
      keypair: Keypair.generate(),
      payer: payer,
    });

    console.log('Created VRF Account:', vrfAccount.publicKey.toString());
    return vrfAccount.publicKey;
    
  } catch (error) {
    console.error('Failed to create VRF account:', error);
    throw error;
  }
}
```

### Method 3: Manual Creation via Switchboard Interface

1. Visit Switchboard's web interface (if available)
2. Connect your Solana wallet
3. Create new VRF accounts with your program as the authority
4. Note down the generated public keys

## Known Switchboard Queue Addresses

### Devnet Queues:
```typescript
// Common Switchboard devnet queue (verify these are current)
export const SWITCHBOARD_DEVNET_QUEUE = new PublicKey(
  "uPeRMdfPmrPqgRWSrjAnAkH78RqAhe5kXoW6vBYRqFX"
);
```

### Mainnet Queues:
```typescript
// Common Switchboard mainnet queue (verify these are current)  
export const SWITCHBOARD_MAINNET_QUEUE = new PublicKey(
  "3HBb2DQqDfuMdzWxNk1Eo9RTMkFYmuEAd32RiLKn9pAn"
);
```

**⚠️ Important**: Always verify queue addresses are current by checking the official Switchboard documentation.

## Validation and Testing

### Pre-Production Checklist:

1. **Account Validation**:
   ```bash
   # Test account connectivity
   sb solana vrf status YOUR_VRF_ACCOUNT_PUBKEY --cluster devnet
   ```

2. **Request Testing**:
   ```typescript
   // Test VRF request functionality
   const result = await vrfAccount.requestRandomness(connection, authority);
   ```

3. **Health Monitoring**:
   ```typescript
   // Verify accounts meet production thresholds
   const queueDepth = await vrfAccount.loadData();
   console.log('Queue depth:', queueDepth.counter);
   ```

## Cost Planning

### Devnet (Testing):
- VRF Account Creation: 0.2 SOL each (x3 = 0.6 SOL)
- VRF Requests: 0.002 SOL each
- Development Testing: ~5-10 SOL total

### Mainnet (Production):
- VRF Account Creation: 0.2 SOL each (x3 = 0.6 SOL)  
- VRF Requests: 0.002 SOL each
- Daily Operation (100 games): ~0.2 SOL
- Monthly Operation: ~6 SOL

## Security Considerations

1. **Account Authority**: Use PDA (not personal wallet) as VRF account authority
2. **Private Keys**: Never expose VRF account private keys in frontend code
3. **Request Limits**: Implement rate limiting to prevent VRF spam
4. **Callback Validation**: Always validate VRF results in your callback function
5. **Emergency Fallback**: Have non-VRF randomness backup for emergencies

## Migration from Development to Production

### 1. Update Environment Variables:
Replace all placeholder VRF account addresses (11111111111111111111111111111112, etc.) with real Switchboard VRF account public keys.

### 2. Adjust Health Thresholds:
Production thresholds should be stricter than development:

```typescript
const PRODUCTION_THRESHOLDS = {
  maxQueueDepth: 10,      // vs 20 in dev
  maxResponseTime: 8000,  // vs 10000 in dev  
  minSuccessRate: 0.95,   // vs 0.90 in dev
};
```

### 3. Update Smart Contract:
Ensure your Anchor program references the correct VRF accounts and callback functions for production.

### 4. Test End-to-End:
Always test the complete flow on devnet before mainnet deployment.

## Troubleshooting

### Common Issues:

1. **"VRF Account Invalid"**: Check that account exists and authority is correct
2. **"Insufficient Funds"**: Ensure account has rent + request fees  
3. **"Oracle Queue Full"**: Try alternative queue or wait for capacity
4. **"Callback Failed"**: Verify callback function signature matches expectations

### Support Resources:

- Switchboard Discord: [Official Support Channel]
- Documentation: https://docs.switchboard.xyz
- GitHub Issues: https://github.com/switchboard-xyz/solana-sdk/issues

## Conclusion

Setting up production VRF accounts is critical for the security and fairness of the coin flipper game. Always:

1. Use multiple accounts for redundancy
2. Test thoroughly on devnet first
3. Monitor account health in production
4. Keep adequate SOL balance for requests
5. Have emergency fallback procedures

Remember: VRF verification takes 276 instructions (~48 transactions), so factor this into your game timing and user experience design.