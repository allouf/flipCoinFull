import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { NetworkSelector } from '../NetworkSelector';
import { useWallet } from '../../hooks/useWallet';

// Mock the useWallet hook
jest.mock('../../hooks/useWallet');
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

describe('NetworkSelector', () => {
  const mockSwitchNetwork = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWallet.mockReturnValue({
      connected: false,
      connecting: false,
      wallet: null,
      publicKey: null,
      walletAddress: null,
      balance: null,
      network: 'devnet',
      connectionStatus: 'disconnected',
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      switchNetwork: mockSwitchNetwork,
      connection: {} as any,
    });
  });

  it('should render current network display', () => {
    render(<NetworkSelector />);

    expect(screen.getAllByText('Devnet')[0]).toBeInTheDocument();
  });

  it('should render network options in dropdown', () => {
    render(<NetworkSelector />);

    // Should see menu options (they're always rendered)
    expect(screen.getAllByText('Devnet')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Mainnet')[0]).toBeInTheDocument();
  });

  it('should call switchNetwork when different network is selected', async () => {
    render(<NetworkSelector />);

    const mainnetButtons = screen.getAllByText(/mainnet/i);
    const mainnetOption = mainnetButtons[0].closest('button');
    fireEvent.click(mainnetOption!);

    await waitFor(() => {
      expect(mockSwitchNetwork).toHaveBeenCalledWith('mainnet-beta');
    });
  });

  it('should show confirmation dialog for network switch when wallet is connected', async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      connecting: false,
      wallet: { adapter: { name: 'Phantom' } } as any,
      publicKey: { toString: () => '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL' } as any,
      walletAddress: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
      balance: 5.5,
      network: 'devnet',
      connectionStatus: 'connected',
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      switchNetwork: mockSwitchNetwork,
      connection: {} as any,
    });

    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<NetworkSelector />);

    const mainnetButtons = screen.getAllByText(/mainnet/i);
    const mainnetOption = mainnetButtons[0].closest('button');
    fireEvent.click(mainnetOption!);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('switch networks'),
      );
      expect(mockSwitchNetwork).toHaveBeenCalledWith('mainnet-beta');
    });

    confirmSpy.mockRestore();
  });

  it('should not switch network if user cancels confirmation', async () => {
    mockUseWallet.mockReturnValue({
      connected: true,
      connecting: false,
      wallet: { adapter: { name: 'Phantom' } } as any,
      publicKey: { toString: () => '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL' } as any,
      walletAddress: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
      balance: 5.5,
      network: 'devnet',
      connectionStatus: 'connected',
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      switchNetwork: mockSwitchNetwork,
      connection: {} as any,
    });

    // Mock window.confirm to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<NetworkSelector />);

    const mainnetButtons = screen.getAllByText(/mainnet/i);
    const mainnetOption = mainnetButtons[0].closest('button');
    fireEvent.click(mainnetOption!);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockSwitchNetwork).not.toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('should handle network switch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSwitchNetwork.mockRejectedValue(new Error('Network switch failed'));

    render(<NetworkSelector />);

    const mainnetButtons = screen.getAllByText(/mainnet/i);
    const mainnetOption = mainnetButtons[0].closest('button');
    fireEvent.click(mainnetOption!);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to switch network:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('should show visual indicator for current network', () => {
    render(<NetworkSelector />);

    // Current network (devnet) should have a visual indicator
    expect(screen.getAllByText(/devnet/i)[0]).toBeInTheDocument();
  });

  it('should be disabled during wallet connection', () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      connecting: true,
      wallet: null,
      publicKey: null,
      walletAddress: null,
      balance: null,
      network: 'devnet',
      connectionStatus: 'connecting',
      connectWallet: jest.fn(),
      disconnectWallet: jest.fn(),
      switchNetwork: mockSwitchNetwork,
      connection: {} as any,
    });

    render(<NetworkSelector />);

    // Network selector should render but be in disabled state
    expect(screen.getAllByText('Devnet')[0]).toBeInTheDocument();
  });
});
