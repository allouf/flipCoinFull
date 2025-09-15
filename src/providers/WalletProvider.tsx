import React, { ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { useWalletStore } from '../stores/walletStore';
import { RPC_ENDPOINTS } from '../config/program';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { network } = useWalletStore();

  // Configure RPC endpoints based on network
  const endpoint = useMemo(() => {
    switch (network) {
      case 'mainnet-beta':
        return process.env.REACT_APP_MAINNET_RPC_URL || RPC_ENDPOINTS.mainnet;
      case 'testnet':
        return process.env.REACT_APP_TESTNET_RPC_URL || RPC_ENDPOINTS.testnet;
      case 'devnet':
      default:
        return process.env.REACT_APP_DEVNET_RPC_URL || RPC_ENDPOINTS.devnet;
    }
  }, [network]);

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 90000,
        wsEndpoint: endpoint.replace('https', 'wss').replace('http', 'ws'),
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
        },
      }}
    >
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(error) => {
          // Silent error handling - log only in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Wallet error:', error);
          }
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
