/**
 * Commitment Service - CLIENT-SIDE ONLY Storage
 *
 * SECURITY: Secrets stored ONLY on user's device (IndexedDB + localStorage)
 * Backend never sees the secret or choice - provably fair!
 *
 * Storage Priority:
 * 1. IndexedDB (persistent, large storage)
 * 2. localStorage (fallback, limited storage)
 */

import { indexedDBStorage } from '../utils/indexedDBStorage';
import { debugLogger } from '../utils/debugLogger';

export interface CommitmentData {
  walletAddress: string;
  roomId: number;
  choice: 'heads' | 'tails';
  choiceNum: number;
  secret: string;
  commitment: number[];
  created_at: string;
  revealed: boolean;
}

export interface StoreCommitmentRequest {
  walletAddress: string;
  roomId: number;
  choice: 'heads' | 'tails';
  secret: string;
  commitment: number[];
}

export interface StoreCommitmentResponse {
  success: boolean;
  message: string;
  storage: string;
}

export interface GetCommitmentResponse {
  success: boolean;
  commitment: CommitmentData;
}

/**
 * Store a commitment LOCALLY (client-side only)
 * Backend never sees the secret or choice!
 */
export async function storeCommitment(data: StoreCommitmentRequest): Promise<StoreCommitmentResponse> {
  debugLogger.flowStart('STORE COMMITMENT', {
    walletAddress: data.walletAddress.slice(0, 8) + '...',
    roomId: data.roomId,
    choice: data.choice,
    commitmentHash: Buffer.from(data.commitment).toString('hex').slice(0, 16) + '...'
  });

  try {
    debugLogger.step(1, 'Prepare Commitment Data', {
      walletAddress: data.walletAddress,
      roomId: data.roomId,
      choice: data.choice,
      choiceNum: data.choice === 'heads' ? 0 : 1,
      secretLength: data.secret.length,
      commitmentLength: data.commitment.length,
      storageLocation: 'CLIENT-SIDE ONLY (IndexedDB + localStorage)'
    });

    debugLogger.warning('🔒 SECURITY: Secret NEVER leaves your device!', {
      backend: 'CANNOT see your choice',
      storage: 'IndexedDB (primary) + localStorage (backup)',
      secure: true
    });

    const commitmentData = {
      walletAddress: data.walletAddress,
      roomId: data.roomId,
      choice: data.choice,
      choiceNum: data.choice === 'heads' ? 0 : 1,
      secret: data.secret,
      commitment: data.commitment,
      timestamp: Date.now(),
    };

    // Try IndexedDB first (most reliable)
    debugLogger.step(2, 'Store in IndexedDB (Primary Storage)');
    const startTime = performance.now();
    try {
      await indexedDBStorage.storeCommitment(commitmentData);
      const duration = performance.now() - startTime;
      debugLogger.success(`✅ Commitment stored in IndexedDB`, {
        duration: `${duration.toFixed(2)}ms`,
        size: JSON.stringify(commitmentData).length + ' bytes'
      });
    } catch (dbError) {
      const duration = performance.now() - startTime;
      debugLogger.warning('⚠️  IndexedDB storage failed, using localStorage fallback', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        duration: `${duration.toFixed(2)}ms`
      });
    }

    // Always store in localStorage as backup
    debugLogger.step(3, 'Store in localStorage (Backup Storage)');
    const localStorageKey = `commitment_${data.walletAddress}_${data.roomId}`;
    const startTimeLS = performance.now();
    localStorage.setItem(localStorageKey, JSON.stringify(commitmentData));
    const durationLS = performance.now() - startTimeLS;

    debugLogger.success(`✅ Commitment also stored in localStorage`, {
      key: localStorageKey,
      duration: `${durationLS.toFixed(2)}ms`,
      size: JSON.stringify(commitmentData).length + ' bytes'
    });

    debugLogger.flowSuccess('STORE COMMITMENT', {
      success: true,
      storage: 'client-side-only',
      locations: ['IndexedDB (attempted)', 'localStorage (backup)'],
      walletAddress: data.walletAddress.slice(0, 8) + '...',
      roomId: data.roomId
    });

    return {
      success: true,
      message: 'Commitment stored locally on your device',
      storage: 'client-side-only',
    };
  } catch (error) {
    debugLogger.flowError('STORE COMMITMENT', error, {
      walletAddress: data.walletAddress.slice(0, 8) + '...',
      roomId: data.roomId
    });
    throw error;
  }
}

/**
 * Retrieve a commitment from LOCAL storage only
 */
