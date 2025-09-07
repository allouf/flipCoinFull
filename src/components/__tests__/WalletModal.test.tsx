import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { WalletModal } from '../WalletModal';
import { useWallet } from '../../hooks/useWallet';

// Mock the useWallet hook
jest.mock('../../hooks/useWallet');
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// Mock wallet-adapter-react-ui
jest.mock('@solana/wallet-adapter-react-ui', () => ({
  useWalletModal: () => ({
    visible: false,
    setVisible: jest.fn(),
  }),
}));

describe('WalletModal', () => {
  const mockConnectWallet = jest.fn();
  const mockSetVisible = jest.fn();

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
      connectWallet: mockConnectWallet,
      disconnectWallet: jest.fn(),
      switchNetwork: jest.fn(),
      connection: {} as any,
    });
  });

  it('should not render when modal is not visible', () => {
    render(<WalletModal visible={false} onClose={() => {}} />);

    expect(screen.queryByText(/select wallet/i)).not.toBeInTheDocument();
  });

  it('should render wallet selection when modal is visible', () => {
    render(<WalletModal visible onClose={() => {}} />);

    expect(screen.getByText(/select wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/phantom/i)).toBeInTheDocument();
    expect(screen.getByText(/solflare/i)).toBeInTheDocument();
    expect(screen.getByText(/torus/i)).toBeInTheDocument();
    expect(screen.getByText(/ledger/i)).toBeInTheDocument();
  });

  it('should call connectWallet when a wallet is selected', async () => {
    const mockOnClose = jest.fn();
    render(<WalletModal visible onClose={mockOnClose} />);

    const phantomButton = screen.getByRole('button', { name: /phantom/i });
    fireEvent.click(phantomButton);

    await waitFor(() => {
      expect(mockConnectWallet).toHaveBeenCalledWith('phantom');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle wallet connection errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConnectWallet.mockRejectedValue(new Error('User rejected connection'));

    render(<WalletModal visible onClose={() => {}} />);

    const phantomButton = screen.getByRole('button', { name: /phantom/i });
    fireEvent.click(phantomButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to connect to wallet:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('should close modal when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<WalletModal visible onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when clicking outside', () => {
    const mockOnClose = jest.fn();
    render(<WalletModal visible onClose={mockOnClose} />);

    const modal = screen.getByRole('dialog');
    fireEvent.click(modal);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show connecting state for selected wallet', () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      connecting: true,
      wallet: null,
      publicKey: null,
      walletAddress: null,
      balance: null,
      network: 'devnet',
      connectionStatus: 'connecting',
      connectWallet: mockConnectWallet,
      disconnectWallet: jest.fn(),
      switchNetwork: jest.fn(),
      connection: {} as any,
    });

    render(<WalletModal visible onClose={() => {}} />);

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('should disable wallet options during connection', () => {
    mockUseWallet.mockReturnValue({
      connected: false,
      connecting: true,
      wallet: null,
      publicKey: null,
      walletAddress: null,
      balance: null,
      network: 'devnet',
      connectionStatus: 'connecting',
      connectWallet: mockConnectWallet,
      disconnectWallet: jest.fn(),
      switchNetwork: jest.fn(),
      connection: {} as any,
    });

    render(<WalletModal visible onClose={() => {}} />);

    const phantomButton = screen.getByRole('button', { name: /phantom/i });
    expect(phantomButton).toBeDisabled();
  });
});
