# Project: Solana Coin Flipper Betting Game

## Overview
A decentralized, peer-to-peer (1v1) betting game on Solana blockchain where players wager real crypto on coin flips. Inspired by successful blockchain games like Rock Paper Scissors, this platform emphasizes "don't trust, verify" with all game logic executed transparently on-chain via smart contracts. No third-party intermediaries or casino operators - just pure peer-to-peer betting with verifiable fairness through blockchain technology. Players connect their Solana wallets (Phantom, Solflare, etc.) to participate in instant, low-fee betting matches.

## Tech Stack
- Blockchain: Solana (Anchor for smart contracts/programs).
- Frontend: React.js (with Create React App), Tailwind CSS for styling, React Router for navigation.
- Wallet Integration: @solana/web3.js, @solana/wallet-adapter-react for connecting wallets (e.g., Phantom, Solflare).
- Backend (if needed): Node.js with Express for off-chain API (e.g., room matchmaking), but prioritize on-chain where possible.
- Randomness: Use Switchboard or Chainlink VRF for fair coin flips (on-chain RNG).
- Other: Axios for any APIs, Socket.io for real-time room updates (e.g., player joins, flip results).
- Testing: Jest for frontend, Anchor tests for programs.
- Deployment: Vercel/Netlify for frontend, Solana Devnet/Mainnet for programs.

## Game Rules & Mechanics

### Core Gameplay
- **Betting & Matching**: Players select token (SOL or SPL tokens) and bet amount. System automatically matches two players with identical bets to form a game room.
- **Coin Flip Mechanics**: Simple heads or tails selection. Winner takes the pot (sum of both bets minus house fee).
- **House Fee**: 3% of total pot goes to project maintenance wallet (transparent on-chain).
- **Instant Resolution**: Single flip determines winner - no best-of-3 or extended rounds needed.

### Time Limits & Timeouts
- **Decision Timer**: 30 seconds to make heads/tails selection after match is made.
- **Timeout Resolution**: If a player times out, the other player automatically wins and claims the pot.
- **Network-Adaptive**: Timeouts adjust based on Solana network congestion (30 seconds to 2 minutes).

### Fairness & Security
- **Verifiable Randomness**: Using Switchboard VRF or similar oracle for provably fair coin flips.
- **Smart Contract State Machine**: Game always completes (either organically or via timeout).
- **No Manipulation**: On-chain execution eliminates any possibility of backend manipulation.
- **Dispute Resolution**: Automatic - no manual intervention needed, all handled by smart contract logic.

### Betting Limits & Safety
- **No Maximum Limits**: Players can bet any amount they choose (at their own risk).
- **Minimum Bet**: 0.01 SOL to cover transaction fees.
- **Responsible Gaming Warning**: Clear warnings about betting only what users can afford to lose.
- **Irreversible Transactions**: Once bet is placed, no cancellations or refunds possible.

## Key Features (Prioritized for MVP)
1. **Wallet Connection**: Connect Solana wallet (Phantom, Solflare, Backpack), view SOL/token balances.
2. **Auto-Matching System**: Enter bet amount, get matched with another player betting the same amount.
3. **Room Creation**: Manual room creation with custom bet amounts for playing with friends.
4. **Coin Flip Execution**: Select heads/tails, execute on-chain flip with VRF randomness.
5. **Instant Payout**: Winner receives pot minus 3% fee directly to wallet, verifiable on-chain.
6. **Game History**: View past games, wins/losses, total profit/loss on personal dashboard.
7. **Real-time Updates**: WebSocket connections for live game status and results.

### Future Features
- Tournament modes with brackets
- Leaderboards and statistics
- Multi-token support (USDC, BONK, etc.)
- NFT rewards for milestones
- Chat system in game rooms
- Mobile app (React Native)
- ENS-style domain for censorship resistance

## Development Guidelines
- Code Style: Clean, modular, commented. Use TypeScript for safety. Follow Solana best practices (e.g., secure programs).
- Security: Validate all inputs, prevent exploits (e.g., reentrancy in programs), use secure RNG.
- Testing: Unit tests for programs (Anchor), integration for frontend/wallet.
- Workflow: Break into sprints—plan, build, test. Use Git. On-chain first for core logic.
- Constraints: Web-only. Fairness via on-chain RNG. House fee to a fixed wallet.
- Blockchain: Develop on Devnet, deploy to Mainnet later.

## Agents to Leverage
- Planning: sprint-prioritizer for task breakdown.
- Backend/Blockchain: backend-architect for APIs, ai-engineer for Solana integration (if AI needed).
- Frontend: frontend-developer for UI, ui-designer for components.
- General: rapid-prototyper for setup, test-writer-fixer for QA.
- Use sequentially (e.g., rapid-prototyper for boilerplate, test-writer-fixer post-implementation).

## Success Criteria
- **Local Testing**: Connect wallet, auto-match or create room, execute coin flip, receive payout.
- **On-chain Verification**: All transactions visible on Solana Explorer, smart contract state verifiable.
- **End-to-End Flow**: Two users can complete full game cycle with proper fee deduction.
- **Security**: No ability to manipulate outcomes, exploit timeouts, or reverse transactions.
- **Performance**: Sub-second transaction confirmation, instant UI updates via WebSocket.

## Platform Strategy
- **Solana Advantages**: Leverage sub-cent fees and fast finality vs Ethereum's high gas costs.
- **Global Accessibility**: Support worldwide play, no geo-restrictions (user responsibility for local laws).
- **Transparency First**: Open-source contracts, verifiable randomness, public transaction history.
- **Community Focus**: Discord for strategies/discussion, Twitter for updates, Telegram for support.
- **Censorship Resistance**: Multiple frontend deployments, IPFS hosting option, direct contract interaction always possible.

## Agent OS Context Note
**FOR FRESH SESSIONS**: Complete project context is available - no need to ask user for information:
- `AGENT_OS_CONTEXT.md` - Comprehensive session context (read this first)
- `About.md` - Detailed project overview with session handoff guide
- `TODO.md` - Current sprint priorities with full context

**Current Status (2025-09-04)**: Production-ready system with enterprise VRF error recovery.
**Next Priority**: Configure real Switchboard VRF accounts (currently using placeholders).
**Key Commands**: `npm run deploy:verify:enhanced`, `npm run validate-vrf-config`