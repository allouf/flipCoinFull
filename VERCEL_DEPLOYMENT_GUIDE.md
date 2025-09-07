# Vercel Deployment Guide for Solana Coin Flipper

## Prerequisites
✅ Production build created successfully
✅ Vercel configuration file (`vercel.json`) ready
✅ Environment variables configured (`.env.production`)

## Deployment Options

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Deploy to Vercel**:
```bash
vercel
```

3. **Follow the prompts**:
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project: `N` (for first deployment)
   - Project name: `solana-coin-flipper` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings: `N`

4. **Production deployment**:
```bash
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub**:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure project settings (auto-detected from vercel.json)
   - Click "Deploy"

### Option 3: Direct Upload via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)**
2. Click "New Project"
3. Click "Upload Folder"
4. Select your `build` folder
5. Configure environment variables in dashboard
6. Deploy

## Environment Variables Setup in Vercel

After deployment, add these environment variables in Vercel Dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following:

```
REACT_APP_NETWORK=devnet
REACT_APP_SOLANA_RPC_HOST=https://api.devnet.solana.com
REACT_APP_PROGRAM_ID=GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn
REACT_APP_HOUSE_WALLET=auto
REACT_APP_WS_ENDPOINT=wss://api.devnet.solana.com
REACT_APP_VRF_QUEUE=F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy
REACT_APP_VRF_AUTHORITY=2KgowxogBrGqRcgXQEmqFvC3PGtCu66qERNJevYW8Ajh
REACT_APP_MIN_BET_AMOUNT=0.01
REACT_APP_HOUSE_FEE_BPS=300
REACT_APP_SELECTION_TIMEOUT_SECONDS=30
REACT_APP_ENABLE_VRF=true
REACT_APP_ENABLE_AUTO_MATCH=true
REACT_APP_ENABLE_HISTORY=true
REACT_APP_ENABLE_WEBSOCKET=true
```

## Quick Deploy Script

Create a one-command deployment:

```bash
# Add to package.json scripts
"deploy:vercel": "npm run build && vercel --prod"
```

## Testing Your Deployment

Once deployed, you'll receive a URL like:
- Preview: `https://solana-coin-flipper-xxx.vercel.app`
- Production: `https://solana-coin-flipper.vercel.app`

### Test Checklist:
- [ ] Wallet connection works (Phantom, Solflare)
- [ ] Network shows as Devnet
- [ ] Can create game rooms
- [ ] Can join existing rooms
- [ ] Coin flip animations work
- [ ] Transaction history displays
- [ ] WebSocket connections establish
- [ ] Mobile responsive design works

## Custom Domain Setup (Optional)

1. In Vercel Dashboard, go to "Domains"
2. Add your custom domain
3. Configure DNS settings as instructed
4. SSL certificate auto-provisioned

## Monitoring & Analytics

- **Vercel Analytics**: Auto-enabled for performance metrics
- **Function Logs**: View in Vercel dashboard
- **Error Tracking**: Check browser console for client-side errors

## Troubleshooting

### Build Failures
- Check `npm run build` works locally
- Verify all dependencies in package.json
- Check Node version compatibility (14.x or higher)

### Runtime Issues
- Verify environment variables are set
- Check browser console for errors
- Ensure wallet extensions are installed
- Verify Solana program is deployed on Devnet

### WebSocket Issues
- Vercel supports WebSocket connections
- May need to configure CORS if using custom domain

## Performance Optimization

Your app is already optimized with:
- Code splitting via React
- Lazy loading for routes
- Optimized bundle size
- CDN distribution via Vercel

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Solana Devnet Faucet](https://faucet.solana.com)
- [Your Program on Explorer](https://explorer.solana.com/address/GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn?cluster=devnet)

## Next Steps After Deployment

1. Share the URL with testers
2. Monitor performance in Vercel dashboard
3. Collect user feedback
4. Iterate based on testing results
5. Prepare for Mainnet deployment after testing

---

**Ready to Deploy!** Your app is configured and ready for live testing on Vercel. The build is optimized and all configurations are in place.