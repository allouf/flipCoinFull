#!/bin/bash

# Simple initialization script for WSL
# Usage: ./initialize-contract.sh HOUSE_WALLET_PUBLIC_KEY

HOUSE_WALLET=$1

if [ -z "$HOUSE_WALLET" ]; then
    echo "Error: Please provide house wallet public key"
    echo "Usage: ./initialize-contract.sh HOUSE_WALLET_PUBLIC_KEY"
    exit 1
fi

echo "Initializing contract with:"
echo "House Wallet: $HOUSE_WALLET"
echo "House Fee: 3% (300 basis points)"

# Create initialization script
cat > init-contract.js << EOF
const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");

async function initialize() {
    // Configure provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    // Load program
    const idl = require("./target/idl/coin_flipper.json");
    const programId = new PublicKey("$(solana address -k target/deploy/coin_flipper-keypair.json)");
    const program = new anchor.Program(idl, programId, provider);
    
    // Set parameters
    const houseWallet = new PublicKey("$HOUSE_WALLET");
    const houseFeeBps = 300; // 3%
    
    // Derive PDA
    const [globalStatePda] = await PublicKey.findProgramAddress(
        [Buffer.from("global_state")],
        program.programId
    );
    
    try {
        // Initialize
        const tx = await program.methods
            .initialize(houseFeeBps)
            .accounts({
                globalState: globalStatePda,
                authority: provider.wallet.publicKey,
                houseWallet: houseWallet,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
            
        console.log("✅ Contract initialized successfully!");
        console.log("Transaction:", tx);
        console.log("Global State PDA:", globalStatePda.toString());
        console.log("House Wallet:", houseWallet.toString());
        console.log("House Fee:", houseFeeBps / 100, "%");
    } catch (error) {
        console.error("Error:", error);
        if (error.toString().includes("already in use")) {
            console.log("Contract already initialized!");
        }
    }
}

initialize().catch(console.error);
EOF

# Run initialization
node init-contract.js