import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import { GameLobbyPage } from './pages/GameLobbyPage';
import { StatsPage } from './pages/StatsPage';
import { AboutPage } from './pages/AboutPage';

// Components
import { MainLayout } from './components/layout/MainLayout';

// Wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const network = process.env.REACT_APP_NETWORK === 'mainnet-beta'
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet;

  const endpoint = process.env.REACT_APP_RPC_ENDPOINT || clusterApiUrl(network);

  const wallets = React.useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Router>
              <div className="min-h-screen bg-base-100">
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<Navigate to="/lobby" replace />} />
                    <Route path="lobby" element={<GameLobbyPage />} />
                    <Route path="stats" element={<StatsPage />} />
                    <Route path="about" element={<AboutPage />} />
                  </Route>
                </Routes>
                <Toaster
                  position="bottom-right"
                  toastOptions={{
                    duration: 5000,
                    style: {
                      background: 'var(--fallback-b1,oklch(var(--b1)/1))',
                      color: 'var(--fallback-bc,oklch(var(--bc)/1))',
                      border: '1px solid var(--fallback-b3,oklch(var(--b3)/1))',
                    },
                  }}
                />
              </div>
            </Router>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}

export default App;
