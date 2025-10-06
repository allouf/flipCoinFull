# Product Roadmap

## Phase 0: Already Completed ✅

The following infrastructure and features have been implemented:

### Core Infrastructure
- [x] **Wallet Connection** - Phantom, Solflare integration with auto-connect
- [x] **UI Framework** - React 18, TailwindCSS, DaisyUI
- [x] **Build Tooling** - TypeScript, CRACO, ESLint, Prettier
- [x] **Smart Contract** - Anchor program deployed to devnet (commitment-reveal scheme)
- [x] **IDL Definition** - Complete fair_coin_flipper IDL with all instructions
- [x] **Client-Side Security** - IndexedDB + localStorage commitment storage (backend cannot cheat!)
- [x] **State Management** - Zustand + React Query

### Backend Services
- [x] **WebSocket Backend** - Node.js + Express + Socket.IO for real-time updates (deployed on Render)
- [x] **Database** - PostgreSQL on Neon (with SQLite fallback)
- [x] **Real-time Updates** - WebSocket integration for live game state
- [x] **Cross-tab Sync** - Broadcast channel for multi-tab coordination

### Game Features
- [x] **Enhanced Game Lobby** - Tabbed interface (Available, Running, My Games, History)
- [x] **Search & Filters** - Search by wallet, filter by bet amount, sort options
- [x] **Pagination** - Efficient game browsing with 6 games per page
- [x] **Mobile Optimization** - 3-row tab layout with horizontal scroll for mobile
- [x] **Game Recovery** - Abandoned room detection, timeout handling
- [x] **Matchmaking System** - Auto-match with available players
- [x] **Transaction History** - Stats page, game history tracking with CSV export
- [x] **Notifications** - Toast notifications for game events

### Advanced Features
- [x] **VRF Integration** - Switchboard VRF for verifiable randomness
- [x] **VRF Error Handling** - Comprehensive retry and fallback mechanisms
- [x] **VRF Health Monitoring** - Status tracking and error detection
- [x] **Network Selection** - Devnet/Mainnet toggle
- [x] **Explorer Links** - Direct links to Solana Explorer for transactions

### Deployment
- [x] **Frontend** - Deployed on Vercel
- [x] **Backend** - Deployed on Render
- [x] **Database** - PostgreSQL on Neon
- [x] **Smart Contract** - Deployed on Solana Devnet

## Phase 1: Complete Simple Flow (CURRENT PRIORITY) 🎯

**Goal:** Get a working end-to-end coin flip game with no errors
**Success Criteria:** Create game → Join game → Make commitments → Reveal choices → Winner paid

### Critical Path to Working Flow

- [ ] **End-to-End Testing** - Manual testing of complete game flow `S`
  - Create game with Player A
  - Join game with Player B
  - Player A makes commitment (heads/tails + secret)
  - Player B makes commitment (heads/tails + secret)
  - Player A reveals choice
  - Player B reveals choice (auto-resolves game)
  - Winner receives payout
  - Verify all funds distributed correctly

- [ ] **Fix Any Blocking Issues** - Address errors that prevent flow completion `M`
  - Commitment generation working correctly
  - Reveal phase triggers properly
  - Game resolution completes successfully
  - Payout distribution verified

- [ ] **UI Polish for Core Flow** - Ensure user understands each step `S`
  - Clear status messages at each phase
  - Loading indicators during transactions
  - Success/failure notifications
  - Transaction links to Solana Explorer

### Testing Checklist

- [ ] Happy path: Both players complete flow normally
- [ ] Player A abandons after creating game (timeout works)
- [ ] Player B abandons after joining (timeout works)
- [ ] Both players commit, then one abandons (reveal timeout works)
- [ ] Tie game: Both players choose same side (refund works)
- [ ] Network issues: Transaction retries work
- [ ] Wallet disconnection: Error handling works
- [ ] Browser refresh: Game state persists (commitment recovery)

## Phase 2: Production Readiness

**Goal:** Deploy to Solana Mainnet
**Success Criteria:** First 100 real money bets processed successfully

### Features

- [ ] **Security Audit** - Professional smart contract audit `XL`
- [ ] **Mainnet Deployment** - Deploy program to mainnet-beta `M`
- [ ] **Mainnet House Wallet** - Secure multisig setup `S`
- [ ] **Monitoring & Alerts** - Error tracking and uptime monitoring `M`
- [ ] **Legal Compliance** - Terms of service, disclaimers `L`
- [ ] **Performance Optimization** - RPC caching, batch requests `M`
- [ ] **CI/CD Pipeline** - Automated testing and deployment `M`

## Phase 3: Polish & User Experience

**Goal:** Improve reliability and user experience
**Success Criteria:** <1% error rate, positive user feedback

### Features

