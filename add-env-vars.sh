#!/bin/bash
# Add all environment variables to Vercel

echo "Adding environment variables to Vercel..."

# Add each environment variable
echo "devnet" | vercel env add REACT_APP_NETWORK production
echo "https://api.devnet.solana.com" | vercel env add REACT_APP_SOLANA_RPC_HOST production
echo "GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn" | vercel env add REACT_APP_PROGRAM_ID production
echo "wss://api.devnet.solana.com" | vercel env add REACT_APP_WS_ENDPOINT production
echo "auto" | vercel env add REACT_APP_HOUSE_WALLET production
echo "F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy" | vercel env add REACT_APP_VRF_QUEUE production
echo "2KgowxogBrGqRcgXQEmqFvC3PGtCu66qERNJevYW8Ajh" | vercel env add REACT_APP_VRF_AUTHORITY production
echo "0.01" | vercel env add REACT_APP_MIN_BET_AMOUNT production
echo "300" | vercel env add REACT_APP_HOUSE_FEE_BPS production
echo "30" | vercel env add REACT_APP_SELECTION_TIMEOUT_SECONDS production
echo "true" | vercel env add REACT_APP_ENABLE_VRF production
echo "true" | vercel env add REACT_APP_ENABLE_AUTO_MATCH production
echo "true" | vercel env add REACT_APP_ENABLE_HISTORY production
echo "true" | vercel env add REACT_APP_ENABLE_WEBSOCKET production

echo "Environment variables added! Redeploying..."
vercel --prod

echo "Done!"