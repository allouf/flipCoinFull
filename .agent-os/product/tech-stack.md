# Technical Stack

## Core Technologies

- **JavaScript Framework:** React.js v18.2.0 with Create React App ✅
- **Build Customization:** CRACO v7.1.0 for Webpack polyfill configuration ✅
- **Type System:** TypeScript v5.9.2 with strict mode ✅
- **CSS Framework:** Tailwind CSS v3.3.0 with PostCSS v8.4.21 ✅
- **UI Component Library:** DaisyUI v4.0.0 (Tailwind CSS components) ✅
- **Blockchain Framework:** Anchor Framework v0.29.0 (Solana smart contracts) ✅
- **Data Storage:** Client-side only (IndexedDB + localStorage) - No backend database for secrets ✅
- **Import Strategy:** npm package management with TypeScript ✅

## Infrastructure

### Current Deployment (Test Phase)
- **Application Hosting:** Vercel (https://flipcoin.vercel.app)
- **Backend Hosting:** Render (WebSocket server)
- **Database Hosting:** Neon (PostgreSQL with connection pooling)
- **Blockchain Network:** Solana Devnet
- **Smart Contract:** fair_coin_flipper program deployed on devnet

### Production Targets
- **Blockchain Network:** Solana Mainnet (planned)
- **RPC Provider:** Helius or QuickNode (to be configured)
- **Deployment Strategy:** Anchor deploy scripts for program deployment
- **CI/CD:** Automated testing and deployment pipeline (planned)

## Blockchain Integration

- **Wallet Libraries:**
  - @solana/wallet-adapter-react v0.15.35
  - @solana/wallet-adapter-wallets v0.19.32 (Phantom, Solflare)
  - @solana/wallet-adapter-react-ui v0.9.35
  - @solana/wallet-adapter-base v0.9.23
- **Web3 Library:** @solana/web3.js v1.87.6
- **Anchor SDK:** @coral-xyz/anchor v0.29.0
- **RPC Provider:** Configurable via REACT_APP_DEVNET_RPC_URL env var
- **Commitment Scheme:** SHA256 hash (js-sha256 v0.11.1)
- **Secret Generation:** tweetnacl v1.0.3 for cryptographic random values

### VRF Integration (Switchboard)
- **VRF Library:** @switchboard-xyz/solana.js v3.2.5
- **Purpose:** Verifiable Random Function for fair game outcomes
- **Services Implemented:**
  - VRFAccountManager - Account lifecycle management
  - VRFRetryHandler - Transaction retry logic with exponential backoff
  - VRFErrorDetector - Error detection and classification
  - VRFHealthMonitor - System health tracking
  - VRFEmergencyFallback - Fallback mechanisms for failures
  - SwitchboardQueueTracker - Oracle queue monitoring
- **Features:**
  - Comprehensive error handling and retry mechanisms
  - Health monitoring and status tracking
  - Emergency fallback for critical failures
  - Integration tests for production validation

## Real-time Features

- **WebSocket Backend:** Node.js + Express + Socket.IO v4.5.0 ✅
- **WebSocket Client:** socket.io-client v4.5.0 ✅
- **State Management:** Zustand v4.5.5 for global state ✅
- **Data Fetching:** @tanstack/react-query v5.86.0 for caching ✅
- **Routing:** React Router DOM v6.8.1 ✅
- **Cross-tab Sync:** broadcast-channel v4.20.2 ✅

## Client-Side Storage (Security Critical)

- **Primary Storage:** IndexedDB via custom wrapper (src/utils/indexedDBStorage.ts) ✅
- **Backup Storage:** localStorage (fallback if IndexedDB fails) ✅
- **Storage Strategy:** Dual-layer storage for commitment data ✅
- **Security Model:** Secrets NEVER sent to backend - client-side only ✅

### Storage Schema

**IndexedDB Database:** `CoinFlipperDB` (version 1)
- **ObjectStore:** `commitments`
- **KeyPath:** `[walletAddress, roomId]` (composite key)
- **Indexes:**
  - `roomId` - Query by game room
  - `walletAddress` - Query by player wallet
  - `timestamp` - Query by creation time

**Stored Data:**
```typescript
{
  walletAddress: string;
  roomId: number;
  choice: 'heads' | 'tails';
  choiceNum: number;
  secret: string;  // 256-bit random value
  commitment: number[];  // SHA256 hash
  timestamp: number;
}
```

## Smart Contract Architecture

**Program:** fair_coin_flipper (Anchor v0.29.0)

**Instructions:**
1. `createGame` - Player A creates game with bet amount
2. `joinGame` - Player B joins with matching bet
3. `makeCommitment` - Players submit commitment hashes (SHA256)
4. `revealChoice` - Players reveal choice + secret for verification
5. `resolveGameManual` - Manual resolution if needed
6. `cancelGame` - Handle timeouts and refunds

**Accounts:**
- **Game PDA:** `[b"game_room", player_a.key(), game_id.to_le_bytes()]`
- **Escrow PDA:** Holds bet amounts during game
- **House Wallet:** Receives 7% fee on resolution

**Game States:**
1. `WaitingForPlayer` - Waiting for Player B
2. `PlayersReady` - Both players joined
3. `CommitmentsReady` - Both commitments made
4. `RevealingPhase` - Players revealing choices
5. `Resolved` - Game complete, winner paid
6. `Cancelled` - Timeout/cancelled, refunds issued

## Development Tools

### Testing & Quality
- **Unit Testing:** Jest with @testing-library/react v13.4.0
- **Component Testing:** @testing-library/user-event v13.5.0
- **E2E Testing:** Playwright v1.55.0 for end-to-end flows
- **Test Coverage:** Comprehensive tests for VRF services, hooks, components
- **MCP Testing:** @playwright/mcp v0.0.35 for model context protocol

### Build & Development
- **Package Manager:** npm with package-lock.json
- **Build Tools:** CRACO v7.1.0 + Webpack (via CRA customization)
- **Linting:** ESLint v8.37.0 with Airbnb TypeScript config
- **Code Formatting:** Prettier v2.8.7
- **Development Server:** Port 3010 (configurable via PORT env var)
- **Hot Reload:** React Fast Refresh enabled

### CI/CD (Planned)
- **Continuous Integration:** GitHub Actions (to be configured)
- **Automated Testing:** Run tests on PR and push
- **Deployment:** Auto-deploy to Vercel on merge to main
- **Smart Contract:** Anchor deploy scripts with environment checks

## Backend API (WebSocket Only)

**Purpose:** Real-time game state updates only (NOT for secret storage)

- **Framework:** Express.js + Node.js
- **WebSocket:** Socket.IO for real-time updates
- **Database:** PostgreSQL (Neon) or SQLite fallback
- **Storage:** Game rooms, player connections - NO SECRETS OR COMMITMENTS
- **Port:** 4000 (configurable)

**API Endpoints:**
- `POST /api/commitments` - DEPRECATED (not used for secrets anymore)
- `GET /api/stats/:wallet` - Player statistics
- `GET /api/leaderboard` - Top players

**WebSocket Events:**
- `subscribe_room` - Join game room for updates
- `game_event` - Broadcast game state changes
- `lobby_update` - Broadcast lobby changes

## Security & Monitoring

- **Commitment Security:** Client-side only storage (IndexedDB + localStorage) ✅
- **Backend Isolation:** Backend CANNOT see player choices or secrets ✅
- **Cryptographic Random:** tweetnacl for secure secret generation ✅
- **Hash Function:** SHA256 via js-sha256 library ✅
- **Input Validation:** Anchor's built-in security checks ✅
- **House Fee Cap:** Maximum 10% (currently 7%) ✅
- **Error Handling:** Comprehensive error messages and recovery ✅

## Browser Polyfills (Required for Solana)

CRACO configuration provides Node.js polyfills for browser:
- `buffer` - Buffer implementation
- `crypto-browserify` - Crypto functions
- `stream-browserify` - Stream API
- `process` - Process global
- `assert` - Assertion library
- `path-browserify` - Path utilities

## Development Environment

**Frontend:**
```bash
npm start              # Port 3010
npm run build         # Production build
npm test              # Run tests
```

**Backend (Optional):**
```bash
cd backend
PORT=4000 node server.js  # WebSocket server
```

**Environment Variables:**
- `REACT_APP_NETWORK` - "devnet" or "mainnet-beta"
- `REACT_APP_DEVNET_RPC_URL` - Custom RPC endpoint
- `REACT_APP_BACKEND_URL` - Backend URL (default: http://localhost:4000)

## Production Deployment

**Current Status:** Devnet testing
**Next Steps:**
1. Complete end-to-end testing on devnet
2. Security audit of smart contract
3. Deploy to mainnet
4. Configure production RPC provider (Helius/QuickNode)
5. Set up monitoring and alerts

**Deployment Checklist:**
- [ ] Smart contract audit completed
- [ ] Mainnet program deployed
- [ ] House wallet configured (multisig recommended)
- [ ] Production RPC provider configured
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Backend deployed (if needed for WebSocket)
- [ ] Monitoring and error tracking enabled
- [ ] Legal disclaimers and terms of service