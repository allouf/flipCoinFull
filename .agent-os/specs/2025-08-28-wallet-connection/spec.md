# Spec Requirements Document

> Spec: Wallet Connection System
> Created: 2025-08-28

## Overview

Implement a comprehensive wallet connection system that supports multiple Solana wallets, displays account information, and maintains persistent connections across sessions. This feature enables users to connect their crypto wallets to participate in betting games while providing full visibility into their account status and transaction history.

## User Stories

### New User Wallet Connection

As a first-time user, I want to easily connect my Solana wallet, so that I can start betting with my crypto holdings.

The user clicks "Connect Wallet" button, sees a modal with all supported wallet options (Phantom, Solflare, Backpack, Sollet, Slope, etc.). After selecting their wallet, they approve the connection request in their wallet extension. The app then displays their truncated address, SOL balance, and any SPL token balances. The connection persists across page refreshes, and they can switch between Devnet and Mainnet as needed for testing or production betting.

### Returning User Auto-Connection

As a returning player, I want my wallet to automatically reconnect when I revisit the site, so that I can immediately resume betting without re-authentication.

When the user returns to the platform, the app checks localStorage for previous wallet connection data. If found and valid, it automatically attempts to reconnect to the same wallet and network. The user sees a brief "Reconnecting..." message, then their wallet information appears in the header. If auto-connection fails, they're prompted to manually reconnect with clear error messaging about what went wrong.

### Power User Account Management

As an experienced crypto user, I want to see detailed account information and transaction history, so that I can track my betting activity and manage my funds effectively.

After connecting their wallet, users can click on their truncated address to open an account details panel. This shows their full address (with copy button), SOL balance, all SPL token balances, recent transaction history (last 10 transactions), any connected SNS domain, network status indicator, and current network (Devnet/Mainnet). They can refresh balances manually, switch networks, or disconnect their wallet entirely.

## Spec Scope

1. **Multi-Wallet Support** - Integration with Phantom, Solflare, Backpack, Sollet, Slope, and other major Solana wallets via @solana/wallet-adapter
2. **Network Selection** - Toggle between Solana Devnet and Mainnet-beta with persistent preference storage
3. **Account Information Display** - Show wallet address (truncated), SOL balance, SPL token balances, and SNS domain if available
4. **Transaction History** - Fetch and display recent transactions with links to Solana Explorer
5. **Persistent Connection** - Auto-reconnect on return visits using localStorage session management

## Out of Scope

- Hardware wallet support (Ledger, Trezor)
- Multi-wallet simultaneous connections
- Custom RPC endpoint configuration UI
- Wallet creation/recovery features
- Cross-chain wallet support (only Solana)

## Expected Deliverable

1. Functional wallet connection with at least 5 supported wallet providers, tested on both Devnet and Mainnet
2. Persistent auto-reconnection that works across browser sessions with proper error recovery
3. Complete account information panel showing balances, transaction history, and network status with real-time updates