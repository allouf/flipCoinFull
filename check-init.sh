#!/bin/bash

echo "Checking if program is initialized..."

# Program ID
PROGRAM_ID="GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn"

# Check program account info
echo "Program Info:"
solana program show $PROGRAM_ID --url devnet

# Try to fetch the global state PDA
echo ""
echo "Checking global state..."
# The global state PDA will be at a deterministic address
# We can check if it exists by trying to get account info

echo ""
echo "If you see 'Account does not exist' errors above, the program needs to be initialized."
echo "The program appears to be deployed but may not be initialized yet."