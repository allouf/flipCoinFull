const { Connection, PublicKey } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');

async function inspectProgramAccounts() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const PROGRAM_ID = new PublicKey('EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou');
    
    console.log('🔍 Inspecting Program Accounts...\n');
    
    try {
        // Get all program accounts
        const accounts = await connection.getProgramAccounts(PROGRAM_ID);
        console.log(`Found ${accounts.length} accounts for program ${PROGRAM_ID.toString()}\n`);
        
        // Load IDL to decode accounts
        let idl;
        try {
            idl = require('./target/idl/coin_flipper.json');
        } catch {
            console.log('⚠️ IDL not found, showing raw data only\n');
        }
        
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            console.log(`--- Account ${i + 1} ---`);
            console.log(`Address: ${account.pubkey.toString()}`);
            console.log(`Data length: ${account.account.data.length} bytes`);
            console.log(`Owner: ${account.account.owner.toString()}`);
            console.log(`Lamports: ${account.account.lamports}`);
            
            // Try to decode if we have IDL
            if (idl) {
                try {
                    const coder = new anchor.BorshCoder(idl);
                    
                    // Try to decode as different account types
                    const accountTypes = ['gameRoom', 'globalState'];
                    let decoded = null;
                    let accountType = null;
                    
                    for (const type of accountTypes) {
                        try {
                            decoded = coder.accounts.decode(type, account.account.data);
                            accountType = type;
                            break;
                        } catch (e) {
                            // Continue trying other types
                        }
                    }
                    
                    if (decoded && accountType) {
                        console.log(`Account type: ${accountType}`);
                        console.log('Decoded data:');
                        console.log(JSON.stringify(decoded, (key, value) => {
                            // Handle BigNumber and PublicKey serialization
                            if (typeof value === 'object' && value !== null) {
                                if (value._isBN) {
                                    return value.toString();
                                }
                                if (value.constructor && value.constructor.name === 'PublicKey') {
                                    return value.toString();
                                }
                            }
                            return value;
                        }, 2));
                    } else {
                        console.log('❌ Could not decode account data');
                        console.log('Raw data (first 32 bytes):');
                        console.log(account.account.data.slice(0, 32));
                    }
                } catch (error) {
                    console.log('❌ Decode error:', error.message);
                }
            }
            console.log('\n');
        }
        
    } catch (error) {
        console.error('Error inspecting accounts:', error);
    }
}

inspectProgramAccounts();