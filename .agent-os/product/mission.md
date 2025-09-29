# Product Mission

## Pitch

FlipCoin is a provably fair, on-chain coin flip betting platform on Solana that enables users to participate in transparent 1v1 gambling matches with instant crypto payouts, leveraging client-side commitment storage to ensure even the house cannot cheat.

## Users

### Primary Customers

- **Crypto Gamblers**: Active DeFi users seeking transparent, provably fair gambling experiences
- **Solana Ecosystem Users**: Solana holders and traders looking for entertainment within the ecosystem
- **Casual Betting Enthusiasts**: Users wanting quick, simple betting games with transparent odds

### User Personas

**The DeFi Degen** (22-35 years old)
- **Role:** Active trader/investor in crypto markets
- **Context:** Regularly uses DeFi protocols, comfortable with wallets and transactions
- **Pain Points:** Lack of transparency in traditional online casinos, concerns about rigged games
- **Goals:** Find provably fair betting opportunities with verifiable on-chain outcomes

**The Casual Crypto Gambler** (25-45 years old)
- **Role:** Occasional gambler with basic crypto knowledge
- **Context:** Owns crypto primarily for investment, looking for entertainment
- **Pain Points:** Complex betting platforms, unclear odds and payout mechanisms, fear of admin manipulation
- **Goals:** Simple, fun betting experience with clear rules and transparent payouts

## The Problem

### Lack of Trust in Online Gambling

Traditional online gambling platforms and even many crypto gambling sites require users to trust the house. The house can see player choices before revealing outcomes, potentially manipulating results or selectively blocking losing games.

**Our Solution:** Client-side only commitment storage using IndexedDB and localStorage. Your choice and secret never leave your device until reveal phase. The backend literally cannot see what you chose, making cheating impossible.

### High Fees and Slow Payouts

Ethereum-based gambling dApps charge $20-100 in gas fees per bet, with payouts taking minutes. This creates poor user experience and limits small-stake gambling.

**Our Solution:** Leveraging Solana's sub-cent transaction fees and sub-second finality for instant, affordable betting. Bet amounts as low as 0.01 SOL (~$2) are economically viable.

### Complex User Interfaces

Most crypto gambling platforms require extensive blockchain knowledge, deterring mainstream adoption. Users struggle with understanding commitment schemes and transaction flows.

**Our Solution:** Simple room-based betting system with automatic commitment generation and reveal. Just pick heads or tails - the crypto happens behind the scenes.

## Differentiators

### Provably Fair Architecture

**Client-Side Commitment Storage:** Unlike all competitors who store secrets on backend (where admins could cheat), we store commitments exclusively in IndexedDB and localStorage on YOUR device. Backend only receives the commitment hash, not your choice or secret.

This architectural decision makes us the only provably fair coin flip platform where the house literally cannot cheat.

### Lightning-Fast, Low-Cost Betting

Unlike Ethereum-based competitors charging $20+ per bet, we offer sub-$0.01 transaction costs on Solana. This enables:
- 99.9% lower fees than Ethereum gambling dApps
- Micro-betting starting from 0.01 SOL
- No minimum bet requirements
- Instant payouts (sub-second finality)

### True Peer-to-Peer Betting

Unlike casino-style games played against the house, we enable direct peer-to-peer betting:
- Only 7% house fee (vs typical 10-20%)
- Fair 50/50 odds verified on-chain
- No house edge manipulation
- Transparent payout calculation

## Key Features

### Core Features (Implemented)

- **One-Click Wallet Connection:** Connect Phantom or Solflare instantly
- **Custom Room Creation:** Set your own betting amounts
- **Provably Fair Coin Flips:** Commitment-reveal scheme ensures fairness
- **Client-Side Security:** Secrets stored only on your device via IndexedDB
- **Instant Payouts:** Winners receive funds immediately on-chain
- **Live Room Browser:** See all available games with bet amounts
- **Real-time Updates:** WebSocket connections for live game state
- **Game Recovery:** Rejoin games after browser refresh or disconnect
- **Transaction History:** Track your wins, losses, and profit/loss

### Security Architecture

**Commitment Phase:**
1. Player chooses heads or tails
2. App generates random secret (256-bit)
3. Commitment = SHA256(choice + secret)
4. Store choice + secret in IndexedDB (YOUR DEVICE ONLY)
5. Send only commitment hash to blockchain
6. Backend sees: NOTHING about your choice

**Reveal Phase:**
1. Retrieve choice + secret from IndexedDB
2. Send to blockchain for verification
3. Smart contract verifies: SHA256(choice + secret) == commitment
4. If valid, game resolves and winner receives payout

**Result:** Even if someone hacks the backend server, they CANNOT see player choices before reveal. The commitment scheme is cryptographically secure and stored client-side only.

## Development Status

**Current Phase:** Phase 1 - Complete Simple Flow
**Network:** Solana Devnet
**Smart Contract:** Deployed and tested
**Focus:** End-to-end testing and bug fixes for production readiness

## Target Metrics

**Phase 1 Success:**
- Complete 10 successful game flows without errors
- All edge cases handled (timeouts, disconnections, ties)
- <2 second transaction confirmation time

**Phase 2 Success (Mainnet):**
- First 100 real money bets processed successfully
- <1% error rate
- Zero security incidents

**Long-term Goals:**
- 1000+ daily active users
- 10,000+ games per day
- 99.9% uptime