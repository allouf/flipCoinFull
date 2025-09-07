# Technical Stack

## Core Technologies

- **JavaScript Framework:** React.js v18.2.0 with Create React App + CRACO v7.1.0 ✅
- **Type System:** TypeScript v4.9.5 with strict mode ✅
- **CSS Framework:** Tailwind CSS v3.3.0 with PostCSS v8.4.21 ✅
- **UI Component Library:** DaisyUI v4.0.0 (Tailwind CSS components) ✅
- **Build Tool:** CRACO v7.1.0 for Create React App customization ✅
- **Blockchain Framework:** Anchor Framework v0.29.0 (Solana smart contracts) ✅
- **Database System:** On-chain storage via Solana PDAs ✅
- **Import Strategy:** npm package management with TypeScript ✅

## Infrastructure

- **Application Hosting:** Vercel/Netlify (frontend deployment)
- **Blockchain Networks:** Solana Devnet (deployed: GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn) → Mainnet (planned)
- **Asset Hosting:** CDN via hosting provider
- **Deployment Strategy:** Anchor deploy scripts for all environments, progressive rollout

## Blockchain Integration

- **Wallet Libraries:** @solana/wallet-adapter-react v0.15.35, @solana/wallet-adapter-wallets v0.19.32
- **Web3 Library:** @solana/web3.js v1.87.6
- **Wallet UI:** @solana/wallet-adapter-react-ui v0.9.35
- **Wallet Base:** @solana/wallet-adapter-base v0.9.23
- **RPC Provider:** Configurable (Helius, QuickNode, or default RPC)
- **Randomness Oracle:** Switchboard V2 VRF with comprehensive error recovery system ✅
- **VRF Error Recovery:** Multi-account pool management, exponential backoff retry, emergency 60s timeout resolution ✅
- **Real-time Updates:** WebSocket architecture with BroadcastChannel for cross-tab synchronization ✅
- **State Management:** Zustand v4.5.5 for global state, @tanstack/react-query v5.0.0 for caching ✅
- **Data Visualization:** Recharts v2.8.0 for transaction history and statistics ✅
- **Testing:** Jest with 90%+ coverage requirement, Playwright for E2E testing, 60+ VRF error recovery tests ✅
- **Smart Contract Architecture:** Single Anchor program with comprehensive PDA-based state management:
  - GlobalState: Program configuration (seeds: ["global_state"]), house wallet, and global stats
  - GameRoom: Individual game state (seeds: ["game_room", creator, room_id]) with VRF integration
  - QueuePosition: Auto-matching queue (seeds: ["queue_position", player]) for bet matching
  - PlayerStats: User statistics tracking (optional, structure defined)
- **VRF Services:** VRFAccountManager, VRFRetryHandler, VRFEmergencyFallback, VRFErrorDetector, VRFHealthMonitor ✅

## Development Tools

- **Testing Framework:** Jest with @testing-library/react v13.4.0, @testing-library/user-event v13.5.0, Playwright v1.55.0, Anchor test suite for programs
- **Package Manager:** npm with package-lock.json (no Yarn)
- **Build Tools:** CRACO + Webpack (via CRA), Anchor Build System
- **Linting:** ESLint v8.37.0 with Airbnb TypeScript config (@typescript-eslint/eslint-plugin v5.57.1)
- **Code Formatting:** Prettier v2.8.7 with custom config
- **Development Server:** CRACO start for hot reloading

## Real-time Features

- **WebSocket Library:** rpc-websockets v9.1.3 (Solana WebSocket subscriptions)
- **State Management:** Zustand v4.5.5 (custom GameStore implementation)
- **Routing:** React Router DOM v6.8.1
- **RPC Client:** @solana/web3.js Connection class for blockchain interactions

## Security & Monitoring

- **Error Tracking:** Comprehensive VRF error detection and classification system ✅
- **VRF Health Monitoring:** Real-time account health tracking, queue depth monitoring, success rate analysis ✅
- **Emergency Systems:** 60-second emergency fallback with multiple resolution methods ✅
- **Security Auditing:** Anchor's built-in security checks, custom error handling, input validation, house fee caps (max 10%) ✅
- **Rate Limiting:** Implemented at RPC provider level
- **Deployment Security:** Pre-deployment validation scripts, flexible house wallet configuration ✅
- **Transaction Monitoring:** Real-time status tracking, retry logic, blockhash refresh handling ✅

## Production Deployment

- **Automation Scripts:** Complete deployment automation with pre-deployment checks ✅
- **Environment Configuration:** Flexible VRF account setup, house wallet options (existing/auto-generated) ✅
- **Validation System:** Pre-deployment verification of all dependencies and configurations ✅
- **Current Status:** Deployed on Devnet (GGowNXivyzWKePKstFpyU18ykoaM9ygKuuzAV1mYoczn), ready for mainnet after VRF/audit ✅
- **WSL Support:** Complete WSL deployment guide for Windows development environments ✅