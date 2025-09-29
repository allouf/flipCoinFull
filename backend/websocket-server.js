const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://your-production-domain.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// ============================================
// REST API ENDPOINTS FOR COMMITMENT STORAGE
// ============================================

// Store a commitment (called after making a commitment on-chain)
app.post('/api/commitments', (req, res) => {
  const { walletAddress, roomId, choice, secret, commitment } = req.body;

  if (!walletAddress || !roomId || !choice || !secret || !commitment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const key = `${walletAddress}:${roomId}`;

  // Store the commitment data
  playerCommitments.set(key, {
    walletAddress,
    roomId,
    choice,
    secret,
    commitment,
    timestamp: new Date().toISOString()
  });

  console.log(`✅ Stored commitment for ${walletAddress} in room ${roomId}`);

  res.json({
    success: true,
    message: 'Commitment stored successfully',
    key
  });
});

// Retrieve a commitment (called when needing to reveal)
app.get('/api/commitments/:walletAddress/:roomId', (req, res) => {
  const { walletAddress, roomId } = req.params;
  const key = `${walletAddress}:${roomId}`;

  const commitment = playerCommitments.get(key);

  if (!commitment) {
    console.log(`❌ No commitment found for ${walletAddress} in room ${roomId}`);
    return res.status(404).json({
      error: 'Commitment not found',
      key
    });
  }

  console.log(`✅ Retrieved commitment for ${walletAddress} in room ${roomId}`);

  res.json({
    success: true,
    commitment
  });
});

// Get all commitments for a wallet (for debugging/recovery)
app.get('/api/commitments/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const userCommitments = [];

  // Find all commitments for this wallet
  for (const [key, value] of playerCommitments.entries()) {
    if (key.startsWith(`${walletAddress}:`)) {
      userCommitments.push(value);
    }
  }

  res.json({
    success: true,
    count: userCommitments.length,
    commitments: userCommitments
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    commitmentsStored: playerCommitments.size,
    connectedUsers: connectedUsers.size,
    gameRooms: gameRooms.size,
    timestamp: new Date().toISOString()
  });
});

// Store active game rooms and connected users
const gameRooms = new Map();
const connectedUsers = new Map();

// CRITICAL: Store player commitments securely
// This ensures players can always reveal their choices even if they lose localStorage
const playerCommitments = new Map(); // Key: "walletAddress:roomId", Value: {choice, secret, commitment, timestamp}

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user authentication/identification
  socket.on('identify', (data) => {
    const { walletAddress } = data;
    if (walletAddress) {
      connectedUsers.set(socket.id, {
        walletAddress,
        socketId: socket.id,
        connectedAt: new Date()
      });
      console.log(`User identified: ${walletAddress}`);

      // Send initial data
      socket.emit('connected', {
        message: 'Successfully connected to game server',
        timestamp: new Date()
      });
    }
  });

  // Subscribe to specific game room updates
  socket.on('subscribe_room', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.join(`room-${roomId}`);
      console.log(`Socket ${socket.id} joined room-${roomId}`);

      // Send current room state if exists
      if (gameRooms.has(roomId)) {
        socket.emit('room_state', gameRooms.get(roomId));
      }
    }
  });

  // Unsubscribe from game room
  socket.on('unsubscribe_room', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.leave(`room-${roomId}`);
      console.log(`Socket ${socket.id} left room-${roomId}`);
    }
  });

  // Handle game events from blockchain
  socket.on('game_event', (data) => {
    const { type, roomId, ...eventData } = data;

    console.log(`Game event received: ${type} for room ${roomId}`);

    // Update local game state
    if (roomId) {
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {});
      }

      const room = gameRooms.get(roomId);
      Object.assign(room, eventData);

      // Broadcast to all clients in the room
      io.to(`room-${roomId}`).emit('game_update', {
        type,
        roomId,
        ...eventData,
        timestamp: new Date()
      });
    }

    // Broadcast to all clients for lobby updates
    if (['room_created', 'player_joined', 'game_resolved', 'game_cancelled'].includes(type)) {
      io.emit('lobby_update', {
        type,
        roomId,
        ...eventData,
        timestamp: new Date()
      });
    }
  });

  // Handle chat messages in game rooms
  socket.on('send_message', (data) => {
    const { roomId, message } = data;
    const user = connectedUsers.get(socket.id);

    if (user && roomId && message) {
      const chatMessage = {
        from: user.walletAddress,
        message,
        timestamp: new Date()
      };

      // Broadcast to all clients in the room
      io.to(`room-${roomId}`).emit('chat_message', chatMessage);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Clean up user data
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`User disconnected: ${user.walletAddress}`);
      connectedUsers.delete(socket.id);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// REST endpoints for server health and stats
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    connectedClients: connectedUsers.size,
    activeRooms: gameRooms.size,
    uptime: process.uptime()
  });
});

app.get('/stats', (req, res) => {
  res.json({
    connectedUsers: Array.from(connectedUsers.values()).map(user => ({
      walletAddress: user.walletAddress,
      connectedAt: user.connectedAt
    })),
    activeRooms: Array.from(gameRooms.keys()),
    serverTime: new Date()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});