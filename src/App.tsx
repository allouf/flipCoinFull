import React, { Suspense } from 'react';
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

// Lazy load pages for code splitting
const LobbyPage = React.lazy(() => import('./pages/LobbyPage').then(m => ({ default: m.LobbyPage })));
const GameRoomPage = React.lazy(() => import('./pages/GameRoomPage').then(m => ({ default: m.GameRoomPage })));
const StatsPage = React.lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));

// Components - Keep MainLayout loaded immediately as it's critical for layout
import { MainLayout } from './components/layout/MainLayout';
import { MobileWalletProvider } from './components/wallet/MobileWalletProvider';

// Wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
      <p className="text-base-content/60">Loading...</p>
    </div>
  </div>
);

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

  const endpoint = process.env.REACT_APP_DEVNET_RPC_URL || process.env.REACT_APP_RPC_ENDPOINT || clusterApiUrl(network);

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
            <MobileWalletProvider>
              <Router>
                <div className="min-h-screen bg-base-100">
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<MainLayout />}>
                        <Route index element={<Navigate to="/lobby" replace />} />
                        <Route path="lobby" element={<LobbyPage />} />
                        <Route path="game/:gameId" element={<GameRoomPage />} />
                        <Route path="stats" element={<StatsPage />} />
                        <Route path="about" element={<AboutPage />} />
                      </Route>
                    </Routes>
                  </Suspense>
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
            </MobileWalletProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}

export default App;
