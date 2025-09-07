# Real-time Game Updates Implementation

## Overview

This document outlines the implementation of the real-time game updates system for the Solana Coin Flipper game. The system provides instant notifications of game events, cross-tab synchronization, and optimistic UI updates.

## Architecture

### Core Services

1. **WebSocketManager** (`src/services/WebSocketManager.ts`)
   - Singleton class for managing WebSocket connections
   - Features: Auto-reconnection, message queuing, heartbeat mechanism
   - Events: Connection status, game events, room updates

2. **EventSubscriptionManager** (`src/services/EventSubscriptionManager.ts`)
   - Manages Solana program account subscriptions
   - Features: Event filtering, parsing with Anchor IDL, deduplication
   - Subscribes to game room accounts and program-wide events

3. **SyncManager** (`src/services/SyncManager.ts`)
   - Handles cross-tab synchronization using BroadcastChannel API
   - Features: Leader election, state sharing, connection coordination
   - Ensures only one tab manages the WebSocket connection

### React Components

1. **GameRoomLive** (`src/components/GameRoomLive.tsx`)
   - Wrapper that adds real-time capabilities to game rooms
   - Features: Live player status, optimistic updates, rollback on failure
   - Props: roomId, playerId, event handlers

2. **LiveGameFeed** (`src/components/LiveGameFeed.tsx`)
   - Shows real-time feed of completed games
   - Features: Smooth animations, expandable details, transaction links
   - Configurable: max games, auto-scroll, animations

3. **ConnectionStatus** (`src/components/ConnectionStatus.tsx`)
   - Displays WebSocket connection health
   - Features: Status indicator, detailed metrics, manual reconnect
   - Shows: connection status, latency, uptime, tab role

4. **LivePlayerStatus** (`src/components/LivePlayerStatus.tsx`)
   - Shows opponent status in real-time
   - Features: Online status, selection indicators, avatars
   - Updates: instant status changes with animations

### Custom Hooks

1. **useRealTimeGameUpdates** (`src/hooks/useRealTimeGameUpdates.ts`)
   - Main hook for subscribing to game events
   - Features: Event subscription, optimistic updates, throttling
   - Methods: subscribe, unsubscribe, sendOptimisticUpdate

2. **useConnectionStatus** (`src/hooks/useConnectionStatus.ts`)
   - Monitors WebSocket connection health
   - Features: Status tracking, metrics collection, manual controls
   - Returns: connected, reconnecting, health metrics

3. **useCrossTabSync** (`src/hooks/useCrossTabSync.ts`)
   - Manages cross-tab state synchronization
   - Features: Leadership tracking, message broadcasting, state sharing
   - Returns: leadership status, tab count, sync methods

## Configuration

### Environment Variables
```env
REACT_APP_WEBSOCKET_URL=ws://localhost:3001
```

### Constants (`src/config/constants.ts`)
- WebSocket configuration (timeouts, intervals)
- Real-time update settings (throttling, caching)
- Cross-tab sync settings (heartbeats, timeouts)

## Installation & Setup

### Dependencies
```json
{
  "broadcast-channel": "^4.20.2",
  "eventemitter3": "^5.0.1",
  "socket.io-client": "^4.5.0",
  "rpc-websockets": "^9.1.3"
}
```

### Integration Steps

1. **Import Components**
   ```typescript
   import { 
     GameRoomLive, 
     LiveGameFeed, 
     ConnectionStatus,
     RealTimeDemo
   } from '../components';
   ```

2. **Use Real-time Hooks**
   ```typescript
   const { subscribe, unsubscribe, sendOptimisticUpdate } = useRealTimeGameUpdates();
   const { connected, reconnecting } = useConnectionStatus();
   const { isLeaderTab, tabCount } = useCrossTabSync();
   ```

3. **Wrap Game Components**
   ```tsx
   <GameRoomLive roomId={roomId} playerId={playerId}>
     <YourGameComponent />
   </GameRoomLive>
   ```

## TODO Items for Complete Implementation

### High Priority
1. **Complete Anchor Integration**
   - Replace placeholder CoinFlipper type with actual generated types
   - Implement proper event parsing using Anchor IDL
   - Add actual discriminator mappings

2. **WebSocket Server Implementation**
   - Set up Socket.io server for custom events
   - Implement room-based event broadcasting
   - Add authentication and rate limiting

3. **Solana Event Processing**
   - Complete account change event parsing
   - Implement event replay for missed events
   - Add proper error handling and recovery

### Medium Priority
4. **Performance Optimizations**
   - Implement virtual scrolling for game feed
   - Add event batching and throttling
   - Optimize React renders with proper memoization

5. **Error Handling & Recovery**
   - Add comprehensive error boundaries
   - Implement graceful degradation
   - Add retry mechanisms for failed operations

6. **Testing & Validation**
   - Add unit tests for all services
   - Add integration tests for real-time flows
   - Add performance benchmarks

### Low Priority
7. **Enhanced Features**
   - Add latency measurement and display
   - Implement connection quality indicators
   - Add offline mode support
   - Add push notification integration

## Usage Examples

### Basic Game Room with Real-time Updates
```tsx
function GameRoom({ roomId }: { roomId: string }) {
  const { publicKey } = useWallet();
  
  return (
    <GameRoomLive 
      roomId={roomId} 
      playerId={publicKey?.toString() || ''}
      onGameEvent={(event) => console.log('Game event:', event)}
      onPlayerJoined={(playerId) => toast.success(`Player ${playerId} joined`)}
      onGameResolved={(result) => toast.success(`Game completed: ${result.winner} won`)}
    >
      <CoinFlipInterface />
    </GameRoomLive>
  );
}
```

### Live Game Feed in Lobby
```tsx
function GameLobby() {
  return (
    <div className="lobby">
      <h2>Recent Games</h2>
      <LiveGameFeed maxGames={20} showAnimation={true} />
      
      <div className="status-bar">
        <ConnectionStatus />
      </div>
    </div>
  );
}
```

### Demo Component
```tsx
import { RealTimeDemo } from '../components';

function DemoPage() {
  return <RealTimeDemo />;
}
```

## Network Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Browser Tab   │    │  WebSocket   │    │   Solana RPC    │
│   (Leader)      │◄──►│   Server     │    │    Endpoint     │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │                    │
         │ BroadcastChannel      │                    │ Account
         │                       │                    │ Subscriptions
         ▼                       ▼                    ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Browser Tab(s)  │    │   Custom     │    │  Program Events │
│ (Followers)     │    │   Events     │    │  & State        │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## Event Flow

1. **Solana Event** → EventSubscriptionManager → WebSocketManager
2. **WebSocket Event** → All Subscribed Components
3. **Cross-tab Sync** → SyncManager → BroadcastChannel → Other Tabs
4. **Optimistic Update** → Immediate UI → Wait for Confirmation → Rollback if Failed

## Security Considerations

- WebSocket authentication (TODO)
- Rate limiting for events (TODO)
- Input validation for all messages
- Secure cross-tab communication
- Protection against replay attacks

## Performance Targets

- Event delivery: < 100ms
- UI update latency: < 50ms
- Memory usage: < 50MB per tab
- CPU usage: < 5% during active gaming
- Network bandwidth: < 1MB/hour per active game

This implementation provides a solid foundation for real-time gaming experiences on Solana while maintaining performance and reliability standards.