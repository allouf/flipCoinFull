/**
 * IndexedDB Storage for Commitments
 * Stores secrets locally on user's device only
 * More reliable than localStorage (doesn't clear as easily)
 */

const DB_NAME = 'CoinFlipperDB';
const DB_VERSION = 1;
const STORE_NAME = 'commitments';

export interface CommitmentData {
  roomId: number;
  walletAddress: string;
  choice: 'heads' | 'tails';
  choiceNum: number;
  secret: string;
  commitment: number[];
  timestamp: number;
  created_at?: string;  // Optional for compatibility with commitmentService
  revealed?: boolean;   // Optional for compatibility with commitmentService
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: ['walletAddress', 'roomId'] });
          objectStore.createIndex('roomId', 'roomId', { unique: false });
          objectStore.createIndex('walletAddress', 'walletAddress', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Created IndexedDB object store');
        }
      };
    });
  }

  /**
   * Store commitment locally (client-side only)
   */
  async storeCommitment(data: CommitmentData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const commitment = {
        ...data,
        timestamp: Date.now(),
      };

      const request = store.put(commitment);

      request.onsuccess = () => {
        console.log(`✅ Commitment stored locally for room ${data.roomId}`);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to store commitment:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get commitment for a specific room and wallet
   */
  async getCommitment(walletAddress: string, roomId: number): Promise<CommitmentData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.get([walletAddress, roomId]);

      request.onsuccess = () => {
        const result = request.result as CommitmentData | undefined;
        if (result) {
          console.log(`✅ Retrieved commitment for room ${roomId}`);
        } else {
          console.log(`⚠️ No commitment found for room ${roomId}`);
        }
        resolve(result || null);
      };

      request.onerror = () => {
        console.error('❌ Failed to retrieve commitment:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all commitments for a wallet
   */
  async getAllCommitments(walletAddress: string): Promise<CommitmentData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('walletAddress');

      const request = index.getAll(walletAddress);

      request.onsuccess = () => {
        const results = request.result as CommitmentData[];
        console.log(`✅ Retrieved ${results.length} commitments for wallet`);
        resolve(results);
      };

      request.onerror = () => {
        console.error('❌ Failed to retrieve commitments:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a commitment after it's revealed
   */
  async deleteCommitment(walletAddress: string, roomId: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete([walletAddress, roomId]);

      request.onsuccess = () => {
        console.log(`✅ Deleted commitment for room ${roomId}`);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to delete commitment:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all commitments (for testing/reset)
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ Cleared all commitments');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to clear commitments:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const indexedDBStorage = new IndexedDBStorage();

// Initialize on module load
indexedDBStorage.init().catch((error) => {
  console.error('Failed to initialize IndexedDB:', error);
  console.log('⚠️ Falling back to localStorage only');
});