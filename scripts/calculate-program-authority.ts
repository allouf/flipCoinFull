#!/usr/bin/env ts-node

/**
 * Calculate Program Authority PDA for VRF account creation
 * Uses the real deployed program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou
 */

import { PublicKey } from '@solana/web3.js';

// Real deployed program ID
const PROGRAM_ID = new PublicKey('EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou');

// Standard VRF authority seed used by coin flipper programs
const VRF_AUTHORITY_SEED = 'COIN_FLIP_VRF_AUTH';

async function calculateProgramAuthority() {
  console.log('🔍 Calculating Program Authority PDA for VRF Setup\n');
  
  console.log('Program Information:');
  console.log(`  Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`  Authority Seed: "${VRF_AUTHORITY_SEED}"`);
  
  try {
    // Calculate the Program Derived Address (PDA)
    const [programAuthority, bump] = await PublicKey.findProgramAddress(
      [Buffer.from(VRF_AUTHORITY_SEED)],
      PROGRAM_ID
    );
    
    console.log('\n✅ Program Authority Calculated:');
    console.log(`  PDA Address: ${programAuthority.toString()}`);
    console.log(`  Bump Seed: ${bump}`);
    
    console.log('\n📋 Use this PDA as the VRF account authority:');
    console.log(`--authority ${programAuthority.toString()}`);
    
    console.log('\n🔧 Complete Switchboard CLI Command:');
    console.log('sb solana vrf create \\');
    console.log('  --keypair ~/.config/solana/devnet-keypair.json \\');
    console.log('  --cluster devnet \\');
    console.log('  --queueKey F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy \\');
    console.log(`  --authority ${programAuthority.toString()} \\`);
    console.log('  --callback vrf_callback \\');
    console.log('  --maxResult 1');
    
    console.log('\n🎯 Summary:');
    console.log(`  - Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`  - VRF Authority: ${programAuthority.toString()}`);
    console.log(`  - Oracle Queue: F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy`);
    console.log(`  - Callback Function: vrf_callback`);
    
    return {
      programId: PROGRAM_ID.toString(),
      authority: programAuthority.toString(),
      bump,
      oracleQueue: 'F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy'
    };
    
  } catch (error) {
    console.error('❌ Failed to calculate program authority:', error);
    process.exit(1);
  }
}

// Run calculation if called directly
if (require.main === module) {
  calculateProgramAuthority()
    .then(result => {
      console.log('\n🚀 Ready to create VRF accounts!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Calculation failed:', error);
      process.exit(1);
    });
}

export { calculateProgramAuthority, PROGRAM_ID, VRF_AUTHORITY_SEED };