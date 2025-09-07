import { act, renderHook } from '@testing-library/react';
import { useWalletStore } from '../walletStore';

// Use the global localStorage mock from setupTests.ts
const mockLocalStorage = window.localStorage as jest.Mocked<typeof localStorage>;

describe('WalletStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset store state
    useWalletStore.setState({
      network: 'devnet',
      connectionStatus: 'disconnected',
      autoConnect: true,
      lastConnectedWallet: null,
      walletAddress: null,
      balance: null,
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWalletStore());

    expect(result.current).toMatchObject({
      network: 'devnet',
      connectionStatus: 'disconnected',
      autoConnect: true,
      lastConnectedWallet: null,
      walletAddress: null,
      balance: null,
    });
  });

  it('should set network and persist to localStorage', () => {
    const { result } = renderHook(() => useWalletStore());

    act(() => {
      result.current.setNetwork('mainnet-beta');
    });

    expect(result.current.network).toBe('mainnet-beta');
    // Zustand persist middleware handles localStorage automatically
    // Check that localStorage.setItem was called with the store key
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('should set connection status', () => {
    const { result } = renderHook(() => useWalletStore());

    act(() => {
      result.current.setConnectionStatus('connecting');
    });

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('should set wallet address', () => {
    const { result } = renderHook(() => useWalletStore());
    const testAddress = '7xKxy9UH8...9PoL';

    act(() => {
      result.current.setWalletAddress(testAddress);
    });

    expect(result.current.walletAddress).toBe(testAddress);
  });

  it('should set last connected wallet', () => {
    const { result } = renderHook(() => useWalletStore());

    act(() => {
      result.current.setLastConnectedWallet('phantom');
    });

    expect(result.current.lastConnectedWallet).toBe('phantom');
  });

  it('should toggle auto-connect', () => {
    const { result } = renderHook(() => useWalletStore());

    act(() => {
      result.current.setAutoConnect(false);
    });

    expect(result.current.autoConnect).toBe(false);
  });

  it('should update balance', () => {
    const { result } = renderHook(() => useWalletStore());

    act(() => {
      result.current.setBalance(5.5);
    });

    expect(result.current.balance).toBe(5.5);
  });

  it('should clear wallet data on disconnect', () => {
    const { result } = renderHook(() => useWalletStore());

    // Set some wallet data first
    act(() => {
      result.current.setWalletAddress('7xKxy9UH8...9PoL');
      result.current.setBalance(5.5);
      result.current.setConnectionStatus('connected');
    });

    // Clear wallet data
    act(() => {
      result.current.clearWalletData();
    });

    expect(result.current).toMatchObject({
      walletAddress: null,
      balance: null,
      connectionStatus: 'disconnected',
    });
  });

  it('should persist data automatically with Zustand middleware', () => {
    const { result } = renderHook(() => useWalletStore());

    // Change some persisted data
    act(() => {
      result.current.setNetwork('mainnet-beta');
      result.current.setAutoConnect(false);
      result.current.setLastConnectedWallet('solflare');
    });

    // Zustand persist middleware should handle localStorage automatically
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });
});
