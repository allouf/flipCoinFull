@echo off
echo Setting up Vercel environment variables...

echo REACT_APP_NETWORK=devnet > .env.production.local
echo REACT_APP_SOLANA_RPC_HOST=https://api.devnet.solana.com >> .env.production.local
echo REACT_APP_PROGRAM_ID=GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn >> .env.production.local
echo REACT_APP_WS_ENDPOINT=wss://api.devnet.solana.com >> .env.production.local
echo REACT_APP_HOUSE_WALLET=auto >> .env.production.local
echo REACT_APP_VRF_QUEUE=F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy >> .env.production.local
echo REACT_APP_VRF_AUTHORITY=2KgowxogBrGqRcgXQEmqFvC3PGtCu66qERNJevYW8Ajh >> .env.production.local
echo REACT_APP_MIN_BET_AMOUNT=0.01 >> .env.production.local
echo REACT_APP_HOUSE_FEE_BPS=300 >> .env.production.local
echo REACT_APP_SELECTION_TIMEOUT_SECONDS=30 >> .env.production.local
echo REACT_APP_ENABLE_VRF=true >> .env.production.local
echo REACT_APP_ENABLE_AUTO_MATCH=true >> .env.production.local
echo REACT_APP_ENABLE_HISTORY=true >> .env.production.local
echo REACT_APP_ENABLE_WEBSOCKET=true >> .env.production.local

echo Environment file created!
echo.
echo Now running: vercel env pull
vercel env pull

echo.
echo Redeploying with environment variables...
vercel --prod

echo.
echo Done! Your app should now be fully functional.
echo Visit: https://flip-coin.vercel.app