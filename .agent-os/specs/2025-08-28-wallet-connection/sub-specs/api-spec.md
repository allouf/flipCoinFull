# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-28-wallet-connection/spec.md

## Endpoints

### GET /api/wallet/session

**Purpose:** Retrieve stored wallet session data for auto-reconnection
**Parameters:** 
- `walletAddress` (query): Public key of the wallet
- `network` (query): Current network (devnet/mainnet-beta)
**Response:** 
```json
{
  "success": true,
  "data": {
    "walletAddress": "7xKxy9UH8...9PoL",
    "walletType": "phantom",
    "network": "devnet",
    "lastConnected": "2025-08-28T10:00:00Z",
    "preferences": {
      "autoConnect": true,
      "defaultNetwork": "devnet"
    }
  }
}
```
**Errors:** 
- 404: Session not found
- 400: Invalid wallet address format

### POST /api/wallet/session

**Purpose:** Store wallet session data after successful connection
**Parameters:** 
```json
{
  "walletAddress": "string",
  "walletType": "string",
  "network": "string",
  "preferences": {
    "autoConnect": "boolean",
    "defaultNetwork": "string"
  }
}
```
**Response:** 
```json
{
  "success": true,
  "message": "Session stored successfully"
}
```
**Errors:** 
- 400: Invalid session data
- 500: Storage failure

### DELETE /api/wallet/session/:walletAddress

**Purpose:** Clear stored session data on wallet disconnect
**Parameters:** 
- `walletAddress` (path): Public key to clear
**Response:** 
```json
{
  "success": true,
  "message": "Session cleared"
}
```
**Errors:** 
- 404: Session not found

### GET /api/wallet/transactions/:walletAddress

**Purpose:** Fetch enhanced transaction history with game-specific metadata
**Parameters:** 
- `walletAddress` (path): Wallet public key
- `network` (query): Network to query
- `limit` (query): Number of transactions (default: 10, max: 50)
- `before` (query): Signature for pagination
**Response:** 
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "signature": "3xK7y9...",
        "timestamp": "2025-08-28T10:00:00Z",
        "type": "bet_placed",
        "amount": 0.5,
        "status": "confirmed",
        "gameId": "game_123",
        "result": "won",
        "explorerUrl": "https://explorer.solana.com/tx/..."
      }
    ],
    "hasMore": true,
    "nextCursor": "2yM8x..."
  }
}
```
**Errors:** 
- 400: Invalid parameters
- 429: Rate limit exceeded
- 500: RPC error

### GET /api/wallet/tokens/:walletAddress

**Purpose:** Get SPL token balances with metadata and USD values
**Parameters:** 
- `walletAddress` (path): Wallet public key
- `network` (query): Network to query
**Response:** 
```json
{
  "success": true,
  "data": {
    "sol": {
      "balance": 10.5,
      "usdValue": 525.00
    },
    "tokens": [
      {
        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "symbol": "USDC",
        "name": "USD Coin",
        "balance": 100.50,
        "decimals": 6,
        "usdValue": 100.50,
        "logoUri": "https://..."
      }
    ],
    "totalUsdValue": 625.50
  }
}
```
**Errors:** 
- 400: Invalid wallet address
- 429: Rate limit exceeded
- 500: RPC or price feed error

### GET /api/wallet/domain/:walletAddress

**Purpose:** Resolve SNS/ANS domain names for wallet
**Parameters:** 
- `walletAddress` (path): Wallet public key
**Response:** 
```json
{
  "success": true,
  "data": {
    "domain": "player.sol",
    "verified": true
  }
}
```
**Errors:** 
- 404: No domain found
- 500: SNS resolver error

## WebSocket Events

### Connection Events
- `wallet:connected` - Emitted when wallet connects
- `wallet:disconnected` - Emitted on disconnect
- `wallet:changed` - Emitted when user switches wallet

### Balance Events  
- `balance:updated` - Real-time balance changes
- `transaction:confirmed` - New transaction confirmed
- `token:received` - New token received

## Rate Limiting

- Session endpoints: 10 requests per minute per IP
- Transaction history: 20 requests per minute per wallet
- Token balances: 30 requests per minute per wallet
- WebSocket connections: 1 per wallet address

## Caching Strategy

- Session data: 24 hours client-side cache
- Transaction history: 30 seconds server cache
- Token balances: 10 seconds server cache
- SNS domains: 1 hour server cache