- [ ] **Better Error Messages** - User-friendly explanations `S`
- [ ] **Loading States** - Better spinners and progress indicators `S`
- [ ] **Transaction Confirmation UI** - Clear feedback on blockchain operations `S`
- [ ] **Advanced Stats** - Win/loss tracking, profit graphs `M`
- [ ] **Help & Tutorials** - First-time user guide `M`

## Phase 4: Social Features & Engagement

**Goal:** Make the experience more engaging and social
**Success Criteria:** 50% increase in user retention

### Priority Features

- [ ] **Leaderboards** - Top players by profit, win rate, win streak `M`
  - Global leaderboard (all-time)
  - Weekly/Monthly leaderboards (resets)
  - Filter by network (devnet/mainnet)
  - Achievement badges for milestones (100 flips, 10-win streak, etc.)

- [ ] **Share to Social Media** - Built-in share buttons `S`
  - Share wins on Twitter/TikTok
  - Generate shareable win cards (images)
  - Referral links with tracking

### Secondary Features

- [ ] **Private Rooms** - Password-protected games with friends `S`
- [ ] **Friend Challenges** - Send direct game invite links `S`
- [ ] **Spectator Mode** - Watch ongoing games live `M`
- [ ] **Chat System** - In-game chat with opponents (consider moderation needs) `M`

## Phase 5: Tournament System (Optional)

**Goal:** Create competitive tournament ecosystem
**Success Criteria:** 100+ players per tournament

### Tournament Features

- [ ] **Tournament Mode** - Scheduled bracket competitions `XL`
  - Time-based tournaments (e.g., "Weekend Flip Championship")
  - Entry fee pools into prize pool (e.g., 0.1 SOL entry, winner takes 80%)
  - Bracket-style (single/double elimination) or points-based
  - Example: 16-player single-elimination tournament
  - Automated bracket generation and scheduling
  - Tournament leaderboards and history

- [ ] **Referral System** - Earn commission for bringing friends `M`
- [ ] **NFT Badges** - Achievement rewards as collectibles `L`
- [ ] **Advanced Analytics** - Detailed statistics dashboard `M`

## Phase 6: Mobile Application

**Goal:** Native mobile experience for iOS and Android
**Success Criteria:** 50% of users on mobile within 3 months

### Features

- [ ] **React Native Setup** - Initialize RN project with Expo `M`
- [ ] **Wallet Integration** - Mobile wallet adapters (Phantom, Solflare mobile) `L`
- [ ] **Mobile UI** - Redesign for native mobile experience `L`
- [ ] **Push Notifications** - Game invites, turn notifications `M`
- [ ] **Biometric Auth** - Fingerprint/Face ID for quick access `S`
- [ ] **App Store Deployment** - iOS App Store and Google Play `M`
- [ ] **Deep Linking** - Share game links that open in app `S`

### Dependencies
- Requires Phase 1 & 2 complete (stable core flow on mainnet)
- API updates for mobile compatibility

## Phase 7: Multi-Game Platform

**Goal:** Expand beyond coin flip to multiple game types
**Success Criteria:** 3+ game types with equal engagement

### Game Expansion

**Easy to Implement (Similar Mechanics):**

- [ ] **Rock-Paper-Scissors** - Same commitment scheme, 3 choices `M`
  - Flow: Player A picks (rock/paper/scissors), Player B picks
  - Commitment-reveal identical to coin flip
  - Same escrow/payout logic
  - Very viral, popular game type

- [ ] **Dice Roll** - Players pick number 1-6, VRF determines winner `M`
  - Player A picks a number (1-6)
  - Player B rolls using VRF
  - If match → A wins, else → B wins
  - Reuses existing VRF infrastructure

- [ ] **High-Low Card** - Guess higher or lower than drawn card `M`
  - Draw a card (1-13 using VRF)
  - Opponent guesses higher/lower
  - Simple, addictive game mechanic

### Shared Infrastructure
All games use the same:
- Lobby system (with game type filter)
- Commitment-reveal pattern
- Escrow and payout logic
- WebSocket updates
- Matchmaking system

**Implementation Notes:**
- Same smart contract pattern, different game logic per type
- Add `game_type` field to game account
- Minimal frontend changes (different UI components per game)
- Leaderboards can be per-game-type or combined

### Additional Features
- [ ] **Multi-token Support** - Bet with USDC, other SPL tokens `L`
- [ ] **Game Type Selector** - Choose game in lobby `S`
- [ ] **Per-Game Leaderboards** - Separate rankings per game type `M`

---

## Current Focus: Phase 1

**Next Action**: Test complete game flow end-to-end and fix any issues that prevent completion

**Development Status:**
- **Current Network:** Solana Devnet
- **Frontend:** Deployed on Vercel
- **Backend:** Deployed on Render
- **Database:** PostgreSQL on Neon
- **Stage:** Test phase, preparing for mainnet