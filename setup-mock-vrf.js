/**
 * Mock VRF Setup for Testing
 * 
 * This creates fake VRF account public keys for testing the app
 * without requiring real Switchboard VRF accounts.
 */

const { Keypair } = require('@solana/web3.js');

console.log('🧪 Generating Mock VRF Account Keys for Testing...\n');

// Generate 3 mock VRF account keypairs
const vrfAccounts = [];
for (let i = 1; i <= 3; i++) {
  const keypair = Keypair.generate();
  vrfAccounts.push({
    name: `VRF-${i === 1 ? 'Primary' : i === 2 ? 'Secondary' : 'Fallback'}`,
    publicKey: keypair.publicKey.toString(),
    priority: i
  });
}

console.log('Mock VRF Accounts Generated:');
console.log('=================================');

vrfAccounts.forEach(account => {
  console.log(`${account.name}: ${account.publicKey}`);
});

console.log('\n📝 .env.staging Configuration:');
console.log('==================================');
console.log(`REACT_APP_VRF_ACCOUNT_1=${vrfAccounts[0].publicKey}`);
console.log(`REACT_APP_VRF_ACCOUNT_2=${vrfAccounts[1].publicKey}`);
console.log(`REACT_APP_VRF_ACCOUNT_3=${vrfAccounts[2].publicKey}`);

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('==================');
console.log('• These are MOCK accounts for testing only');
console.log('• Games will use deterministic randomness, not real VRF');
console.log('• Replace with real Switchboard VRF accounts for production');
console.log('• The app will work but without cryptographic randomness');

console.log('\n✅ You can now update your .env.staging file and test the app!');
