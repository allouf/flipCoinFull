const fs = require('fs');
const path = require('path');

// Read both IDL versions
const deployedIdlPath = path.join(__dirname, 'target', 'idl', 'coin_flipper.json');
const frontendIdlPath = path.join(__dirname, 'src', 'idl', 'coin_flipper.json.bak');

// Create a backup of the frontend IDL
try {
  fs.copyFileSync(path.join(__dirname, 'src', 'idl', 'coin_flipper.json'), frontendIdlPath);
  console.log('✅ Created backup of frontend IDL at src/idl/coin_flipper.json.bak');
} catch (error) {
  console.error('Error creating backup:', error);
}

const deployedIdl = JSON.parse(fs.readFileSync(deployedIdlPath, 'utf8'));
const frontendIdl = JSON.parse(fs.readFileSync(frontendIdlPath, 'utf8'));

console.log('🔍 ANALYZING IDL DIFFERENCES');
console.log('=' .repeat(60));

// 1. Compare instructions
console.log('\n📋 INSTRUCTION CHANGES:');
const deployedInstructions = deployedIdl.instructions.map(i => i.name);
const frontendInstructions = frontendIdl.instructions.map(i => i.name);

const removedInstructions = frontendInstructions.filter(i => !deployedInstructions.includes(i));
const addedInstructions = deployedInstructions.filter(i => !frontendInstructions.includes(i));

console.log('   ❌ Removed instructions:', removedInstructions.join(', '));
console.log('   ✅ Added instructions:', addedInstructions.join(', '));

// 2. Compare account structures
console.log('\n📊 ACCOUNT STRUCTURE CHANGES:');
// Map account names to their fields
const deployedAccounts = {};
const frontendAccounts = {};

deployedIdl.accounts.forEach(account => {
  deployedAccounts[account.name] = account.type.fields.map(f => f.name);
});

frontendIdl.accounts.forEach(account => {
  frontendAccounts[account.name] = account.type.fields.map(f => f.name);
});

// Compare account fields
Object.keys(frontendAccounts).forEach(accountName => {
  if (!deployedAccounts[accountName]) {
    console.log(`   ❌ Account removed: ${accountName}`);
    return;
  }
  
  const deployedFields = deployedAccounts[accountName];
  const frontendFields = frontendAccounts[accountName];
  
  const removedFields = frontendFields.filter(f => !deployedFields.includes(f));
  const addedFields = deployedFields.filter(f => !frontendFields.includes(f));
  
  if (removedFields.length > 0 || addedFields.length > 0) {
    console.log(`   🔄 Changes in ${accountName}:`);
    if (removedFields.length > 0) console.log(`      ❌ Removed fields: ${removedFields.join(', ')}`);
    if (addedFields.length > 0) console.log(`      ✅ Added fields: ${addedFields.join(', ')}`);
  }
});

// 3. Compare enums/types
console.log('\n🧩 ENUM/TYPE CHANGES:');
const deployedTypes = deployedIdl.types.map(t => t.name);
const frontendTypes = frontendIdl.types.map(t => t.name);

const removedTypes = frontendTypes.filter(t => !deployedTypes.includes(t));
const addedTypes = deployedTypes.filter(t => !frontendTypes.includes(t));

console.log('   ❌ Removed types:', removedTypes.join(', '));
console.log('   ✅ Added types:', addedTypes.join(', '));

// 4. Generate recommendation
console.log('\n🔧 MAJOR ISSUES TO FIX:');

// Problem 1: Check for makeSelection vs joinRoom with CoinSide
const makeSelectionInstruction = frontendIdl.instructions.find(i => i.name === 'makeSelection');
const joinRoomInstruction = deployedIdl.instructions.find(i => i.name === 'joinRoom');

if (makeSelectionInstruction && joinRoomInstruction) {
  // Check if the parameters are different
  const makeSelectionParams = makeSelectionInstruction.args;
  const joinRoomParams = joinRoomInstruction.args;
  
  if (makeSelectionParams.some(p => p.name === 'selection') && 
      joinRoomParams.some(p => p.name === 'choice')) {
    console.log('   1. Replace "selection" parameter with "choice" in frontend code');
    console.log('      ❌ Old: makeSelection(selection: CoinSide)');
    console.log('      ✅ New: joinRoom(choice: CoinSide)');
  }
}

// Problem 2: Check for player1Selection vs creatorChoice
const gameRoomOld = frontendIdl.accounts.find(a => a.name === 'GameRoom');
const gameRoomNew = deployedIdl.accounts.find(a => a.name === 'GameRoom');

if (gameRoomOld && gameRoomNew) {
  const oldFields = gameRoomOld.type.fields.map(f => f.name);
  const newFields = gameRoomNew.type.fields.map(f => f.name);
  
  if (oldFields.includes('player1Selection') && newFields.includes('creatorChoice')) {
    console.log('   2. Replace field references in frontend code:');
    console.log('      ❌ Old: player1Selection → ✅ New: creatorChoice');
    console.log('      ❌ Old: player2Selection → ✅ New: joinerChoice');
  }
}

console.log('\n🎯 RECOMMENDATION:');
console.log('1. Update the IDL file in the frontend (already done)');
console.log('2. Update the TypeScript interfaces in useAnchorProgram.ts to match the deployed contract');
console.log('3. Update all method calls from makeSelection() to joinRoom() with choice parameter');
console.log('4. Update all field references from player1Selection/player2Selection to creatorChoice/joinerChoice');
console.log('5. Update the RoomStatus enum values to match the deployed contract');

console.log('\n✅ ANALYSIS COMPLETE');
