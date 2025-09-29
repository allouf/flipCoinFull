const express = require('express');
const { PrismaClient } = require('../src/generated/prisma');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory fallback storage
const memoryStorage = new Map();
let isDatabaseAvailable = false;

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    isDatabaseAvailable = true;
    return true;
  } catch (error) {
    console.log('⚠️ Database connection failed, using in-memory storage:', error.message);
    isDatabaseAvailable = false;
    return false;
  }
}

// Initialize database connection test
testDatabaseConnection();

// Store a commitment
router.post('/commitments', async (req, res) => {
  const { walletAddress, roomId, choice, secret, commitment } = req.body;

  if (!walletAddress || !roomId || !choice || !secret || !commitment) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['walletAddress', 'roomId', 'choice', 'secret', 'commitment']
    });
  }

  const choiceNum = choice === 'heads' ? 0 : 1;
  const commitmentData = {
    walletAddress,
    roomId: BigInt(roomId),
    choice,
    choiceNum,
    secret,
    commitment: JSON.stringify(commitment), // Store as JSON string
    createdAt: new Date(),
    revealed: false
  };

  try {
    if (isDatabaseAvailable) {
      // Try database first
      const result = await prisma.playerCommitment.create({
        data: commitmentData
      });

      console.log(`✅ Stored commitment in database for ${walletAddress} in room ${roomId}`);
      res.json({
        success: true,
        message: 'Commitment stored successfully',
        storage: 'database',
        id: result.id
      });
    } else {
      throw new Error('Database not available');
    }
  } catch (error) {
    // Fallback to memory storage
    const key = `${walletAddress}:${roomId}`;
    memoryStorage.set(key, {
      ...commitmentData,
      id: `mem_${Date.now()}_${Math.random()}`
    });

    console.log(`✅ Stored commitment in memory for ${walletAddress} in room ${roomId}`);
    res.json({
      success: true,
      message: 'Commitment stored successfully',
      storage: 'memory',
      warning: 'Database unavailable, using temporary storage'
    });
  }
});

// Retrieve a commitment
router.get('/commitments/:walletAddress/:roomId', async (req, res) => {
  const { walletAddress, roomId } = req.params;

  try {
    if (isDatabaseAvailable) {
      // Try database first
      const commitment = await prisma.playerCommitment.findUnique({
        where: {
          walletAddress_roomId: {
            walletAddress,
            roomId: BigInt(roomId)
          }
        }
      });

      if (commitment) {
        console.log(`✅ Retrieved commitment from database for ${walletAddress} in room ${roomId}`);
        return res.json({
          success: true,
          commitment: {
            ...commitment,
            commitment: JSON.parse(commitment.commitment) // Parse JSON string back to array
          }
        });
      }
    }

    // Fallback to memory storage
    const key = `${walletAddress}:${roomId}`;
    const commitment = memoryStorage.get(key);

    if (!commitment) {
      console.log(`❌ No commitment found for ${walletAddress} in room ${roomId}`);
      return res.status(404).json({
        error: 'Commitment not found',
        walletAddress,
        roomId
      });
    }

    console.log(`✅ Retrieved commitment from memory for ${walletAddress} in room ${roomId}`);
    res.json({
      success: true,
      commitment
    });
  } catch (error) {
    console.error('Error retrieving commitment:', error);
    res.status(500).json({
      error: 'Failed to retrieve commitment',
      message: error.message
    });
  }
});

// Get all commitments for a wallet
router.get('/commitments/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    let commitments = [];

    if (isDatabaseAvailable) {
      // Try database first
      const dbCommitments = await prisma.playerCommitment.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' }
      });

      commitments = dbCommitments.map(c => ({
        ...c,
        commitment: JSON.parse(c.commitment) // Parse JSON string back to array
      }));
    }

    // Also check memory storage
    const memoryCommitments = [];
    for (const [key, value] of memoryStorage.entries()) {
      if (key.startsWith(`${walletAddress}:`)) {
        memoryCommitments.push(value);
      }
    }

    // Combine results (database takes precedence)
    const allCommitments = [...commitments, ...memoryCommitments];

    res.json({
      success: true,
      count: allCommitments.length,
      commitments: allCommitments,
      sources: {
        database: commitments.length,
        memory: memoryCommitments.length
      }
    });
  } catch (error) {
    console.error('Error retrieving commitments:', error);
    res.status(500).json({
      error: 'Failed to retrieve commitments',
      message: error.message
    });
  }
});

// Mark commitment as revealed
router.put('/commitments/:walletAddress/:roomId/revealed', async (req, res) => {
  const { walletAddress, roomId } = req.params;

  try {
    if (isDatabaseAvailable) {
      // Try database first
      const updated = await prisma.playerCommitment.update({
        where: {
          walletAddress_roomId: {
            walletAddress,
            roomId: BigInt(roomId)
          }
        },
        data: { revealed: true }
      });

      if (updated) {
        return res.json({
          success: true,
          message: 'Commitment marked as revealed',
          storage: 'database'
        });
      }
    }

    // Fallback to memory storage
    const key = `${walletAddress}:${roomId}`;
    const commitment = memoryStorage.get(key);

    if (!commitment) {
      return res.status(404).json({
        error: 'Commitment not found'
      });
    }

    commitment.revealed = true;
    memoryStorage.set(key, commitment);

    res.json({
      success: true,
      message: 'Commitment marked as revealed',
      storage: 'memory'
    });
  } catch (error) {
    console.error('Error updating commitment:', error);
    res.status(500).json({
      error: 'Failed to update commitment',
      message: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbCommitments = 0;

  try {
    if (isDatabaseAvailable) {
      await prisma.$connect();
      const count = await prisma.playerCommitment.count();
      dbStatus = 'connected';
      dbCommitments = count;
    }
  } catch (error) {
    dbStatus = 'error';
    isDatabaseAvailable = false;
  }

  res.json({
    status: 'healthy',
    database: {
      status: dbStatus,
      commitments: dbCommitments
    },
    memory: {
      commitments: memoryStorage.size
    },
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = router;