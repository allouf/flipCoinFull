# 🚂 Railway Backend Deployment Guide

## Quick Deploy via Railway Dashboard (Recommended)

1. **Go to Railway**: https://railway.app/
2. **Sign in** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose**: `allouf/flipCoinFull`
6. **Set Root Directory**: `backend`
7. **Railway will auto-detect**:
   - Build: `npm install`
   - Start: `node server.js`
   - Port: Automatically assigned

## Environment Variables (Optional)

Railway automatically provides:
- `PORT` - Auto-assigned by Railway
- No other env variables needed! (Uses SQLite fallback)

## After Deployment

1. Railway will give you a public URL like: `https://your-app.up.railway.app`
2. Copy this URL
3. Update your frontend `.env` file:
   ```
   REACT_APP_BACKEND_URL=https://your-app.up.railway.app
   REACT_APP_WS_URL=wss://your-app.up.railway.app
   ```

## Cost

- **Hobby Plan**: $5/month starter credit (free tier)
- **Pay-as-you-go**: ~$0.000463/GB-hour
- **Estimated cost**: $2-3/month for this app

## Monitoring

- View logs: Railway Dashboard → Your Service → Logs
- Check metrics: Dashboard → Metrics tab

## Features Supported

✅ WebSocket (Socket.IO)
✅ SQLite database (persisted)
✅ CORS enabled
✅ Auto-restart on failure
✅ Real-time updates

---

## Alternative: Railway CLI

If you want to use the CLI:

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link project
cd backend
railway link

# Deploy
railway up
```

---

**Note**: The backend is OPTIONAL. The game works without it, but users won't get real-time WebSocket updates. They'd need to manually refresh.
