#!/bin/bash

# Create minimal coin flipper program for deployment
echo "Creating minimal coin flipper program..."

# Create basic program structure
mkdir -p programs/minimal-flipper/src
cd programs/minimal-flipper

# Create minimal Cargo.toml
cat > Cargo.toml << 'EOF'
[package]
name = "minimal-flipper"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]
name = "minimal_flipper"

[dependencies]
solana-program = "~1.16.0"
EOF

# Create minimal program
cat > src/lib.rs << 'EOF'
use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};

// Declare the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Minimal Coin Flipper Program!");
    msg!("Program ID: {}", program_id);
    Ok(())
}
EOF

echo "Building minimal program..."
cargo build-bpf

echo "Deployment ready!"
echo "Binary location: target/deploy/minimal_flipper.so"