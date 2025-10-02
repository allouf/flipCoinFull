# Production Environment Variables for Vercel

Copy these to Vercel: https://vercel.com/andrius-projects-a917622c/solana-coin-flipper/settings/environment-variables

## Required Environment Variables

### Blockchain Configuration
```
REACT_APP_NETWORK=devnet
REACT_APP_DEVNET_RPC_URL=https://api.devnet.solana.com
REACT_APP_TESTNET_RPC_URL=https://api.testnet.solana.com
REACT_APP_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
REACT_APP_PROGRAM_ID=7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
```

### Game Configuration
```
REACT_APP_HOUSE_FEE_BPS=700
REACT_APP_MIN_BET_SOL=0.01
```

### Backend URLs (UPDATE AFTER RENDER DEPLOYMENT)
```
REACT_APP_API_BASE_URL=https://YOUR-RENDER-APP.onrender.com
REACT_APP_WEBSOCKET_URL=wss://YOUR-RENDER-APP.onrender.com
```

### VRF Configuration (Primary)
```
REACT_APP_VRF_ACCOUNT_1_PUBKEY=2s1Jnnr7LxQ4zmk5wQiFjyoHqgYPUK8jRd2wvNLRTxxN
REACT_APP_VRF_ACCOUNT_1_NAME=test-vrf-primary
REACT_APP_VRF_ACCOUNT_1_PRIORITY=1
```

### VRF Configuration (Secondary)
```
REACT_APP_VRF_ACCOUNT_2_PUBKEY=AdmbEwjXbr4SSJp5WS6UVJRXU1o2KjQTextRZqH4s1vz
REACT_APP_VRF_ACCOUNT_2_NAME=test-vrf-secondary
REACT_APP_VRF_ACCOUNT_2_PRIORITY=2
```

### VRF Configuration (Tertiary)
```
REACT_APP_VRF_ACCOUNT_3_PUBKEY=4UwHQRAcwusZ7Aw4FkKyRLX8y1Avv9AhTdUxjx2KoAyo
REACT_APP_VRF_ACCOUNT_3_NAME=test-vrf-tertiary
REACT_APP_VRF_ACCOUNT_3_PRIORITY=3
```

### VRF Health Monitoring
```
REACT_APP_VRF_MAX_QUEUE_DEPTH=15
REACT_APP_VRF_MAX_RESPONSE_TIME=9000
REACT_APP_VRF_MIN_SUCCESS_RATE=0.92
REACT_APP_VRF_HEALTH_CHECK_INTERVAL=30000
```

### Development Tools (Set to false for production)
```
REACT_APP_ENABLE_DEVTOOLS=false
REACT_APP_LOG_LEVEL=info
REACT_APP_ENABLE_VRF_DEBUG=false
GENERATE_SOURCEMAP=false
```

---

## Steps to Add to Vercel

1. Go to: https://vercel.com/andrius-projects-a917622c/solana-coin-flipper/settings/environment-variables
2. For each variable above:
   - Click "Add New"
   - Enter the key name (e.g., `REACT_APP_NETWORK`)
   - Enter the value (e.g., `devnet`)
   - Select all environments (Production, Preview, Development)
   - Click "Save"
3. After adding all variables, redeploy the project

## Important Notes

⚠️ **Before deploying, you must:**
1. Deploy backend to Render first
2. Get your Render URL (e.g., `https://flipcoin-backend.onrender.com`)
3. Update these two variables with your Render URL:
   - `REACT_APP_API_BASE_URL=https://YOUR-RENDER-APP.onrender.com`
   - `REACT_APP_WEBSOCKET_URL=wss://YOUR-RENDER-APP.onrender.com`

⚠️ **After deploying frontend to Vercel:**
1. Go back to Render dashboard
2. Update the `FRONTEND_URL` environment variable with your Vercel URL
3. Restart the Render service
