import React from 'react';
import {
  render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchNotification from '../MatchNotification';

jest.useFakeTimers();

// Mock the Notification API
const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted' as NotificationPermission),
};

Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
  })),
  configurable: true,
});

Object.defineProperty(window.Notification, 'permission', {
  get: () => mockNotification.permission,
  configurable: true,
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: mockNotification.requestPermission,
  configurable: true,
});

describe('MatchNotification', () => {
  const mockOnAccept = jest.fn();
  const mockOnDecline = jest.fn();
  const mockOnClose = jest.fn();

  const defaultMatchData = {
    roomId: 'room_1234567890_abcdefghi',
    opponent: '7xKxy9UH8PjVkKfrp8YwGmjWjZnSrhER9SWvKEGXqQJL',
    betAmount: 1.5,
    tokenMint: 'So11111111111111111111111111111111111111112',
    autoAcceptTimeout: 10000, // 10 seconds
  };

  const defaultProps = {
    isVisible: true,
    matchData: defaultMatchData,
    onAccept: mockOnAccept,
    onDecline: mockOnDecline,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockNotification.permission = 'granted';
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  describe('Rendering', () => {
    it('should render when visible with match data', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Match Found! 🎉')).toBeInTheDocument();
      expect(screen.getByText('Opponent ready to play')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      render(<MatchNotification {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Match Found! 🎉')).not.toBeInTheDocument();
    });

    it('should not render when match data is not provided', () => {
      render(<MatchNotification {...defaultProps} matchData={undefined} />);

      expect(screen.queryByText('Match Found! 🎉')).not.toBeInTheDocument();
    });

    it('should show modal overlay', () => {
      render(<MatchNotification {...defaultProps} />);

      const overlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Match Details Display', () => {
    it('should display room ID (truncated)', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Room ID:')).toBeInTheDocument();
      expect(screen.getByText('room_1234567...')).toBeInTheDocument();
    });

    it('should display formatted opponent address', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Opponent:')).toBeInTheDocument();
      expect(screen.getByText('7xKx...qQJL')).toBeInTheDocument();
    });

    it('should display bet amount with correct token symbol', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Bet Amount:')).toBeInTheDocument();
      expect(screen.getByText('1.5 SOL')).toBeInTheDocument();
    });

    it('should display total pot calculation', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Total Pot:')).toBeInTheDocument();
      expect(screen.getByText('3.0000 SOL')).toBeInTheDocument();
    });

    it('should display USDC token correctly', () => {
      const usdcMatchData = {
        ...defaultMatchData,
        tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        betAmount: 100,
      };

      render(<MatchNotification {...defaultProps} matchData={usdcMatchData} />);

      expect(screen.getByText('100 USDC')).toBeInTheDocument();
      expect(screen.getByText('200.0000 USDC')).toBeInTheDocument();
    });

    it('should display unknown token as TOKEN', () => {
      const unknownTokenMatchData = {
        ...defaultMatchData,
        tokenMint: 'UnknownTokenMintAddress123456789',
      };

      render(<MatchNotification {...defaultProps} matchData={unknownTokenMatchData} />);

      expect(screen.getByText('1.5 TOKEN')).toBeInTheDocument();
      expect(screen.getByText('3.0000 TOKEN')).toBeInTheDocument();
    });
  });

  describe('Countdown Timer', () => {
    it('should display initial countdown time', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Auto-accepting in:')).toBeInTheDocument();
      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should countdown every second', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('10s')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('7s')).toBeInTheDocument();
    });

    it('should auto-accept when timer reaches zero', () => {
      render(<MatchNotification {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockOnAccept).toHaveBeenCalled();
    });

    it('should show progress bar that fills over time', () => {
      render(<MatchNotification {...defaultProps} />);

      const progressBar = document.querySelector('.bg-orange-500');
      expect(progressBar).toBeInTheDocument();

      // Initially should be at 0%
      expect(progressBar).toHaveStyle('width: 0%');

      // After 5 seconds (50% of 10 seconds), should be at 50%
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(progressBar).toHaveStyle('width: 50%');
    });

    it('should reset timer when visibility changes', () => {
      const { rerender } = render(<MatchNotification {...defaultProps} />);

      // Let some time pass
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText('7s')).toBeInTheDocument();

      // Hide the notification
      rerender(<MatchNotification {...defaultProps} isVisible={false} />);

      // Show it again - timer should reset
      rerender(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should not auto-accept more than once', () => {
      render(<MatchNotification {...defaultProps} />);

      // Run timer to completion twice
      act(() => {
        jest.advanceTimersByTime(10000);
        jest.advanceTimersByTime(10000);
      });

      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button Interactions', () => {
    it('should call onAccept when Accept Now button is clicked', async () => {
      const user = userEvent.setup();
      render(<MatchNotification {...defaultProps} />);

      const acceptButton = screen.getByRole('button', { name: /accept now/i });
      await user.click(acceptButton);

      expect(mockOnAccept).toHaveBeenCalled();
    });

    it('should call onDecline when Decline button is clicked', async () => {
      const user = userEvent.setup();
      render(<MatchNotification {...defaultProps} />);

      const declineButton = screen.getByRole('button', { name: /decline/i });
      await user.click(declineButton);

      expect(mockOnDecline).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<MatchNotification {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: '' }); // Close button has no text, just icon
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable buttons after auto-accept', () => {
      render(<MatchNotification {...defaultProps} />);

      // Run timer to completion
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      const acceptButton = screen.getByRole('button', { name: /accept now/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });

    it('should show visual indication of disabled buttons after auto-accept', () => {
      render(<MatchNotification {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      const acceptButton = screen.getByRole('button', { name: /accept now/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      expect(acceptButton).toHaveClass('disabled:bg-green-800', 'disabled:opacity-50');
      expect(declineButton).toHaveClass('disabled:bg-red-800', 'disabled:opacity-50');
    });
  });

  describe('Notification Integration', () => {
    it('should create browser notification when visible and permission is granted', () => {
      mockNotification.permission = 'granted';
      const NotificationSpy = jest.spyOn(window, 'Notification');

      render(<MatchNotification {...defaultProps} />);

      expect(NotificationSpy).toHaveBeenCalledWith('Match Found!', {
        body: 'Found opponent for 1.5 SOL bet',
        icon: '/favicon.ico',
        requireInteraction: true,
      });

      NotificationSpy.mockRestore();
    });

    it('should not create browser notification when permission is denied', () => {
      mockNotification.permission = 'denied';
      const NotificationSpy = jest.spyOn(window, 'Notification');

      render(<MatchNotification {...defaultProps} />);

      expect(NotificationSpy).not.toHaveBeenCalled();

      NotificationSpy.mockRestore();
    });

    it('should not create browser notification when Notification API is not available', () => {
      // Temporarily remove Notification from window
      const originalNotification = window.Notification;
      // @ts-ignore
      delete window.Notification;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<MatchNotification {...defaultProps} />);

      // Should still log the sound notification
      expect(consoleSpy).toHaveBeenCalledWith('🔊 Match found notification sound');

      // Restore Notification
      window.Notification = originalNotification;
      consoleSpy.mockRestore();
    });

    it('should log sound notification', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<MatchNotification {...defaultProps} />);

      expect(consoleSpy).toHaveBeenCalledWith('🔊 Match found notification sound');

      consoleSpy.mockRestore();
    });
  });

  describe('Warning Message', () => {
    it('should display warning about irreversible transactions', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('Ready to Play?')).toBeInTheDocument();
      expect(screen.getByText(/once accepted, the game cannot be cancelled/i)).toBeInTheDocument();
    });

    it('should show warning icon', () => {
      render(<MatchNotification {...defaultProps} />);

      const warningIcon = document.querySelector('.text-yellow-400');
      expect(warningIcon).toBeInTheDocument();
    });
  });

  describe('Animation and Styling', () => {
    it('should apply animation class to modal', () => {
      render(<MatchNotification {...defaultProps} />);

      const modal = document.querySelector('.animate-pulse-grow');
      expect(modal).toBeInTheDocument();
    });

    it('should inject custom CSS styles', () => {
      render(<MatchNotification {...defaultProps} />);

      const styleElement = document.getElementById('match-notification-styles');
      expect(styleElement).toBeInTheDocument();
      expect(styleElement?.textContent).toContain('@keyframes pulse-grow');
    });

    it('should not inject styles multiple times', () => {
      render(<MatchNotification {...defaultProps} />);
      render(<MatchNotification {...defaultProps} />);

      const styleElements = document.querySelectorAll('#match-notification-styles');
      expect(styleElements).toHaveLength(1);
    });
  });

  describe('Address Formatting', () => {
    it('should format long addresses correctly', () => {
      render(<MatchNotification {...defaultProps} />);

      expect(screen.getByText('7xKx...qQJL')).toBeInTheDocument();
    });

    it('should handle short addresses without formatting', () => {
      const shortAddressData = {
        ...defaultMatchData,
        opponent: 'short123',
      };

      render(<MatchNotification {...defaultProps} matchData={shortAddressData} />);

      expect(screen.getByText('short123')).toBeInTheDocument();
    });
  });

  describe('Timer Cleanup', () => {
    it('should clean up timer when component unmounts', () => {
      const { unmount } = render(<MatchNotification {...defaultProps} />);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clean up timer when match data changes', () => {
      const { rerender } = render(<MatchNotification {...defaultProps} />);

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const newMatchData = { ...defaultMatchData, roomId: 'new_room_id' };
      rerender(<MatchNotification {...defaultProps} matchData={newMatchData} />);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<MatchNotification {...defaultProps} />);

      const acceptButton = screen.getByRole('button', { name: /accept now/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      expect(acceptButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      render(<MatchNotification {...defaultProps} />);

      const acceptButton = screen.getByRole('button', { name: /accept now/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      expect(acceptButton).toHaveClass('focus:ring-2', 'focus:ring-green-500');
      expect(declineButton).toHaveClass('focus:ring-2', 'focus:ring-red-500');
    });

    it('should have proper color contrast', () => {
      render(<MatchNotification {...defaultProps} />);

      const modal = document.querySelector('.bg-white.dark\\:bg-gray-800');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero auto-accept timeout', () => {
      const zeroTimeoutData = { ...defaultMatchData, autoAcceptTimeout: 0 };
      render(<MatchNotification {...defaultProps} matchData={zeroTimeoutData} />);

      expect(screen.getByText('0s')).toBeInTheDocument();

      // Should auto-accept immediately
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockOnAccept).toHaveBeenCalled();
    });

    it('should handle very large bet amounts', () => {
      const largeBetData = { ...defaultMatchData, betAmount: 1000000 };
      render(<MatchNotification {...defaultProps} matchData={largeBetData} />);

      expect(screen.getByText('1000000 SOL')).toBeInTheDocument();
      expect(screen.getByText('2000000.0000 SOL')).toBeInTheDocument();
    });

    it('should handle decimal bet amounts correctly', () => {
      const decimalBetData = { ...defaultMatchData, betAmount: 0.123456 };
      render(<MatchNotification {...defaultProps} matchData={decimalBetData} />);

      expect(screen.getByText('0.123456 SOL')).toBeInTheDocument();
      expect(screen.getByText('0.2469 SOL')).toBeInTheDocument();
    });

    it('should handle missing match data properties gracefully', () => {
      const incompleteData = {
        roomId: 'test-room',
        opponent: '',
        betAmount: 0,
        tokenMint: '',
        autoAcceptTimeout: 5000,
      };

      render(<MatchNotification {...defaultProps} matchData={incompleteData} />);

      expect(screen.getByText('0 TOKEN')).toBeInTheDocument();
      expect(screen.getByText('0.0000 TOKEN')).toBeInTheDocument();
    });
  });
});
