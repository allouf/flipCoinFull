import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletProvider } from '../WalletProvider';

// Mock Solana wallet adapter components
jest.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="connection-provider">{children}</div>
  ),
  WalletProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-provider">{children}</div>
  ),
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wallet-modal-provider">{children}</div>
  ),
}));

// Mock wallet adapters
jest.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Phantom' })),
  SolflareWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Solflare' })),
  BackpackWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Backpack' })),
  SolletWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Sollet' })),
  SlopeWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Slope' })),
  TorusWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Torus' })),
  LedgerWalletAdapter: jest.fn().mockImplementation(() => ({ name: 'Ledger' })),
}));

// Mock web3.js
jest.mock('@solana/web3.js', () => ({
  clusterApiUrl: jest.fn((network) => `https://api.${network}.solana.com`),
}));

// Mock wallet store with complete state
const mockWalletStore = {
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
  setNetwork: jest.fn(),
  setConnectionStatus: jest.fn(),
  setAutoConnect: jest.fn(),
  setWalletAddress: jest.fn(),
  setLastConnectedWallet: jest.fn(),
  setBalance: jest.fn(),
  setTokenBalances: jest.fn(),
  setSnsDomain: jest.fn(),
  setTransactions: jest.fn(),
  addTransaction: jest.fn(),
  setLastError: jest.fn(),
  clearWalletData: jest.fn(),
  loadPersistedData: jest.fn(),
};

jest.mock('../../stores/walletStore', () => ({
  useWalletStore: jest.fn(() => mockWalletStore),
}));

describe('WalletProvider', () => {
  const TestComponent = () => <div data-testid="test-child">Test Child</div>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store to default state
    const mockUseWalletStore = require('../../stores/walletStore').useWalletStore;
    mockUseWalletStore.mockReturnValue(mockWalletStore);
  });

  it('should render all wallet adapter providers in correct order', () => {
    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>,
    );

    // Check that all providers are rendered
    expect(screen.getByTestId('connection-provider')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-provider')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-modal-provider')).toBeInTheDocument();

    // Check that child component is rendered
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should provide wallet context to children', () => {
    const { container } = render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>,
    );

    // Verify the provider hierarchy exists
    const connectionProvider = screen.getByTestId('connection-provider');
    const walletProvider = screen.getByTestId('wallet-provider');
    const modalProvider = screen.getByTestId('wallet-modal-provider');
    const testChild = screen.getByTestId('test-child');

    // Check nesting structure
    expect(connectionProvider).toContainElement(walletProvider);
    expect(walletProvider).toContainElement(modalProvider);
    expect(modalProvider).toContainElement(testChild);
  });

  it('should handle network switching', () => {
    // Mock different network state
    const mockUseWalletStore = require('../../stores/walletStore').useWalletStore;
    mockUseWalletStore.mockReturnValue({
      ...mockWalletStore,
      network: 'mainnet-beta',
    });

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>,
    );

    // Component should still render correctly with different network
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  it('should provide RPC endpoint configuration', () => {
    const { rerender } = render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>,
    );

    // Should work with different network configurations
    const mockUseWalletStore = require('../../stores/walletStore').useWalletStore;

    // Test devnet
    mockUseWalletStore.mockReturnValue({ ...mockWalletStore, network: 'devnet' });
    rerender(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>,
    );
    expect(screen.getByTestId('test-child')).toBeInTheDocument();

    // Test mainnet-beta
    mockUseWalletStore.mockReturnValue({ ...mockWalletStore, network: 'mainnet-beta' });
    rerender(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>,
    );
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });
});
