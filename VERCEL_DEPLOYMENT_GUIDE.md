# 🚀 Vercel Deployment Guide - Real-Time Coin Flipper

## 🎯 Deploy Your Complete Real-Time Gaming App

### Step 1: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your **`flipCoinFull`** repository from GitHub
4. Vercel will auto-detect it's a React app - click **"Deploy"**

### Step 2: 🚨 CRITICAL - Set Environment Variables

**IMPORTANT**: Your app won't work without these! In Vercel dashboard:
**Settings → Environment Variables** and add ALL of these:

#### ⚙️ Core Application Settings
```
REACT_APP_NETWORK=devnet
REACT_APP_HOUSE_FEE_PERCENTAGE=3
```

#### 🔗 Live Smart Contract (PRODUCTION)
```
REACT_APP_PROGRAM_ID=4pV1nUjCdfTdxFVN2RckwJ763XZJAnGukVrHxs25f7mM
REACT_APP_GLOBAL_STATE_PDA=51vcHNsEijchCTPdt5GGMtCBkLinArYVrN2h8kSv28ed
REACT_APP_HOUSE_FEE_BPS=300
REACT_APP_MIN_BET_SOL=0.01
```

#### 🌐 Solana RPC Endpoints
```
REACT_APP_DEVNET_RPC_URL=https://api.devnet.solana.com
REACT_APP_TESTNET_RPC_URL=https://api.testnet.solana.com  
REACT_APP_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
```

#### 🎲 VRF Configuration (Test Values)
```
REACT_APP_VRF_ACCOUNT_1_PUBKEY=2s1Jnnr7LxQ4zmk5wQiFjyoHqgYPUK8jRd2wvNLRTxxN
REACT_APP_VRF_ACCOUNT_1_NAME=test-vrf-primary
REACT_APP_VRF_ACCOUNT_1_PRIORITY=1

REACT_APP_VRF_ACCOUNT_2_PUBKEY=AdmbEwjXbr4SSJp5WS6UVJRXU1o2KjQTextRZqH4s1vz
REACT_APP_VRF_ACCOUNT_2_NAME=test-vrf-secondary
REACT_APP_VRF_ACCOUNT_2_PRIORITY=2

REACT_APP_VRF_ACCOUNT_3_PUBKEY=4UwHQRAcwusZ7Aw4FkKyRLX8y1Avv9AhTdUxjx2KoAyo
REACT_APP_VRF_ACCOUNT_3_NAME=test-vrf-tertiary
REACT_APP_VRF_ACCOUNT_3_PRIORITY=3
```

#### 📊 Performance & Monitoring
```
REACT_APP_VRF_MAX_QUEUE_DEPTH=15
REACT_APP_VRF_MAX_RESPONSE_TIME=9000
REACT_APP_VRF_MIN_SUCCESS_RATE=0.92
REACT_APP_VRF_HEALTH_CHECK_INTERVAL=30000
```

#### 🚀 Production Optimizations
```
REACT_APP_ENABLE_DEVTOOLS=false
REACT_APP_LOG_LEVEL=info
REACT_APP_ENABLE_VRF_DEBUG=false
GENERATE_SOURCEMAP=false
```

### Step 3: Redeploy After Setting Variables
After adding all environment variables, click **"Redeploy"** to apply them.

---

## 🎉 What You Just Deployed

### 🔥 Real-Time Gaming Features
- ⚡ **Instant notifications** - toast alerts for all game events
- 🔄 **Auto-refresh every 1-3 seconds** - no manual refresh needed
- 🎯 **Auto-resolution system** - games complete instantly
- 💰 **Smart refund handling** - clear tie explanations

### 🎮 Complete Gaming Experience
- 📱 **Toast notifications** for:
  - Player joins your game
  - Opponent makes selection  
  - Both players selected (auto-resolving)
  - Game completed with results
- 🤝 **Tie scenarios** with automatic refund breakdowns
- 💡 **Clear UI explanations** for all game states

### 🔐 Production Smart Contract
- **Program ID**: `4pV1nUjCdfTdxFVN2RckwJ763XZJAnGukVrHxs25f7mM`
- **Network**: Solana Devnet
- **Auto-resolution**: ✅ Enabled
- **Resolution fee**: 0.001 SOL per player
- **House fee**: 3% on winnings
- **Tie handling**: ✅ Automatic refunds

### ⚡ Performance Optimizations
- **Cache TTL**: 2-3 seconds (extremely responsive)
- **Polling intervals**: 1-1.5 seconds during active gameplay
- **Real-time state sync**: Both users see changes instantly
- **Optimistic updates**: Immediate UI feedback

---

## 🧪 Test Your Live App

After deployment, test these scenarios:

### ✅ Basic Flow Test
1. **User1**: Create a room (0.02 SOL bet)
2. **User2**: Join the room (in different browser/tab)
3. **User1**: Should get "Player Joined!" notification
4. **Both**: Make selections (heads/tails)
5. **Both**: Should see "Game Complete!" notification
6. **Winner**: Should see "You won!" 
7. **Loser**: Should see "You lost!"

### ✅ Tie Scenario Test
1. Both players choose **same side** (heads/heads or tails/tails)
2. Should show "🤝 Tie! Both players chose the same side - bets refunded"
3. Should display refund breakdown:
   - Your bet: 0.02 SOL
   - Your resolution fee: 0.001 SOL  
   - Total refunded: 0.021 SOL

### ✅ Real-Time Updates Test
- No manual refresh should be needed
- Notifications should appear for all major events
- Updates should happen within 1-3 seconds
- Both users should see changes simultaneously

---

## 🎯 Your Live Gaming App is Ready! 

🔗 **Vercel URL**: `https://your-app-name.vercel.app`

**Features Live**:
- ⚡ Real-time multiplayer coin flipping
- 🔔 Instant push notifications  
- 💰 Auto-resolution with fair payouts
- 🤝 Smart tie handling with refunds
- 🎮 Complete gaming experience

**No more manual refreshing - everything happens automatically!** 🚀
