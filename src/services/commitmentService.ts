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
  try {
    console.log(`🔐 Storing commitment LOCALLY for ${data.walletAddress} in room ${data.roomId}`);
    console.log(`🔒 SECRET STAYS ON YOUR DEVICE - Backend cannot see it!`);

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
    try {
      await indexedDBStorage.storeCommitment(commitmentData);
      console.log(`✅ Commitment stored in IndexedDB`);
    } catch (dbError) {
      console.warn('⚠️ IndexedDB failed, using localStorage fallback:', dbError);
    }

    // Always store in localStorage as backup
    const localStorageKey = `commitment_${data.walletAddress}_${data.roomId}`;
    localStorage.setItem(localStorageKey, JSON.stringify(commitmentData));
    console.log(`✅ Commitment also stored in localStorage (backup)`);

    return {
      success: true,
      message: 'Commitment stored locally on your device',
      storage: 'client-side-only',
    };
  } catch (error) {
    console.error(`❌ Failed to store commitment:`, error);
    throw error;
  }
}

/**
 * Retrieve a commitment from LOCAL storage only
 */
export async function getCommitment(walletAddress: string, roomId: number): Promise<CommitmentData | null> {
  try {
    console.log(`🔍 Retrieving commitment LOCALLY for ${walletAddress} in room ${roomId}`);

    // Try IndexedDB first
    try {
      const commitment = await indexedDBStorage.getCommitment(walletAddress, roomId);
      if (commitment) {
        console.log(`✅ Found commitment in IndexedDB`);
        return commitment as CommitmentData;
      }
    } catch (dbError) {
      console.warn('⚠️ IndexedDB read failed, trying localStorage:', dbError);
    }

    // Fallback to localStorage
    const localStorageKey = `commitment_${walletAddress}_${roomId}`;
    const stored = localStorage.getItem(localStorageKey);

    if (!stored) {
      console.log(`⚠️ No commitment found in IndexedDB or localStorage`);
      return null;
    }

    const commitment = JSON.parse(stored);
    console.log(`✅ Retrieved commitment from localStorage`);
    return commitment as CommitmentData;
  } catch (error) {
    console.error(`❌ Failed to retrieve commitment:`, error);
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
  try {
    console.log(`🗑️ Deleting revealed commitment from local storage`);

    // Delete from IndexedDB
    try {
      await indexedDBStorage.deleteCommitment(walletAddress, roomId);
      console.log(`✅ Deleted commitment from IndexedDB`);
    } catch (dbError) {
      console.warn('⚠️ IndexedDB delete failed:', dbError);
    }

    // Delete from localStorage
    const localStorageKey = `commitment_${walletAddress}_${roomId}`;
    localStorage.removeItem(localStorageKey);
    console.log(`✅ Deleted commitment from localStorage`);
  } catch (error) {
    console.error(`❌ Failed to delete commitment:`, error);
    // Don't throw - deletion failure shouldn't block the game
  }
}