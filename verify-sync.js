#!/usr/bin/env node

/**
 * Verify Local-Codespaces Sync
 * Checks that local environment is properly synced with Codespaces deployment
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const PROGRAM_ID = 'EUrvqUbo2mB63prCxRGDUNa5kRwskRwjM9MkWEECgUou';
const HOUSE_WALLET = 'CaKigdJrq48nVebxGm4oWG2nck5kmdYA4JNPSkFt1tNp';
const GLOBAL_STATE_PDA = '51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed';

async function verifySync() {
    console.log('🔍 Verifying Local-Codespaces Sync...\n');
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    let allChecks = true;
    
    try {
        // 1. Check Program Deployment
        console.log('1️⃣ Checking Program Deployment...');
        const programPubkey = new PublicKey(PROGRAM_ID);
        const programInfo = await connection.getAccountInfo(programPubkey);
        
        if (programInfo && programInfo.executable) {
            console.log('   ✅ Program is deployed and executable');
            console.log(`   Program ID: ${PROGRAM_ID}`);
        } else {
            console.log('   ❌ Program not found or not executable');
            allChecks = false;
        }
        
        // 2. Check Global State PDA
        console.log('\n2️⃣ Checking Global State PDA...');
        const globalStatePubkey = new PublicKey(GLOBAL_STATE_PDA);
        const globalStateInfo = await connection.getAccountInfo(globalStatePubkey);
        
        if (globalStateInfo) {
            console.log('   ✅ Global State PDA exists');
            console.log(`   PDA: ${GLOBAL_STATE_PDA}`);
            console.log(`   Data Length: ${globalStateInfo.data.length} bytes`);
        } else {
            console.log('   ❌ Global State PDA not found');
            allChecks = false;
        }
        
        // 3. Check House Wallet
        console.log('\n3️⃣ Checking House Wallet...');
        const houseWalletPubkey = new PublicKey(HOUSE_WALLET);
        const houseWalletInfo = await connection.getAccountInfo(houseWalletPubkey);
        
        if (houseWalletInfo) {
            const balance = houseWalletInfo.lamports / 1e9;
            console.log('   ✅ House Wallet exists');
            console.log(`   Address: ${HOUSE_WALLET}`);
            console.log(`   Balance: ${balance.toFixed(4)} SOL`);
        } else {
            console.log('   ⚠️  House Wallet not found (may need funding)');
        }
        
        // 4. Check Local Environment Variables
        console.log('\n4️⃣ Checking Local Environment...');
        const envProgramId = process.env.REACT_APP_PROGRAM_ID;
        
        if (envProgramId === PROGRAM_ID) {
            console.log('   ✅ .env PROGRAM_ID matches deployment');
        } else {
            console.log(`   ❌ .env PROGRAM_ID mismatch`);
            console.log(`      Expected: ${PROGRAM_ID}`);
            console.log(`      Found: ${envProgramId}`);
            allChecks = false;
        }
        
        // 5. Check IDL File
        console.log('\n5️⃣ Checking IDL File...');
        const idlPath = path.join(__dirname, 'src', 'idl', 'coin_flipper.json');
        
        if (fs.existsSync(idlPath)) {
            const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
            if (idl.metadata && idl.metadata.address === PROGRAM_ID) {
                console.log('   ✅ IDL file matches deployment');
            } else {
                console.log('   ⚠️  IDL file exists but address may not match');
                console.log('      Update IDL if you made contract changes in Codespaces');
            }
        } else {
            console.log('   ❌ IDL file not found at:', idlPath);
            allChecks = false;
        }
        
        // 6. Network Check
        console.log('\n6️⃣ Checking Network Configuration...');
        const slot = await connection.getSlot();
        const version = await connection.getVersion();
        console.log('   ✅ Connected to Solana Devnet');
        console.log(`   Slot: ${slot}`);
        console.log(`   Version: ${version['solana-core']}`);
        
        // Summary
        console.log('\n' + '='.repeat(60));
        if (allChecks) {
            console.log('✅ SUCCESS: Local environment is synced with Codespaces!');
            console.log('\nYou can now run:');
            console.log('  npm start           - Start the frontend');
            console.log('  npm test            - Run tests');
        } else {
            console.log('⚠️  WARNING: Some sync issues detected.');
            console.log('\nRecommended actions:');
            console.log('1. Pull latest changes: git pull origin main');
            console.log('2. Update .env file with correct PROGRAM_ID');
            console.log('3. Copy IDL from Codespaces if contract changed');
        }
        
        console.log('\n📋 Deployment Summary:');
        console.log(`  Program ID: ${PROGRAM_ID}`);
        console.log(`  Global State: ${GLOBAL_STATE_PDA}`);
        console.log(`  House Wallet: ${HOUSE_WALLET}`);
        console.log(`  Network: Solana Devnet`);
        console.log(`  Explorer: https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`);
        
    } catch (error) {
        console.error('\n❌ Error during verification:', error.message);
        process.exit(1);
    }
}

// Run verification
verifySync().catch(console.error);