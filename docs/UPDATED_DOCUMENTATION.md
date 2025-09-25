# Solana Coin Flipper - Complete Documentation

## 📊 Project Overview

**Solana Coin Flipper** is a decentralized, provably fair coin-flipping game built on the Solana blockchain. Players compete 1v1 in a trustless environment where all game logic is executed on-chain, ensuring transparency and fairness.

### Key Features
- **Provably Fair**: Cryptographic commit-reveal scheme prevents cheating
- **Fully Decentralized**: All logic runs on Solana blockchain
- **Auto-Resolution**: Games resolve automatically when both players reveal
- **Instant Payouts**: Winners receive funds directly to their wallet
- **No Trust Required**: Smart contract handles all fund management

## 🏗️ Technical Architecture

### Smart Contract (Program)
- **Program ID**: `7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6`
- **Network**: Solana Devnet
- **Language**: Rust with Anchor Framework
- **Deployment**: Solana Playground

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Blockchain SDK**: @solana/web3.js, @coral-xyz/anchor
- **Wallet Integration**: @solana/wallet-adapter
- **Styling**: TailwindCSS + DaisyUI
- **Build Tool**: Create React App with Craco

### Game Flow Architecture
```
1. Create Game → Player A initiates with bet amount
2. Join Game → Player B matches the bet
3. Commit Phase → Both players submit encrypted choices
4. Reveal Phase → Players reveal their choices
5. Auto-Resolution → Smart contract determines winner and transfers funds
```

## 💰 Economic Model

### Fee Structure
- **House Fee**: 7% of total pot
- **Winner Receives**: 93% of total pot
- **Cancellation Fee**: 2% per player (for games stuck > 1 hour)

### Bet Limits
- **Minimum Bet**: 0.01 SOL
- **Maximum Bet**: 100 SOL

### Example Calculation
```
Bet Amount: 1 SOL per player
Total Pot: 2 SOL
House Fee: 0.14 SOL (7%)
Winner Payout: 1.86 SOL (93%)
```

## 🔐 Security & Fairness

### Commit-Reveal Scheme
1. **Commitment Phase**: Players submit SHA-256 hash of (choice + secret)
2. **Reveal Phase**: Players reveal choice and secret
3. **Verification**: Smart contract verifies commitment matches reveal
4. **Resolution**: Coin flip result determined, funds transferred

### Anti-Cheat Mechanisms
- **Hidden Choices**: Choices encrypted until both commit
- **Commitment Verification**: Smart contract validates all reveals
- **Timeout Protection**: Games can be cancelled after 1 hour
- **Tie-Breaker**: Cryptographic hash determines winner if both choose same

### Fund Security
- **Escrow Accounts**: All funds held in program-derived accounts
- **Atomic Transfers**: Winners paid automatically on resolution
- **No Manual Claims**: Eliminates trust requirements

## 🎮 Game Mechanics

### Game States
1. **WaitingForPlayer**: Game created, waiting for opponent
2. **PlayersReady**: Both players joined, ready for commitments
3. **CommitmentsReady**: Both committed, ready for reveals
4. **RevealingPhase**: One player revealed, waiting for other
5. **Resolved**: Game complete, winner paid
6. **Cancelled**: Game cancelled due to timeout

### Timeout Rules
- **Game Creation**: No timeout, can wait indefinitely
- **After Joining**: Players must commit within reasonable time
- **Cancellation**: Available after 1 hour in any non-resolved state
- **Refund**: Bet minus 2% cancellation fee

## 📝 Smart Contract Functions

### Core Instructions

#### `create_game`
- **Purpose**: Initialize new game with bet amount
- **Params**: `game_id`, `bet_amount`
- **Creates**: Game account, Escrow account
- **Transfers**: Bet amount to escrow

#### `join_game`
- **Purpose**: Second player joins existing game
- **Validates**: Bet amount matches
- **Transfers**: Bet amount to escrow
- **Updates**: Game status to PlayersReady

#### `make_commitment`
- **Purpose**: Submit encrypted choice
- **Params**: `commitment` (32-byte hash)
- **Validates**: Player is in game, hasn't committed
- **Updates**: Stores commitment, checks if both ready

#### `reveal_choice`
- **Purpose**: Reveal choice and trigger resolution
- **Params**: `choice` (Heads/Tails), `secret`
- **Validates**: Commitment matches hash(choice + secret)
- **Auto-Resolves**: If second reveal, determines winner

#### `cancel_game`
- **Purpose**: Cancel stuck games after timeout
- **Validates**: 1 hour has passed
- **Refunds**: Bet minus 2% fee to each player
- **Transfers**: Cancellation fees to house

## 🖥️ Frontend Implementation

### Key Components

#### `LobbyPage`
- Browse active games
- Create new games
- Quick bet presets
- Real-time game discovery

#### `GameRoomPage`
- Game state visualization
- Commit/Reveal interface
- Real-time updates
- Auto-resolution display

#### `AboutPage`
- Comprehensive rules
- How to play guide
- FAQs
- Technical details

#### `StatsPage`
- Personal statistics
- Win/loss tracking
- Profit/loss analysis
- Game history

### State Management
- **Wallet State**: @solana/wallet-adapter-react
- **Game State**: Custom React hooks (useFairCoinFlipper)
- **Real-time Updates**: Polling blockchain for changes

## 🚀 Deployment & Testing

### Smart Contract Deployment
1. Deploy via Solana Playground
2. Initialize with house wallet
3. Verify program executable
4. Test all game flows

### Frontend Deployment
1. Update Program ID in config
2. Set correct RPC endpoints
3. Build production bundle
4. Deploy to hosting service

### Testing Checklist
- [ ] Create game flow
- [ ] Join game flow
- [ ] Commit-reveal cycle
- [ ] Auto-resolution
- [ ] Winner payout verification
- [ ] House fee collection
- [ ] Tie-breaker scenario
- [ ] Cancellation after timeout

## 📊 Current Statistics

### Deployment Info
- **Deployed**: September 2025
- **Network**: Solana Devnet
- **Status**: Active and Operational

### Configuration
```javascript
{
  programId: "7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6",
  houseWallet: "5FaU7dgFgghJ437ScyqUXtExmn1SGpEkm9NYriZocp7Q",
  houseFeePercentage: 7,
  cancellationFeePercentage: 2,
  minBet: 0.01,
  maxBet: 100
}
```

## 🔧 Maintenance & Updates

### Regular Tasks
- Monitor house wallet balance
- Check for stuck games
- Verify RPC endpoint health
- Review error logs

### Future Enhancements
- [ ] Backend server for enhanced features
- [ ] Database integration (Neon)
- [ ] Tournament mode
- [ ] Leaderboards
- [ ] Achievement system
- [ ] Mobile app

## 📚 Additional Resources

### Links
- **Smart Contract**: [View on Solana Explorer](https://explorer.solana.com/address/7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6?cluster=devnet)
- **Source Code**: [GitHub Repository](#)
- **Documentation**: [This Document]

### Support
- **Issues**: Report via GitHub Issues
- **Questions**: Community Discord
- **Updates**: Follow on Twitter

## ⚖️ Legal & Compliance

### Disclaimers
- Gambling regulations vary by jurisdiction
- Users responsible for local law compliance
- Platform provides technology only
- No guarantee of profits

### Terms of Service
- Fair play required
- No exploitation of bugs
- Respect other players
- Report issues responsibly

---

**Last Updated**: September 2025
**Version**: 1.0.0
**Status**: Production Ready on Devnet