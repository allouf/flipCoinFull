const { PublicKey, Keypair } = require('@solana/web3.js');

// Your stated values
const STATED_PROGRAM_ID = 'EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou';
const STATED_GLOBAL_PDA = '51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed';
const HOUSE_WALLET_ADDRESS = 'CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp';
const HOUSE_PRIVATE_KEY = [128,38,5,218,213,110,205,61,29,115,195,61,181,249,205,59,48,71,2,146,234,229,212,40,92,248,251,170,145,189,7,148,171,249,227,94,179,61,88,95,59,251,56,106,3,125,107,235,24,98,98,176,70,44,236,129,184,161,106,200,209,82,67,77];

console.log('🔍 DEPLOYMENT VERIFICATION');
console.log('=' .repeat(50));

try {
    // 1. Verify Program ID format
    const programId = new PublicKey(STATED_PROGRAM_ID);
    console.log('✅ Program ID format: Valid');
    console.log(`   ${STATED_PROGRAM_ID}`);
    
    // 2. Calculate Global State PDA
    const [calculatedGlobalPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        programId
    );
    
    console.log('\n🏛️  Global State PDA:');
    console.log('   Stated:', STATED_GLOBAL_PDA);
    console.log('   Calculated:', calculatedGlobalPda.toString());
    console.log('   Match:', calculatedGlobalPda.toString() === STATED_GLOBAL_PDA ? '✅' : '❌');
    
    // 3. Verify House Wallet
    console.log('\n🏠 House Wallet Verification:');
    console.log('   Address:', HOUSE_WALLET_ADDRESS);
    
    // Check if private key corresponds to public key
    const houseKeypair = Keypair.fromSecretKey(new Uint8Array(HOUSE_PRIVATE_KEY));
    const derivedAddress = houseKeypair.publicKey.toString();
    
    console.log('   Derived from private key:', derivedAddress);
    console.log('   Match:', derivedAddress === HOUSE_WALLET_ADDRESS ? '✅' : '❌');
    
    // 4. VRF Authority verification
    console.log('\n🎲 VRF Authority PDA:');
    const VRF_AUTHORITY_FROM_VERCEL = '2KgowxogBrGqRcgXQEmqFvC3PGtCu66qERNJevYW8Ajh';
    
    // Calculate expected VRF authority PDA
    const [calculatedVrfAuth, vrfBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('vrf_authority')],
        programId
    );
    
    console.log('   From Vercel env:', VRF_AUTHORITY_FROM_VERCEL);
    console.log('   Calculated:', calculatedVrfAuth.toString());
    console.log('   Match:', calculatedVrfAuth.toString() === VRF_AUTHORITY_FROM_VERCEL ? '✅' : '❌');
    
    // 5. Summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    const globalPdaMatch = calculatedGlobalPda.toString() === STATED_GLOBAL_PDA;
    const houseWalletMatch = derivedAddress === HOUSE_WALLET_ADDRESS;
    const vrfAuthMatch = calculatedVrfAuth.toString() === VRF_AUTHORITY_FROM_VERCEL;
    
    console.log(`   Global PDA: ${globalPdaMatch ? '✅' : '❌'}`);
    console.log(`   House Wallet: ${houseWalletMatch ? '✅' : '❌'}`);
    console.log(`   VRF Authority: ${vrfAuthMatch ? '✅' : '❌'}`);
    
    const allValid = globalPdaMatch && houseWalletMatch && vrfAuthMatch;
    console.log(`\n🎯 Overall Status: ${allValid ? '✅ ALL VERIFIED' : '❌ ISSUES DETECTED'}`);
    
    if (allValid) {
        console.log('\n✨ Your deployment values are CORRECT and ready to use!');
    } else {
        console.log('\n⚠️  Some values may need verification or update.');
    }
    
} catch (error) {
    console.error('❌ Error during verification:', error.message);
}
