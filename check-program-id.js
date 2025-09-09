const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

// Read the keypair file
const keypairData = JSON.parse(fs.readFileSync('target/deploy/coin_flipper-keypair.json', 'utf8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

console.log('Program ID from keypair:', keypair.publicKey.toString());

// Also check the values you mentioned
console.log('\n=== VERIFICATION ===');
console.log('Your stated Program ID: EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou');
console.log('Keypair derived ID:', keypair.publicKey.toString());
console.log('Match:', keypair.publicKey.toString() === 'EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou');