export async function getCommitment(walletAddress: string, roomId: number): Promise<CommitmentData | null> {
  debugLogger.flowStart('RETRIEVE COMMITMENT', {
    walletAddress: walletAddress.slice(0, 8) + '...',
    roomId,
    searchingIn: ['IndexedDB (primary)', 'localStorage (fallback)']
  });

  try {
    // Try IndexedDB first
    debugLogger.step(1, 'Search in IndexedDB (Primary Storage)');
    const startTime = performance.now();
    try {
      const commitment = await indexedDBStorage.getCommitment(walletAddress, roomId);
      const duration = performance.now() - startTime;

      if (commitment) {
        debugLogger.success(`✅ Found commitment in IndexedDB`, {
          duration: `${duration.toFixed(2)}ms`,
          choice: commitment.choice,
          hasSecret: !!commitment.secret,
          secretLength: commitment.secret?.length,
          timestamp: new Date(commitment.timestamp).toISOString()
        });

        debugLogger.flowSuccess('RETRIEVE COMMITMENT', {
          found: true,
          source: 'IndexedDB',
          roomId,
          choice: commitment.choice
        });

        return commitment as CommitmentData;
      } else {
        debugLogger.warning('⚠️  Commitment not found in IndexedDB', {
          duration: `${duration.toFixed(2)}ms`
        });
      }
    } catch (dbError) {
      const duration = performance.now() - startTime;
      debugLogger.warning('⚠️  IndexedDB read failed, trying localStorage fallback', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        duration: `${duration.toFixed(2)}ms`
      });
    }

    // Fallback to localStorage
    debugLogger.step(2, 'Search in localStorage (Fallback Storage)');
    const localStorageKey = `commitment_${walletAddress}_${roomId}`;
    const startTimeLS = performance.now();
    const stored = localStorage.getItem(localStorageKey);
    const durationLS = performance.now() - startTimeLS;

    if (!stored) {
      debugLogger.warning('⚠️  No commitment found in localStorage either', {
        key: localStorageKey,
        duration: `${durationLS.toFixed(2)}ms`
      });

      debugLogger.flowSuccess('RETRIEVE COMMITMENT', {
        found: false,
        searched: ['IndexedDB', 'localStorage'],
        result: 'Commitment not found'
      });

      return null;
    }

    const commitment = JSON.parse(stored);
    debugLogger.success(`✅ Retrieved commitment from localStorage`, {
      key: localStorageKey,
      duration: `${durationLS.toFixed(2)}ms`,
      choice: commitment.choice,
      hasSecret: !!commitment.secret,
      timestamp: new Date(commitment.timestamp).toISOString()
    });

    debugLogger.flowSuccess('RETRIEVE COMMITMENT', {
      found: true,
      source: 'localStorage (fallback)',
      roomId,
      choice: commitment.choice
    });

    return commitment as CommitmentData;
  } catch (error) {
    debugLogger.flowError('RETRIEVE COMMITMENT', error, {
      walletAddress: walletAddress.slice(0, 8) + '...',
      roomId
    });
    throw error;
  }
}

/**
 * Check if a commitment exists for a player in a specific room
 */
export async function hasCommitment(walletAddress: string, roomId: number): Promise<boolean> {
  try {
    const commitment = await getCommitment(walletAddress, roomId);
    return commitment !== null;
  } catch (error) {
    console.error(`❌ Failed to check commitment existence:`, error);
    return false;
  }
}

/**
 * Mark a commitment as revealed (delete from local storage)
 */
export async function markCommitmentRevealed(walletAddress: string, roomId: number): Promise<void> {
  debugLogger.flowStart('DELETE COMMITMENT', {
    walletAddress: walletAddress.slice(0, 8) + '...',
    roomId,
    reason: 'Commitment revealed - cleanup'
  });

  try {
    // Delete from IndexedDB
    debugLogger.step(1, 'Delete from IndexedDB');
    const startTime = performance.now();
    try {
      await indexedDBStorage.deleteCommitment(walletAddress, roomId);
      const duration = performance.now() - startTime;
      debugLogger.success(`✅ Deleted commitment from IndexedDB`, {
        duration: `${duration.toFixed(2)}ms`
      });
    } catch (dbError) {
      const duration = performance.now() - startTime;
      debugLogger.warning('⚠️  IndexedDB delete failed (non-fatal)', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        duration: `${duration.toFixed(2)}ms`
      });
    }

    // Delete from localStorage
    debugLogger.step(2, 'Delete from localStorage');
    const localStorageKey = `commitment_${walletAddress}_${roomId}`;
    const startTimeLS = performance.now();
    localStorage.removeItem(localStorageKey);
    const durationLS = performance.now() - startTimeLS;

    debugLogger.success(`✅ Deleted commitment from localStorage`, {
      key: localStorageKey,
      duration: `${durationLS.toFixed(2)}ms`
    });

    debugLogger.flowSuccess('DELETE COMMITMENT', {
      success: true,
      deletedFrom: ['IndexedDB', 'localStorage'],
      roomId
    });
  } catch (error) {
    debugLogger.flowError('DELETE COMMITMENT', error, {
      walletAddress: walletAddress.slice(0, 8) + '...',
      roomId,
      note: 'Deletion failure is non-fatal - game can continue'
    });
    // Don't throw - deletion failure shouldn't block the game
  }
}