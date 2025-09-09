const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// House wallet private key from your deployment
const HOUSE_PRIVATE_KEY = [128,38,5,218,213,110,205,61,29,115,195,61,181,249,205,59,48,71,2,146,234,229,212,40,92,248,251,170,145,189,7,148,171,249,227,94,179,61,88,95,59,251,56,106,3,125,107,235,24,98,98,176,70,44,236,129,184,161,106,200,209,82,67,77];

// VRF Configuration
const VRF_QUEUE = 'F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy';
const VRF_AUTHORITY = 'CKV9QC7VLe2PAm2pVpAAhzybZZN7JsemAzLbvssn5tL8';
const CALLBACK = 'vrf_callback';

async function main() {
    console.log('🎲 Creating VRF Accounts with House Wallet');
    console.log('=' .repeat(50));
    
    // Create connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Load house wallet
    const houseWallet = Keypair.fromSecretKey(new Uint8Array(HOUSE_PRIVATE_KEY));
    console.log('🏠 House Wallet:', houseWallet.publicKey.toString());
    
    // Check balance
    try {
        const balance = await connection.getBalance(houseWallet.publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        
        console.log('💰 Current Balance:', solBalance.toFixed(3), 'SOL');
        
        if (solBalance < 3) {
            console.log('❌ Insufficient balance! Need at least 3 SOL for VRF creation.');
            console.log('💡 Options:');
            console.log('   1. Fund this wallet with more SOL from faucet');
            console.log('   2. Use a different funded wallet');
            console.log('   3. Use Switchboard Web Interface instead');
            return;
        }
        
        console.log('✅ Balance sufficient for VRF creation!');
        console.log('\\n🚀 Starting VRF Account Creation...\\n');
        
        // Save house wallet to temporary file for CLI use
        const fs = require('fs');
        const tempWalletPath = './temp-house-wallet.json';
        fs.writeFileSync(tempWalletPath, JSON.stringify(Array.from(houseWallet.secretKey)));
        
        // Create VRF accounts using CLI
        const vrfAccounts = [];
        
        for (let i = 1; i <= 3; i++) {
            console.log(`📅 Creating VRF Account ${i}...`);
            
            const command = `sb solana vrf create --keypairPath ${tempWalletPath} --cluster devnet --queueKey ${VRF_QUEUE} --authority ${VRF_AUTHORITY} --callback ${CALLBACK} --maxResult 1`;
            
            try {
                const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
                
                // Parse VRF account address from output
                const lines = stdout.split('\\n');
                const vrfLine = lines.find(line => line.includes('VRF Account:') || line.includes('Address:'));
                
                if (vrfLine) {
                    // Extract address - this is a simplified parser
                    const match = vrfLine.match(/([A-Za-z0-9]{32,})/);
                    if (match) {
                        const vrfAddress = match[1];
                        vrfAccounts.push({
                            number: i,
                            address: vrfAddress,
                            name: `vrf-account-${i}`,
                            priority: i
                        });
                        console.log(`   ✅ VRF Account ${i}: ${vrfAddress}`);
                    }
                } else {
                    console.log(`   ⚠️  Created but couldn't parse address from output`);
                    console.log('   Full output:', stdout);
                }
                
                if (stderr) {
                    console.log(`   ⚠️  Stderr: ${stderr}`);
                }
                
                // Small delay between creations
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`   ❌ Error creating VRF Account ${i}:`, error.message);
            }
        }
        
        // Clean up temp file
        fs.unlinkSync(tempWalletPath);
        
        // Display results
        console.log('\\n📊 VRF CREATION SUMMARY:');
        console.log('=' .repeat(50));
        
        if (vrfAccounts.length === 0) {
            console.log('❌ No VRF accounts were successfully created.');
            console.log('💡 Try the Switchboard Web Interface instead:');
            console.log('   https://ondemand.switchboard.xyz/solana/devnet');
        } else {
            console.log(`✅ Successfully created ${vrfAccounts.length}/3 VRF accounts:`);
            
            vrfAccounts.forEach(account => {
                console.log(`   ${account.number}. ${account.address}`);
            });
            
            console.log('\\n📝 VERCEL ENVIRONMENT VARIABLES:');
            vrfAccounts.forEach(account => {
                console.log(`REACT_APP_VRF_ACCOUNT_${account.number}_PUBKEY=${account.address}`);
                console.log(`REACT_APP_VRF_ACCOUNT_${account.number}_NAME=${account.name}`);
                console.log(`REACT_APP_VRF_ACCOUNT_${account.number}_PRIORITY=${account.priority}`);
            });
            
            console.log('\\n🎯 NEXT STEPS:');
            console.log('1. Add the environment variables above to Vercel dashboard');
            console.log('2. Update the program ID and authority in Vercel as well');
            console.log('3. Deploy and test your application');
            console.log('4. Run: npm run test:real-vrf-setup to validate');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main().catch(console.error);
