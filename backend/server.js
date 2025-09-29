require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
let dbModule;
try {
  dbModule = require('./database/db'); // Try PostgreSQL first
} catch (error) {
  console.log('PostgreSQL module not available, will try SQLite fallback');
}
const commitmentsAPI = require('./api/commitments');

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:3010',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:3010',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ============================================
// REST API ROUTES
// ============================================
app.use('/api', commitmentsAPI);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fair Coin Flipper Backend API',
    version: '2.0.0',
    endpoints: {
      'POST /api/commitments': 'Store a commitment',
      'GET /api/commitments/:wallet/:roomId': 'Get specific commitment',
      'GET /api/commitments/:wallet': 'Get all commitments for wallet',
      'PUT /api/commitments/:wallet/:roomId/revealed': 'Mark commitment as revealed',
      'GET /api/stats/:wallet': 'Get player statistics',
      'GET /api/leaderboard': 'Get top players',
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

  // Handle user identification
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

  // Subscribe to game room
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

  // Unsubscribe from game room
  socket.on('unsubscribe_room', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.leave(`room-${roomId}`);
      console.log(`Socket ${socket.id} left room-${roomId}`);
    }
  });

  // Handle game events
  socket.on('game_event', (data) => {
    const { type, roomId, ...eventData } = data;
    console.log(`Game event: ${type} for room ${roomId}`);

    if (roomId) {
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {});
      }

      const room = gameRooms.get(roomId);
      Object.assign(room, eventData);

      // Broadcast to room
      io.to(`room-${roomId}`).emit('game_update', {
        type,
        roomId,
        ...eventData,
        timestamp: new Date()
      });
    }

    // Broadcast lobby updates
    if (['room_created', 'player_joined', 'game_resolved'].includes(type)) {
      io.emit('lobby_update', {
        type,
        roomId,
        ...eventData,
        timestamp: new Date()
      });
    }
  });

  // Clean up on disconnect
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
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================
async function startServer() {
  try {
    let dbStatus = 'Not connected';

    // Try to initialize database (non-blocking if it fails)
    try {
      console.log('🔄 Attempting to connect to Neon PostgreSQL...');
      if (dbModule && dbModule.initializeDatabase) {
        await dbModule.initializeDatabase();
        dbStatus = 'Connected to Neon PostgreSQL';
        console.log('✅ PostgreSQL database connected successfully');
      }
    } catch (dbError) {
      console.warn('⚠️  PostgreSQL connection failed, trying SQLite fallback...');
      console.warn('   ', dbError.message);

      // Try SQLite fallback
      try {
        const sqliteDb = require('./database/sqlite-db');
        dbStatus = 'Connected to SQLite (local file)';
        console.log('✅ SQLite database initialized successfully');
      } catch (sqliteError) {
        console.error('❌ SQLite fallback also failed:', sqliteError.message);
        dbStatus = 'Offline (no database available)';
      }
    }

    // Start server regardless of database status
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   Fair Coin Flipper Backend Server     ║
╠════════════════════════════════════════╣
║   🚀 Server running on port ${PORT}       ║
║   📊 Database: ${dbStatus.padEnd(26)}║
║   🔌 WebSocket: Ready for connections   ║
║   🎮 Game server initialized            ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

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