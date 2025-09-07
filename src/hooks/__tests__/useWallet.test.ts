import { renderHook, act } from '@testing-library/react';
import { WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '../useWallet';

// Mock Solana wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
  useConnection: jest.fn(),
}));

// Mock Zustand store
jest.mock('../../stores/walletStore', () => ({
  useWalletStore: jest.fn(),
}));

const mockWalletAdapter = require('@solana/wallet-adapter-react');
const mockWalletStore = require('../../stores/walletStore');

describe('useWallet Hook', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockDisconnect = jest.fn().mockResolvedValue(undefined);
  const mockSelect = jest.fn();
  const mockSetNetwork = jest.fn();
  const mockSetConnectionStatus = jest.fn();
  const mockSetLastError = jest.fn();
  const mockSetWalletAddress = jest.fn();
  const mockSetLastConnectedWallet = jest.fn();
  const mockSetBalance = jest.fn();
  const mockClearWalletData = jest.fn();

  const defaultWalletStoreState = {
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
    setNetwork: mockSetNetwork,
    setConnectionStatus: mockSetConnectionStatus,
    setAutoConnect: jest.fn(),
    setLastError: mockSetLastError,
    setWalletAddress: mockSetWalletAddress,
    setLastConnectedWallet: mockSetLastConnectedWallet,
    setBalance: mockSetBalance,
    setTokenBalances: jest.fn(),
    setSnsDomain: jest.fn(),
    setTransactions: jest.fn(),
    addTransaction: jest.fn(),
    clearWalletData: mockClearWalletData,
    loadPersistedData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock wallet adapter hook
    mockWalletAdapter.useWallet.mockReturnValue({
      wallet: null,
      publicKey: null,
      connected: false,
      connecting: false,
      connect: mockConnect.mockReturnValue(Promise.resolve()),
      disconnect: mockDisconnect,
      select: mockSelect,
    });

    // Mock connection
    mockWalletAdapter.useConnection.mockReturnValue({
      connection: {
        rpcEndpoint: 'https://api.devnet.solana.com',
        getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL in lamports
      },
    });

    // Mock wallet store
    mockWalletStore.useWalletStore.mockReturnValue(defaultWalletStoreState);
  });

  it('should return wallet state and connection methods', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current).toMatchObject({
      wallet: null,
      publicKey: null,
      connected: false,
      connecting: false,
      network: 'devnet',
      connectionStatus: 'disconnected',
    });

    expect(typeof result.current.connectWallet).toBe('function');
    expect(typeof result.current.disconnectWallet).toBe('function');
    expect(typeof result.current.switchNetwork).toBe('function');
  });

  it('should handle wallet connection', async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connectWallet('phantom' as WalletName);
    });

    expect(mockSelect).toHaveBeenCalledWith('phantom');
    expect(mockConnect).toHaveBeenCalled();
    expect(mockSetConnectionStatus).toHaveBeenCalledWith('connecting');
  });

  it('should handle wallet disconnection', async () => {
    // Mock connected state
    mockWalletAdapter.useWallet.mockReturnValue({
      wallet: { adapter: { name: 'Phantom' } },
      publicKey: { toString: () => '7xKxy9UH8...9PoL' },
      connected: true,
      connecting: false,
      connect: mockConnect.mockReturnValue(Promise.resolve()),
      disconnect: mockDisconnect,
      select: mockSelect,
    });

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.disconnectWallet();
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockSetConnectionStatus).toHaveBeenCalledWith('disconnecting');
    expect(mockClearWalletData).toHaveBeenCalled();
  });

  it('should handle network switching', async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.switchNetwork('mainnet-beta');
    });

    expect(mockSetNetwork).toHaveBeenCalledWith('mainnet-beta');
  });

  it('should handle connection errors gracefully', async () => {
    mockConnect.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      try {
        await result.current.connectWallet('phantom' as WalletName);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(mockSetConnectionStatus).toHaveBeenCalledWith('error');
    expect(mockSetLastError).toHaveBeenCalled();
  });

  it('should auto-connect on mount when enabled', () => {
    mockWalletStore.useWalletStore.mockReturnValue({
      ...defaultWalletStoreState,
      lastConnectedWallet: 'phantom',
    });

    renderHook(() => useWallet());

    // Should attempt auto-connection
    expect(mockSetConnectionStatus).toHaveBeenCalledWith('connecting');
  });
});
