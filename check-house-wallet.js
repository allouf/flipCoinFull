const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');

// Configuration
const PROGRAM_ID = 'DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp';
const NETWORK_URL = 'https://api.devnet.solana.com';

async function checkHouseWallet() {
    console.log('🏠 Checking House Wallet Configuration...');
    console.log('============================================');
    
    try {
        // Create connection
        const connection = new Connection(NETWORK_URL, 'confirmed');
        const programId = new PublicKey(PROGRAM_ID);
        
        // Derive global state PDA
        const [globalStatePda] = PublicKey.findProgramAddressSync(
            [Buffer.from('global_state')],
            programId
        );
        
        console.log('📍 Program ID:', programId.toString());
        console.log('🏛️  Global State PDA:', globalStatePda.toString());
        
        // Try to fetch the global state account
        const accountInfo = await connection.getAccountInfo(globalStatePda);
        
        if (!accountInfo) {
            console.log('❌ Global state account not found');
            return;
        }
        
        console.log('✅ Global state account found');
        console.log('📦 Account Data Length:', accountInfo.data.length, 'bytes');
        
        // Parse the account data manually (since we don't have the full program setup)
        const data = accountInfo.data;
        
        // Skip discriminator (8 bytes) and read the authority (32 bytes)
        const authorityBytes = data.slice(8, 40);
        const authority = new PublicKey(authorityBytes);
        
        // Read house wallet (32 bytes after authority)
        const houseWalletBytes = data.slice(40, 72);
        const houseWallet = new PublicKey(houseWalletBytes);
        
        // Read house fee (2 bytes after house wallet)
        const houseFeeBpsBytes = data.slice(72, 74);
        const houseFeeBps = houseFeeBpsBytes.readUInt16LE(0);
        
        // Read total games (8 bytes after house fee)
        const totalGamesBytes = data.slice(74, 82);
        const totalGames = totalGamesBytes.readBigUInt64LE(0);
        
        // Read total volume (8 bytes after total games)
        const totalVolumeBytes = data.slice(82, 90);
        const totalVolume = totalVolumeBytes.readBigUInt64LE(0);
        
        // Read is_paused (1 byte after total volume)
        const isPaused = data[90] === 1;
        
        console.log('\n📊 Contract Configuration:');
        console.log('   👤 Authority:', authority.toString());
        console.log('   🏠 House Wallet:', houseWallet.toString());
        console.log('   💵 House Fee:', houseFeeBps / 100, '% (' + houseFeeBps + ' bps)');
        console.log('   🎮 Total Games:', totalGames.toString());
        console.log('   📈 Total Volume:', (Number(totalVolume) / 1e9).toFixed(4), 'SOL');
        console.log('   ⏸️  Is Paused:', isPaused);
        
        console.log('\n🔗 Useful Links:');
        console.log('   Program Explorer:', `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`);
        console.log('   Global State:', `https://explorer.solana.com/address/${globalStatePda.toString()}?cluster=devnet`);
        console.log('   Authority:', `https://explorer.solana.com/address/${authority.toString()}?cluster=devnet`);
        console.log('   House Wallet:', `https://explorer.solana.com/address/${houseWallet.toString()}?cluster=devnet`);
        
        // Check house wallet balance
        const houseBalance = await connection.getBalance(houseWallet);
        console.log('\n💰 House Wallet Balance:', (houseBalance / 1e9).toFixed(6), 'SOL');
        
        return {
            programId: PROGRAM_ID,
            authority: authority.toString(),
            houseWallet: houseWallet.toString(),
            houseFeeBps,
            totalGames: totalGames.toString(),
            totalVolume: totalVolume.toString(),
            isPaused,
            houseBalance: houseBalance / 1e9
        };
        
    } catch (error) {
        console.error('❌ Error checking house wallet:', error.message);
        
        if (error.message.includes('Account does not exist')) {
            console.log('\n💡 This might mean:');
            console.log('   1. The program is not initialized yet');
            console.log('   2. Wrong Program ID');
            console.log('   3. Wrong network (should be devnet)');
        }
    }
}

// Run the check
checkHouseWallet()
    .then((result) => {
        if (result) {
            console.log('\n✅ House wallet check completed successfully!');
        }
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
    });
