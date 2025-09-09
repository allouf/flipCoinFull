const { Connection, PublicKey } = require('@solana/web3.js');

// All possible program IDs from different sources
const PROGRAM_IDS = [
    'EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou', // Your stated deployment
    '4wVjz9Ajh5BVSQi6rGiiPX9mnTXQx98biyyjLEJ78grb', // From local keypair
    'GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn', // From Vercel env
    'GNyb71eMrPVKcfTnxQjzVJu2bfMQdmwNWFfuN3ripe47', // From Anchor.toml
];

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkDeployment(programId) {
    try {
        console.log(`\n🔍 Checking Program ID: ${programId}`);
        
        const pubkey = new PublicKey(programId);
        const accountInfo = await connection.getAccountInfo(pubkey);
        
        if (!accountInfo) {
            console.log('   ❌ Account does not exist');
            return null;
        }
        
        if (!accountInfo.executable) {
            console.log('   ❌ Account exists but is not executable (not a program)');
            return null;
        }
        
        console.log('   ✅ Program exists and is executable');
        console.log(`   📊 Data length: ${accountInfo.data.length} bytes`);
        console.log(`   💰 Lamports: ${accountInfo.lamports}`);
        
        // Check if initialized by trying to fetch global state PDA
        const [globalStatePda] = PublicKey.findProgramAddressSync(
            [Buffer.from('global_state')],
            pubkey
        );
        
        console.log(`   🏛️  Global State PDA: ${globalStatePda.toString()}`);
        
        // Try to fetch global state account
        const globalStateInfo = await connection.getAccountInfo(globalStatePda);
        
        if (globalStateInfo && globalStateInfo.data.length > 0) {
            console.log('   ✅ Global state exists (INITIALIZED)');
            console.log(`   📊 Global state size: ${globalStateInfo.data.length} bytes`);
            
            // Calculate VRF Authority PDA
            const [vrfAuthPda] = PublicKey.findProgramAddressSync(
                [Buffer.from('vrf_authority')],
                pubkey
            );
            console.log(`   🎲 VRF Authority PDA: ${vrfAuthPda.toString()}`);
            
            return {
                programId: programId,
                isActive: true,
                isInitialized: true,
                globalStatePda: globalStatePda.toString(),
                vrfAuthorityPda: vrfAuthPda.toString(),
                lamports: accountInfo.lamports,
                dataLength: accountInfo.data.length
            };
        } else {
            console.log('   ⚠️  Program exists but not initialized');
            return {
                programId: programId,
                isActive: true,
                isInitialized: false,
                globalStatePda: globalStatePda.toString(),
                lamports: accountInfo.lamports,
                dataLength: accountInfo.data.length
            };
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🔍 FINDING ACTIVE DEPLOYMENT');
    console.log('=' .repeat(60));
    
    const results = [];
    
    for (const programId of PROGRAM_IDS) {
        const result = await checkDeployment(programId);
        if (result) {
            results.push(result);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n📊 SUMMARY OF ACTIVE DEPLOYMENTS:');
    console.log('=' .repeat(60));
    
    if (results.length === 0) {
        console.log('❌ No active deployments found!');
        return;
    }
    
    const initializedDeployments = results.filter(r => r.isInitialized);
    
    if (initializedDeployments.length === 0) {
        console.log('⚠️  Found programs but none are initialized:');
        results.forEach(r => {
            console.log(`   📋 ${r.programId} (exists, not initialized)`);
        });
    } else if (initializedDeployments.length === 1) {
        const active = initializedDeployments[0];
        console.log('✅ FOUND SINGLE ACTIVE DEPLOYMENT:');
        console.log(`   📋 Program ID: ${active.programId}`);
        console.log(`   🏛️  Global PDA: ${active.globalStatePda}`);
        console.log(`   🎲 VRF Authority: ${active.vrfAuthorityPda}`);
        
        console.log('\n🎯 CORRECTED ENVIRONMENT VARIABLES:');
        console.log(`REACT_APP_PROGRAM_ID=${active.programId}`);
        console.log(`REACT_APP_GLOBAL_STATE_PDA=${active.globalStatePda}`);
        console.log(`REACT_APP_VRF_AUTHORITY=${active.vrfAuthorityPda}`);
        
    } else {
        console.log('⚠️  MULTIPLE INITIALIZED DEPLOYMENTS FOUND:');
        initializedDeployments.forEach((deployment, index) => {
            console.log(`\n   ${index + 1}. Program ID: ${deployment.programId}`);
            console.log(`      Global PDA: ${deployment.globalStatePda}`);
            console.log(`      VRF Authority: ${deployment.vrfAuthorityPda}`);
        });
        console.log('\n💡 You may want to choose one and update your configuration.');
    }
}

main().catch(console.error);
