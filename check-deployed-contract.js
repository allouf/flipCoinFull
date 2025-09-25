const { Connection, PublicKey } = require('@solana/web3.js');

// Your deployed Program ID
const PROGRAM_ID = new PublicKey('7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6');

// Test on devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkDeployedContract() {
  console.log('🔍 Checking deployed smart contract...');
  console.log('Program ID:', PROGRAM_ID.toString());

  try {
    // 1. Check if program exists
    console.log('\n1️⃣ Checking if program exists...');
    const programAccount = await connection.getAccountInfo(PROGRAM_ID);

    if (!programAccount) {
      console.error('❌ Program not found at this address!');
      return false;
    }

    console.log('✅ Program found!');
    console.log('  Data Length:', programAccount.data.length);
    console.log('  Owner:', programAccount.owner.toString());
    console.log('  Executable:', programAccount.executable);
    console.log('  Rent Epoch:', programAccount.rentEpoch);

    // 2. Check if it's executable (deployed program)
    if (!programAccount.executable) {
      console.error('❌ Program is not executable!');
      return false;
    }

    console.log('✅ Program is executable (properly deployed)!');

    // 3. Try to find existing games (optional)
    console.log('\n2️⃣ Searching for existing games...');
    try {
      const programAccounts = await connection.getProgramAccounts(PROGRAM_ID);
      console.log('✅ Found', programAccounts.length, 'program accounts');

      if (programAccounts.length > 0) {
        console.log('📋 Program accounts:');
        programAccounts.forEach((account, i) => {
          console.log(`  ${i + 1}. ${account.pubkey.toString()} (${account.account.data.length} bytes)`);
        });
      }
    } catch (error) {
      console.log('⚠️  Could not fetch program accounts:', error.message);
    }

    // 4. Check RPC endpoint health
    console.log('\n3️⃣ Checking RPC endpoint health...');
    const version = await connection.getVersion();
    console.log('✅ RPC Version:', version['solana-core']);

    const slot = await connection.getSlot();
    console.log('✅ Current Slot:', slot);

    console.log('\n🎉 SMART CONTRACT DEPLOYMENT VERIFICATION SUCCESSFUL! 🎊');
    console.log('\n📝 Summary:');
    console.log('  ✅ Program deployed and executable');
    console.log('  ✅ Program ID accessible on devnet');
    console.log('  ✅ RPC endpoint working');
    console.log('\n🚀 Your frontend should work with this contract!');

    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

checkDeployedContract();