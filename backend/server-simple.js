require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true
}));

app.use(express.json());

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ============================================
// IN-MEMORY STORAGE (Fallback when DB is down)
// ============================================
const playerCommitments = new Map();
const gameHistory = new Map();
const playerStats = new Map();

// ============================================
// REST API ROUTES
// ============================================

// Store a commitment
app.post('/api/commitments', (req, res) => {
  const { walletAddress, roomId, choice, secret, commitment } = req.body;

  if (!walletAddress || !roomId || !choice || !secret || !commitment) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['walletAddress', 'roomId', 'choice', 'secret', 'commitment']
    });
  }

  const key = `${walletAddress}:${roomId}`;
  const choiceNum = choice === 'heads' ? 0 : 1;

  // Store in memory
  playerCommitments.set(key, {
    walletAddress,
    roomId,
    choice,
    choiceNum,
    secret,
    commitment,
    created_at: new Date().toISOString(),
    revealed: false
  });

  console.log(`✅ Stored commitment for ${walletAddress} in room ${roomId}`);

  res.json({
    success: true,
    message: 'Commitment stored successfully',
    storage: 'memory'
  });
});

// Retrieve a commitment
app.get('/api/commitments/:walletAddress/:roomId', (req, res) => {
  const { walletAddress, roomId } = req.params;
  const key = `${walletAddress}:${roomId}`;

  const commitment = playerCommitments.get(key);

  if (!commitment) {
    console.log(`❌ No commitment found for ${walletAddress} in room ${roomId}`);
    return res.status(404).json({
      error: 'Commitment not found',
      walletAddress,
      roomId
    });
  }

  console.log(`✅ Retrieved commitment for ${walletAddress} in room ${roomId}`);

  res.json({
    success: true,
    commitment
  });
});

// Get all commitments for a wallet
app.get('/api/commitments/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const commitments = [];

  for (const [key, value] of playerCommitments.entries()) {
    if (key.startsWith(`${walletAddress}:`)) {
      commitments.push(value);
    }
  }

  res.json({
    success: true,
    count: commitments.length,
    commitments
  });
});

// Mark commitment as revealed
app.put('/api/commitments/:walletAddress/:roomId/revealed', (req, res) => {
  const { walletAddress, roomId } = req.params;
  const key = `${walletAddress}:${roomId}`;

  const commitment = playerCommitments.get(key);
  if (!commitment) {
    return res.status(404).json({
      error: 'Commitment not found'
    });
  }

  commitment.revealed = true;
  playerCommitments.set(key, commitment);

  res.json({
    success: true,
    message: 'Commitment marked as revealed'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    storage: 'memory',
    commitments_stored: playerCommitments.size,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fair Coin Flipper Backend API',
    version: '2.0.0',
    storage: 'in-memory (temporary)',
    endpoints: {
      'POST /api/commitments': 'Store a commitment',
      'GET /api/commitments/:wallet/:roomId': 'Get specific commitment',
      'GET /api/commitments/:wallet': 'Get all commitments for wallet',
      'PUT /api/commitments/:wallet/:roomId/revealed': 'Mark as revealed',
      'GET /api/health': 'Health check'
    }
  });
});

// ============================================
// WEBSOCKET HANDLING
// ============================================
const connectedUsers = new Map();
const gameRooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('identify', (data) => {
    const { walletAddress } = data;
    if (walletAddress) {
      connectedUsers.set(socket.id, {
        walletAddress,
        socketId: socket.id,
        connectedAt: new Date()
      });
      console.log(`User identified: ${walletAddress}`);

      socket.emit('connected', {
        message: 'Successfully connected to game server',
        timestamp: new Date()
      });
    }
  });

  socket.on('subscribe_room', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.join(`room-${roomId}`);
      console.log(`Socket ${socket.id} joined room-${roomId}`);

      if (gameRooms.has(roomId)) {
        socket.emit('room_state', gameRooms.get(roomId));
      }
    }
  });

  socket.on('unsubscribe_room', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.leave(`room-${roomId}`);
      console.log(`Socket ${socket.id} left room-${roomId}`);
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`User disconnected: ${user.walletAddress}`);
      connectedUsers.delete(socket.id);
    } else {
      console.log('Client disconnected:', socket.id);
    }
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Fair Coin Flipper Backend Server     ║
╠════════════════════════════════════════╣
║   🚀 Server running on port ${PORT}       ║
║   💾 Storage: In-Memory (Temporary)    ║
║   🔌 WebSocket: Ready for connections  ║
║   🎮 Game server initialized            ║
║                                         ║
║   ⚠️  WARNING: Using in-memory storage ║
║   Data will be lost on server restart! ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});