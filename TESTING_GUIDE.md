# Solana Coin Flipper - Testing Guide

## Prerequisites for Testing

### 1. Wallet Setup
- **Phantom Wallet Extension**: Install and create/import a wallet
- **Solflare Wallet Extension**: Install and create/import a wallet (optional)
- **Test SOL**: Ensure you have some SOL for transactions

### 2. Network Configuration
The app now defaults to **mainnet-beta** to match most users' wallet configurations.

**To switch networks:**
- Click the network selector in the top-right corner
- Choose between Mainnet, Devnet, or Testnet
- Your wallet must be on the same network as the app

**Getting Test SOL for Devnet:**
```bash
# Install Solana CLI (if not already installed)
solana config set --url https://api.devnet.solana.com
solana airdrop 2 YOUR_WALLET_ADDRESS
```

## Testing Scenarios

### Scenario 1: Wallet Connection Testing

**Objective**: Verify wallet connection functionality works correctly

**Steps**:
1. Open the application at `http://localhost:3002`
2. Click "Connect Wallet" button in the top-right corner
3. **Expected**: Modal appears centered on screen, above all other elements
4. **Expected**: Modal shows available wallets (Phantom, Solflare, Ledger)
5. Select your installed wallet (e.g., Phantom)
6. **Expected**: Wallet extension popup appears
7. Approve the connection in your wallet
8. **Expected**: Modal closes, button shows wallet address and balance
9. **Expected**: Network selector shows current network

**Success Criteria**:
- ✅ Modal is fully visible and centered
- ✅ Modal appears above all page elements
- ✅ Wallet connection succeeds without errors
- ✅ Balance displays correctly
- ✅ Address is properly formatted

### Scenario 2: Network Switching

**Objective**: Test network switching functionality

**Steps**:
1. With wallet connected, click the network selector dropdown
2. **Expected**: Dropdown shows Mainnet, Devnet, Testnet options
3. Select "Devnet" 
4. **Expected**: Network switches, balance updates to devnet balance
5. Try to connect wallet on devnet
6. **Expected**: Connection works or prompts to add devnet to wallet

**Success Criteria**:
- ✅ Network switching works smoothly
- ✅ Balance updates correctly for new network
- ✅ Wallet adapts to network change

### Scenario 3: Modal Behavior Testing

**Objective**: Ensure modal positioning and interaction work correctly

**Steps**:
1. Open wallet connection modal
2. **Expected**: Modal appears in center of viewport
3. **Expected**: Background is dimmed with blur effect
4. Try clicking outside the modal (on background)
5. **Expected**: Modal closes
6. Open modal again, press Escape key
7. **Expected**: Modal closes
8. Open modal, click the X button
9. **Expected**: Modal closes
10. Scroll page and open modal
11. **Expected**: Modal remains centered regardless of scroll position

**Success Criteria**:
- ✅ Modal always appears centered
- ✅ Modal is above all other UI elements
- ✅ All three close methods work (backdrop, escape, X button)
- ✅ Modal positioning unaffected by page scroll

### Scenario 4: Demo Coin Flip Testing

**Objective**: Test the coin flip animation and functionality

**Steps**:
1. Scroll to the "Try Your Luck" section
2. Click the "Flip Coin" button
3. **Expected**: Coin starts spinning animation
4. **Expected**: Button becomes disabled during flip
5. Wait for animation to complete (~2 seconds)
6. **Expected**: Coin shows either heads or tails result
7. **Expected**: Button becomes enabled again
8. Click flip multiple times
9. **Expected**: Results appear random (mix of heads/tails)

**Success Criteria**:
- ✅ Animation is smooth and visually appealing
- ✅ Results are random over multiple flips
- ✅ Button states work correctly
- ✅ No JavaScript errors in console

### Scenario 5: Room Creation (UI Only)

**Objective**: Test room creation UI elements

**Steps**:
1. Click "Create Room" button
2. **Expected**: Console log shows room creation message
3. Check browser console for any errors
4. Click "Join Room" button  
5. **Expected**: Console log shows join room message

**Success Criteria**:
- ✅ Buttons respond to clicks
- ✅ Console messages appear
- ✅ No JavaScript errors
- ✅ UI remains responsive

### Scenario 6: Responsive Design Testing

**Objective**: Ensure app works on different screen sizes

**Steps**:
1. Test on desktop (1920x1080)
2. **Expected**: Layout uses full width effectively
3. Resize browser to tablet size (768px width)
4. **Expected**: Layout adapts, buttons stack vertically
5. Resize to mobile (375px width)
6. **Expected**: Mobile-friendly layout
7. Test modal on mobile
8. **Expected**: Modal fits screen, is easily closeable

**Success Criteria**:
- ✅ Responsive layout works on all screen sizes
- ✅ Modal is usable on mobile devices
- ✅ All interactive elements remain accessible

## Error Testing Scenarios

### Error Scenario 1: Wallet Rejection

**Steps**:
1. Open wallet modal
2. Select wallet but reject/cancel in wallet extension
3. **Expected**: Modal remains open, shows appropriate error state
4. Try connecting again
5. **Expected**: Connection works normally

### Error Scenario 2: Network Mismatch

**Steps**:
1. Set app to Devnet
2. Ensure wallet is on Mainnet
3. Try to connect
4. **Expected**: Appropriate error handling or network switch prompt

### Error Scenario 3: No Wallet Extension

**Steps**:
1. Disable all wallet extensions in browser
2. Open wallet modal
3. **Expected**: Shows "Not Installed" section for all wallets
4. Click on a not-installed wallet
5. **Expected**: Opens wallet installation page in new tab

## Performance Testing

### Performance Scenario 1: Modal Opening Speed

**Steps**:
1. Measure time from click to modal appearance
2. **Expected**: Modal opens in < 200ms
3. Open/close modal multiple times rapidly
4. **Expected**: No lag or visual glitches

### Performance Scenario 2: Animation Performance

**Steps**:
1. Monitor browser performance during coin flip
2. **Expected**: 60 FPS animation
3. Check memory usage during extended use
4. **Expected**: No memory leaks

## Browser Compatibility Testing

Test the application on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## Console Error Monitoring

During all tests, monitor browser console for:
- **Red errors**: Should be zero
- **Yellow warnings**: Acceptable for development
- **Network errors**: Should not affect functionality

## Test Results Documentation

For each test scenario, document:
1. ✅ **Pass** / ❌ **Fail** / ⚠️ **Issues Found**
2. Browser tested
3. Any errors or unexpected behavior
4. Screenshots of issues (if any)

## Common Issues and Solutions

### Issue: Modal appears behind other elements
**Solution**: Z-index has been set to maximum value (2147483647)

### Issue: Wallet won't connect
**Possible causes**:
- Network mismatch (app on devnet, wallet on mainnet)
- Wallet extension not detected
- Browser blocking popup

### Issue: Balance shows as 0
**Possible causes**:
- Wrong network selected
- Wallet has no funds on selected network
- RPC endpoint issues

## Next Steps for Full Implementation

Currently tested features are UI/Frontend only. Full blockchain integration requires:

1. **Smart Contract Development**: Anchor program for coin flip logic
2. **VRF Integration**: Chainlink or Switchboard for random number generation  
3. **Real Betting Logic**: Actual SOL/token transfers
4. **Room Management**: Backend for matchmaking
5. **WebSocket Integration**: Real-time game updates

## Test Data Requirements

For full testing, ensure you have:
- Minimum 0.1 SOL for transaction fees
- Access to both mainnet and devnet funds
- Multiple wallet types for compatibility testing