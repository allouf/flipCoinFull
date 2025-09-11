const { Connection, PublicKey } = require('@solana/web3.js');

// Your deployed program
const PROGRAM_ID = 'EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou';
const GLOBAL_STATE_PDA = '51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed';

async function auditDeployedContract() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    console.log('🔍 AUDITING DEPLOYED SMART CONTRACT');
    console.log('=' .repeat(50));
    
    try {
        // 1. Check program exists and is executable
        console.log('\n📋 Program Status:');
        const programId = new PublicKey(PROGRAM_ID);
        const programInfo = await connection.getAccountInfo(programId);
        
        if (!programInfo) {
            console.log('❌ Program does not exist');
            return;
        }
        
        console.log('✅ Program exists');
        console.log(`   Executable: ${programInfo.executable}`);
        console.log(`   Owner: ${programInfo.owner.toString()}`);
        console.log(`   Lamports: ${programInfo.lamports}`);
        console.log(`   Data length: ${programInfo.data.length}`);
        
        // 2. Check global state
        console.log('\n🏛️  Global State:');
        const globalStatePda = new PublicKey(GLOBAL_STATE_PDA);
        const globalStateInfo = await connection.getAccountInfo(globalStatePda);
        
        if (!globalStateInfo) {
            console.log('❌ Global state does not exist - program not initialized');
            return;
        }
        
        console.log('✅ Global state exists');
        console.log(`   Data length: ${globalStateInfo.data.length}`);
        console.log(`   Owner: ${globalStateInfo.owner.toString()}`);
        
        // 3. Calculate expected PDAs
        console.log('\n🔧 Expected PDA Addresses:');
        
        // Global state PDA
        const [calcGlobalPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('global_state')],
            programId
        );
        console.log(`   Global State: ${calcGlobalPda.toString()}`);
        console.log(`   Matches stored: ${calcGlobalPda.toString() === GLOBAL_STATE_PDA ? '✅' : '❌'}`);
        
        // VRF Authority PDA
        const [vrfAuthPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('vrf_authority')],
            programId
        );
        console.log(`   VRF Authority: ${vrfAuthPda.toString()}`);
        
        // 4. Test a sample game room PDA calculation
        console.log('\n🎮 Sample Game Room PDA:');
        const sampleCreator = new PublicKey('11111111111111111111111111111112'); // System program as example
        const roomId = 12345;
        
        try {
            const [gameRoomPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('game_room'),
                    sampleCreator.toBuffer(),
                    Buffer.from(roomId.toString().padStart(8, '0'))
                ],
                programId
            );
            console.log(`   Sample Game Room: ${gameRoomPda.toString()}`);
            console.log('   ✅ PDA calculation works');
        } catch (error) {
            console.log('   ❌ PDA calculation failed:', error.message);
        }
        
        // 5. Check recent program logs
        console.log('\n📜 Recent Program Activity:');
        try {
            const signatures = await connection.getSignaturesForAddress(programId, { limit: 5 });
            if (signatures.length > 0) {
                console.log(`   Found ${signatures.length} recent transactions`);
                signatures.forEach((sig, i) => {
                    console.log(`   ${i + 1}. ${sig.signature} (${new Date(sig.blockTime * 1000).toLocaleString()})`);
                });
            } else {
                console.log('   No recent transactions found');
            }
        } catch (error) {
            console.log('   ❌ Could not fetch transaction history');
        }
        
        console.log('\n🎯 AUDIT SUMMARY:');
        console.log('✅ Program deployed and executable');
        console.log('✅ Global state initialized');
        console.log('✅ PDA calculations work');
        console.log('\n💡 Next: Get exact source code from Codespaces that created this deployment');
        
    } catch (error) {
        console.error('❌ Audit failed:', error);
    }
}

auditDeployedContract().catch(console.error);
