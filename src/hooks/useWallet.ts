import { useCallback, useEffect, useRef } from 'react';
import {
  useWallet as useSolanaWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { useWalletStore } from '@/stores/walletStore';
import { SolanaNetwork } from '@/utils/networks';

export const useWallet = () => {
  const solanaWallet = useSolanaWallet();
  const { connection } = useConnection();
  const {
    network,
    connectionStatus,
    autoConnect,
    lastConnectedWallet,
    walletAddress,
    balance,
    setConnectionStatus,
    setNetwork,
    setWalletAddress,
    setLastConnectedWallet,
    setBalance,
    setLastError,
    clearWalletData,
  } = useWalletStore();

  // Use refs to track fetch state and prevent infinite loops
  const isFetchingBalance = useRef(false);
  const lastFetchAttempt = useRef(0);
  const retryCount = useRef(0);

  // Update wallet address when connection changes
  useEffect(() => {
    if (solanaWallet.publicKey) {
      const address = solanaWallet.publicKey.toString();
      setWalletAddress(address);
      setConnectionStatus('connected');
    } else if (walletAddress && !solanaWallet.connecting) {
      // Wallet was disconnected
      clearWalletData();
    }
  }, [
    solanaWallet.publicKey,
    solanaWallet.connecting,
    walletAddress,
    setWalletAddress,
    setConnectionStatus,
    clearWalletData,
  ]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && lastConnectedWallet && !solanaWallet.connected && !solanaWallet.connecting) {
      setConnectionStatus('connecting');
      solanaWallet.select(lastConnectedWallet as WalletName);
      solanaWallet.connect().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Auto-connect failed:', error);
        setConnectionStatus('error');
        setLastError(error.message);
      });
    }
  }, [
    autoConnect,
    lastConnectedWallet,
    solanaWallet,
    setConnectionStatus,
    setLastError,
  ]);

  // Fetch balance with rate limiting and retry logic
  useEffect(() => {
    const fetchBalance = async () => {
      // Skip if already fetching or rate limited
      if (isFetchingBalance.current) {
        return;
      }

      // Rate limiting: wait at least 5 seconds between attempts
      const now = Date.now();
      const timeSinceLastAttempt = now - lastFetchAttempt.current;
      if (timeSinceLastAttempt < 5000) {
        return;
      }

      if (solanaWallet.publicKey && connection) {
        isFetchingBalance.current = true;
        lastFetchAttempt.current = now;

        try {
          const balanceInLamports = await connection.getBalance(solanaWallet.publicKey);
          const balanceInSol = balanceInLamports / 1e9; // Convert lamports to SOL
          setBalance(balanceInSol);
          retryCount.current = 0; // Reset retry count on success
        } catch (error: any) {
          // Handle rate limiting specifically
          if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
            retryCount.current += 1;
            // Exponential backoff, max 60s
            const backoffDelay = Math.min(5000 * (2 ** retryCount.current), 60000);
            if (retryCount.current <= 3) {
              // Only retry 3 times
              setTimeout(() => {
                isFetchingBalance.current = false;
                fetchBalance();
              }, backoffDelay);
            } else {
              // Stop retrying after 3 attempts
              setLastError('Network is busy. Please refresh the page to try again.');
              retryCount.current = 0;
            }
          } else if (process.env.NODE_ENV === 'development') {
            // Log other errors but don't retry
            console.error('Failed to fetch balance:', error);
          }
        } finally {
          isFetchingBalance.current = false;
        }
      }
    };

    // Only fetch balance when wallet is connected
    if (solanaWallet.publicKey && connection) {
      fetchBalance();
    }

    // Set up periodic balance refresh (every 30 seconds)
    const intervalId = setInterval(() => {
      if (solanaWallet.publicKey && connection && !isFetchingBalance.current) {
        fetchBalance();
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [solanaWallet.publicKey, connection, setBalance, setLastError]);

  const connectWallet = useCallback(async (walletName: WalletName) => {
    try {
      setConnectionStatus('connecting');
      setLastError(null);

      solanaWallet.select(walletName);
      await solanaWallet.connect();

      setLastConnectedWallet(walletName);
      setConnectionStatus('connected');
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Wallet connection failed:', error);
      setConnectionStatus('error');
      setLastError(error.message || 'Failed to connect wallet');
      throw error;
    }
  }, [
    solanaWallet,
    setConnectionStatus,
    setLastConnectedWallet,
    setLastError,
  ]);

  const disconnectWallet = useCallback(async () => {
    try {
      setConnectionStatus('disconnecting');
      await solanaWallet.disconnect();
      clearWalletData();
      // Reset balance fetch state
      isFetchingBalance.current = false;
      retryCount.current = 0;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Wallet disconnection failed:', error);
      setLastError(error.message || 'Failed to disconnect wallet');
      throw error;
    }
  }, [solanaWallet, setConnectionStatus, clearWalletData, setLastError]);

  const switchNetwork = useCallback(async (newNetwork: SolanaNetwork) => {
    try {
      // Reset fetch state when switching networks
      isFetchingBalance.current = false;
      retryCount.current = 0;
      lastFetchAttempt.current = 0;
      setNetwork(newNetwork);
      // Connection will be recreated automatically by WalletProvider
      // Balance will be refetched automatically by useEffect
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Network switch failed:', error);
      setLastError(error.message || 'Failed to switch network');
      throw error;
    }
  }, [setNetwork, setLastError]);

  return {
    // Wallet state
    wallet: solanaWallet.wallet,
    publicKey: solanaWallet.publicKey,
    connected: solanaWallet.connected,
    connecting: solanaWallet.connecting,

    // Store state
    network,
    connectionStatus,
    walletAddress,
    balance,

    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,

    // Raw connection for advanced usage
    connection,
  };
};
