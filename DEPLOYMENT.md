# 🚀 Deployment Guide - Fair Coin Flipper

Complete guide for deploying the Fair Coin Flipper DApp to production.

## Architecture

```
Frontend (Vercel) ←→ Backend (Railway) ←→ Solana Blockchain
     React              Socket.IO           Smart Contract
```

---

## 📦 Part 1: Deploy Backend to Railway

### Option A: Railway Dashboard (Easiest)

1. Go to **https://railway.app/**
2. **Sign in** with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select repository: **`allouf/flipCoinFull`**
5. **Important**: Set **Root Directory** to `backend`
6. Railway will auto-detect settings
7. Click **"Deploy"**
8. Wait for deployment (2-3 minutes)
9. **Copy your Railway URL**: `https://your-app.up.railway.app`

### Option B: Railway CLI

```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway up
```

### Backend Environment Variables

✅ None required! The backend uses SQLite fallback automatically.

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to **https://vercel.com**
2. Click **"Add New..."** → **"Project"**
3. Import: **`allouf/flipCoinFull`**
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. **Add Environment Variables**:
   ```
   REACT_APP_NETWORK=devnet
   REACT_APP_PROGRAM_ID=7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
   REACT_APP_BACKEND_URL=https://your-railway-app.up.railway.app
   REACT_APP_WS_URL=wss://your-railway-app.up.railway.app
   ```

   *Replace with your actual Railway URL from Part 1*

6. Click **"Deploy"**
7. Wait 3-5 minutes
8. Your app will be live at: `https://your-app.vercel.app`

### Option B: Vercel CLI

```bash
# Install CLI
npm install -g vercel

# Deploy
cd F:\flipCoin
vercel --prod
```

When prompted, add the environment variables above.

---

## 🔧 Part 3: Update Frontend to Use Live Backend

After deploying both:

1. Update `.env` or `.env.production`:
   ```env
   REACT_APP_NETWORK=devnet
   REACT_APP_PROGRAM_ID=7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
   REACT_APP_BACKEND_URL=https://your-railway-app.up.railway.app
   REACT_APP_WS_URL=wss://your-railway-app.up.railway.app
   ```

2. Redeploy frontend on Vercel (it will auto-redeploy when you commit)

---

## ✅ Part 4: Testing Your Deployment

### Test Checklist

- [ ] Frontend loads without errors
- [ ] Wallet connects (Phantom, Solflare)
- [ ] Can create a game
- [ ] Second player can join
- [ ] Both players can commit choices
- [ ] Both players can reveal
- [ ] Winner receives payout
- [ ] Game result displays correctly
- [ ] Real-time updates work (WebSocket)

### Common Issues

**Issue**: "WebSocket connection failed"
- **Fix**: Make sure `REACT_APP_WS_URL` uses `wss://` not `ws://`

**Issue**: "Cannot connect to backend"
- **Fix**: Check Railway deployment logs for errors
- **Fix**: Verify CORS is enabled (already configured)

**Issue**: "Program error"
- **Fix**: Verify `REACT_APP_PROGRAM_ID` matches your deployed contract

---

## 💰 Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| **Vercel** | Hobby | **Free** (Fair use) |
| **Railway** | Hobby | **$5/month** credit (enough) |
| **Solana** | Devnet | **Free** (testnet) |
| **Solana** | Mainnet | ~$5-10/month (rent) |
| **Total** | - | **~$0-5/month** |

---

## 🔐 Security Notes

✅ **Client-side commitments**: Secrets stored locally (IndexedDB + localStorage)
✅ **Backend cannot cheat**: Never sees player choices before reveal
✅ **Smart contract verification**: On-chain commitment-reveal scheme
✅ **No private keys stored**: Users keep custody via wallet

---

## 📊 Monitoring

### Vercel
- Dashboard: https://vercel.com/dashboard
- Logs: Project → Deployments → View Function Logs
- Analytics: Project → Analytics

### Railway
- Dashboard: https://railway.app/dashboard
- Logs: Project → Service → Logs
- Metrics: Project → Service → Metrics

---

## 🔄 Continuous Deployment

Both Vercel and Railway support auto-deployment from GitHub:

1. Push to `main` branch
2. Both services automatically detect and deploy
3. Check deployment status in dashboards

---

## 🎯 Production Checklist

Before going to mainnet:

- [ ] Test thoroughly on devnet
- [ ] Deploy smart contract to mainnet
- [ ] Update `REACT_APP_NETWORK=mainnet-beta`
- [ ] Update `REACT_APP_PROGRAM_ID` to mainnet contract
- [ ] Set up monitoring and alerts
- [ ] Prepare customer support channels
- [ ] Document game rules and house fee clearly
- [ ] Consider adding analytics (Google Analytics, Mixpanel)

---

## 📞 Support

- **Frontend Issues**: Check browser console
- **Backend Issues**: Check Railway logs
- **Blockchain Issues**: Check Solana Explorer
  - Devnet: https://explorer.solana.com/?cluster=devnet
  - Mainnet: https://explorer.solana.com

---

## 🚀 Quick Start Commands

```bash
# Frontend local dev
npm start

# Backend local dev
cd backend
node server.js

# Deploy backend
cd backend
railway up

# Deploy frontend
vercel --prod
```

---

**Last Updated**: 2025-10-01
**Status**: Ready for deployment ✅
