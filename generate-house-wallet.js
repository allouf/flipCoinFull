const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const bs58 = require('bs58');

// Generate new keypair for house wallet
const houseWallet = Keypair.generate();

// Get the secret key in different formats
const secretKey = houseWallet.secretKey;
const secretKeyBase58 = bs58.encode(secretKey);
const publicKey = houseWallet.publicKey.toString();

// Save to file
const walletData = Array.from(secretKey);
fs.writeFileSync('house-wallet.json', JSON.stringify(walletData));

console.log('=' .repeat(80));
console.log('🏠 HOUSE WALLET GENERATED SUCCESSFULLY');
console.log('=' .repeat(80));
console.log('\n📍 Public Key (Wallet Address):');
console.log(publicKey);
console.log('\n🔑 Private Key (Base58 - KEEP SECRET):');
console.log(secretKeyBase58);
console.log('\n🔢 Secret Key Array (first 32 bytes):');
console.log(walletData.slice(0, 32).join(', '));
console.log('\n💾 Saved to: house-wallet.json');
console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
console.log('This wallet will receive 3% fees from all games.');
console.log('\n📝 To import in Phantom:');
console.log('1. Open Phantom wallet');
console.log('2. Click menu → Add/Connect Wallet');
console.log('3. Import Private Key');
console.log('4. Paste the Base58 private key above');
console.log('=' .repeat(80));