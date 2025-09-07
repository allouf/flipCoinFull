import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SolanaNetwork } from '../utils/networks';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue?: number;
  logoUri?: string;
}

export interface Transaction {
  signature: string;
  timestamp: string;
  type: 'bet_placed' | 'bet_won' | 'bet_lost' | 'transfer' | 'unknown';
  amount: number;
  status: 'confirmed' | 'pending' | 'failed';
  gameId?: string;
  result?: 'won' | 'lost';
}

interface WalletState {
  // Connection state
  network: SolanaNetwork;
  connectionStatus: ConnectionStatus;
  autoConnect: boolean;
  lastConnectedWallet: string | null;

  // Account data
  walletAddress: string | null;
  balance: number | null;
  tokenBalances: TokenBalance[];
  snsDomain: string | null;

  // Transaction history
  transactions: Transaction[];
  transactionCount: number;

  // Error handling
  lastError: string | null;

  // Actions
  setNetwork: (network: SolanaNetwork) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAutoConnect: (autoConnect: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setLastConnectedWallet: (wallet: string | null) => void;
  setBalance: (balance: number | null) => void;
  setTokenBalances: (balances: TokenBalance[]) => void;
  setSnsDomain: (domain: string | null) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setLastError: (error: string | null) => void;
  clearWalletData: () => void;
  loadPersistedData: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      network: 'devnet',
      connectionStatus: 'disconnected',
      autoConnect: true,
      lastConnectedWallet: null,
      walletAddress: null,
      balance: null,
      tokenBalances: [],
      snsDomain: null,
      transactions: [],
      transactionCount: 0,
      lastError: null,

      // Actions
      setNetwork: (network) => {
        set({ network });
        // Clear cached data when switching networks
        set({
          balance: null,
          tokenBalances: [],
          transactions: [],
          snsDomain: null,
        });
      },

      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

      setAutoConnect: (autoConnect) => set({ autoConnect }),

      setWalletAddress: (walletAddress) => set({ walletAddress }),

      setLastConnectedWallet: (lastConnectedWallet) => set({ lastConnectedWallet }),

      setBalance: (balance) => set({ balance }),

      setTokenBalances: (tokenBalances) => set({ tokenBalances }),

      setSnsDomain: (snsDomain) => set({ snsDomain }),

      setTransactions: (transactions) => set({
        transactions,
        transactionCount: transactions.length,
      }),

      addTransaction: (transaction) => {
        const { transactions } = get();
        const newTransactions = [transaction, ...transactions].slice(0, 50); // Keep last 50
        set({
          transactions: newTransactions,
          transactionCount: newTransactions.length,
        });
      },

      setLastError: (lastError) => set({ lastError }),

      clearWalletData: () => set({
        walletAddress: null,
        balance: null,
        tokenBalances: [],
        snsDomain: null,
        transactions: [],
        transactionCount: 0,
        connectionStatus: 'disconnected',
        lastError: null,
      }),

      loadPersistedData: () => {
        // This function can be called to manually trigger loading persisted data
        // The persist middleware handles this automatically on store initialization
      },
    }),
    {
      name: 'wallet-store',
      partialize: (state) => ({
        network: state.network,
        autoConnect: state.autoConnect,
        lastConnectedWallet: state.lastConnectedWallet,
        // Don't persist sensitive or ephemeral data
      }),
    },
  ),
);
