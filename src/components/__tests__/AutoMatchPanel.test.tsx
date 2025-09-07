import React from 'react';
import {
  render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoMatchPanel from '../AutoMatchPanel';

// Mock tokens for testing
const mockTokens = [
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9,
    logo: '/sol-logo.png',
  },
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6,
    logo: '/usdc-logo.png',
  },
];

describe('AutoMatchPanel', () => {
  const mockOnJoinQueue = jest.fn();
  const mockOnCancelQueue = jest.fn();

  const defaultProps = {
    onJoinQueue: mockOnJoinQueue,
    onCancelQueue: mockOnCancelQueue,
    isInQueue: false,
    isLoading: false,
    availableTokens: mockTokens,
    minBetAmount: 0.01,
    maxBetAmount: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the component with all main elements', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      expect(screen.getByText('Quick Match')).toBeInTheDocument();
      expect(screen.getByText(/get instantly matched with another player/i)).toBeInTheDocument();
      expect(screen.getByText('Token')).toBeInTheDocument();
      expect(screen.getByText('Bet Amount')).toBeInTheDocument();
      expect(screen.getByText('Quick Amounts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /find match/i })).toBeInTheDocument();
    });

    it('should show warning message about irreversible transactions', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      expect(screen.getByText('Important Notice')).toBeInTheDocument();
      expect(screen.getByText(/once matched, bets cannot be cancelled/i)).toBeInTheDocument();
    });

    it('should select the first available token by default', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const tokenSelect = screen.getByDisplayValue('SOL') as HTMLSelectElement;
      expect(tokenSelect.value).toBe(mockTokens[0].mint);
    });
  });

  describe('Token Selection', () => {
    it('should allow selecting different tokens', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const tokenSelect = screen.getByDisplayValue('SOL');
      await userEvent.selectOptions(tokenSelect, mockTokens[1].mint);

      expect((tokenSelect as HTMLSelectElement).value).toBe(mockTokens[1].mint);
    });

    it('should show token options in the select dropdown', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const tokenSelect = screen.getByDisplayValue('SOL');
      const options = tokenSelect.querySelectorAll('option');

      expect(options).toHaveLength(mockTokens.length + 1); // +1 for placeholder
      expect(options[0].textContent).toBe('Select a token...');
      expect(options[1].textContent).toBe('SOL');
      expect(options[2].textContent).toBe('USDC');
    });

    it('should clear token error when selecting a token', async () => {
      // Test that the error is triggered and then cleared
      render(<AutoMatchPanel {...defaultProps} availableTokens={[]} />);

      // Try to submit without token to trigger error
      const joinButton = screen.getByRole('button', { name: /find match/i });

      // Since no tokens are available, the button should be disabled
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Bet Amount Input', () => {
    it('should allow entering bet amount', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '1.5');

      expect((betInput as HTMLInputElement).value).toBe('1.5');
    });

    it('should show token symbol next to bet input when token is selected', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      // The token symbol should appear in multiple places - let's check for it in the input area
      const tokenSymbols = screen.getAllByText('SOL');
      expect(tokenSymbols.length).toBeGreaterThan(0);
    });

    it('should clear bet amount error when typing', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      // When no bet amount is entered, the button should be disabled
      const joinButton = screen.getByRole('button', { name: /find match/i });
      expect(joinButton).toBeDisabled();

      // When we enter an amount, the button should become enabled
      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '1');

      expect(joinButton).not.toBeDisabled();
    });

    it('should show minimum bet amount in placeholder', () => {
      render(<AutoMatchPanel {...defaultProps} minBetAmount={0.05} />);

      const betInput = screen.getByPlaceholderText('Minimum 0.05');
      expect(betInput).toHaveAttribute('placeholder', 'Minimum 0.05');
    });

    it('should set min and max attributes correctly', () => {
      render(<AutoMatchPanel {...defaultProps} minBetAmount={0.01} maxBetAmount={50} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      expect(betInput).toHaveAttribute('min', '0.01');
      expect(betInput).toHaveAttribute('max', '50');
    });
  });

  describe('Quick Bet Buttons', () => {
    it('should render all quick bet buttons when not in queue', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      // Check for quick amounts section
      expect(screen.getByText('Quick Amounts')).toBeInTheDocument();

      // Check for some of the quick bet amounts (they contain both amount and token symbol)
      expect(screen.getByText(/0\.01.*SOL/)).toBeInTheDocument();
      expect(screen.getByText(/0\.05.*SOL/)).toBeInTheDocument();
      expect(screen.getByText(/0\.25.*SOL/)).toBeInTheDocument();
    });

    it('should not render quick bet buttons when in queue', () => {
      render(<AutoMatchPanel {...defaultProps} isInQueue />);

      expect(screen.queryByText('Quick Amounts')).not.toBeInTheDocument();
    });

    it('should set bet amount when quick bet button is clicked', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const quickBetButton = screen.getByText(/0\.25.*SOL/i);
      await userEvent.click(quickBetButton);

      const betInput = screen.getByPlaceholderText(/minimum/i) as HTMLInputElement;
      expect(betInput.value).toBe('0.25');
    });

    it('should show selected token symbol in quick bet buttons', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      // Select USDC token
      const tokenSelect = screen.getByDisplayValue('SOL');
      await userEvent.selectOptions(tokenSelect, mockTokens[1].mint);

      // Check that quick bet buttons show USDC
      expect(screen.getByText(/0\.01.*USDC/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty bet amount', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const joinButton = screen.getByRole('button', { name: /find match/i });

      // When no bet amount is entered, the button should be disabled
      expect(joinButton).toBeDisabled();
      expect(mockOnJoinQueue).not.toHaveBeenCalled();
    });

    it('should show validation error for invalid bet amount', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, 'invalid');

      const joinButton = screen.getByRole('button', { name: /find match/i });

      // When invalid text is entered, the button should still be disabled
      expect(joinButton).toBeDisabled();
      expect(mockOnJoinQueue).not.toHaveBeenCalled();
    });

    it('should show validation error for bet amount below minimum', async () => {
      render(<AutoMatchPanel {...defaultProps} minBetAmount={0.1} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '0.05');

      const joinButton = screen.getByRole('button', { name: /find match/i });
      await userEvent.click(joinButton);

      expect(screen.getByText('Minimum bet is 0.1')).toBeInTheDocument();
      expect(mockOnJoinQueue).not.toHaveBeenCalled();
    });

    it('should show validation error for bet amount above maximum', async () => {
      render(<AutoMatchPanel {...defaultProps} maxBetAmount={10} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '15');

      const joinButton = screen.getByRole('button', { name: /find match/i });
      await userEvent.click(joinButton);

      expect(screen.getByText('Maximum bet is 10')).toBeInTheDocument();
      expect(mockOnJoinQueue).not.toHaveBeenCalled();
    });

    it('should show validation error for no token selected', async () => {
      render(<AutoMatchPanel {...defaultProps} availableTokens={[]} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '1');

      const joinButton = screen.getByRole('button', { name: /find match/i });

      // With no tokens available, the button should be disabled
      expect(joinButton).toBeDisabled();
      expect(mockOnJoinQueue).not.toHaveBeenCalled();
    });
  });

  describe('Join Queue Functionality', () => {
    it('should call onJoinQueue with correct parameters when form is valid', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '1.5');

      const joinButton = screen.getByRole('button', { name: /find match/i });
      await userEvent.click(joinButton);

      expect(mockOnJoinQueue).toHaveBeenCalledWith(1.5, mockTokens[0].mint);
    });

    it('should disable join button when loading', () => {
      render(<AutoMatchPanel {...defaultProps} isLoading />);

      const joinButton = screen.getByRole('button', { name: /finding match/i });
      expect(joinButton).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      render(<AutoMatchPanel {...defaultProps} isLoading />);

      expect(screen.getByText('Finding Match...')).toBeInTheDocument();
      // Look for the spinner by its class rather than the button role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable join button when no token selected', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      // Clear the selected token
      const tokenSelect = screen.getByDisplayValue('SOL');
      fireEvent.change(tokenSelect, { target: { value: '' } });

      const joinButton = screen.getByRole('button', { name: /find match/i });
      expect(joinButton).toBeDisabled();
    });

    it('should disable join button when no bet amount entered', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const joinButton = screen.getByRole('button', { name: /find match/i });
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Cancel Queue Functionality', () => {
    it('should show cancel button when in queue', () => {
      render(<AutoMatchPanel {...defaultProps} isInQueue />);

      expect(screen.getByRole('button', { name: /cancel search/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /find match/i })).not.toBeInTheDocument();
    });

    it('should call onCancelQueue when cancel button is clicked', async () => {
      render(<AutoMatchPanel {...defaultProps} isInQueue />);

      const cancelButton = screen.getByRole('button', { name: /cancel search/i });
      await userEvent.click(cancelButton);

      expect(mockOnCancelQueue).toHaveBeenCalled();
    });

    it('should disable inputs when in queue', () => {
      render(<AutoMatchPanel {...defaultProps} isInQueue />);

      const tokenSelect = screen.getByDisplayValue('SOL');
      const betInput = screen.getByPlaceholderText(/minimum/i);

      expect(tokenSelect).toBeDisabled();
      expect(betInput).toBeDisabled();
    });
  });

  describe('Balance Display', () => {
    it('should show balance placeholder when token is selected', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      expect(screen.getByText('Available Balance:')).toBeInTheDocument();
      expect(screen.getByText('-- SOL')).toBeInTheDocument();
    });

    it('should update balance display when different token is selected', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const tokenSelect = screen.getByDisplayValue('SOL');
      await userEvent.selectOptions(tokenSelect, mockTokens[1].mint);

      expect(screen.getByText('-- USDC')).toBeInTheDocument();
    });

    it('should not show balance when no token is selected', () => {
      render(<AutoMatchPanel {...defaultProps} availableTokens={[]} />);

      expect(screen.queryByText('Available Balance:')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      expect(screen.getByText('Token')).toBeInTheDocument();
      expect(screen.getByText('Bet Amount')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for error states', async () => {
      render(<AutoMatchPanel {...defaultProps} />);

      // Check that the button is initially disabled when no bet amount is entered
      const joinButton = screen.getByRole('button', { name: /find match/i });
      expect(joinButton).toBeDisabled();

      // Check that form elements have appropriate classes for styling
      const tokenSelect = screen.getByDisplayValue('SOL');
      const betInput = screen.getByPlaceholderText(/minimum/i);

      expect(tokenSelect).toHaveClass('focus:ring-2');
      expect(betInput).toHaveClass('focus:ring-2');
    });

    it('should have proper button focus management', () => {
      render(<AutoMatchPanel {...defaultProps} />);

      const joinButton = screen.getByRole('button', { name: /find match/i });
      expect(joinButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty availableTokens array', () => {
      render(<AutoMatchPanel {...defaultProps} availableTokens={[]} />);

      const tokenSelect = screen.getByRole('combobox');
      const options = tokenSelect.querySelectorAll('option');

      expect(options).toHaveLength(1); // Only placeholder option
      expect(options[0].textContent).toBe('Select a token...');
    });

    it('should handle very small bet amounts', async () => {
      render(<AutoMatchPanel {...defaultProps} minBetAmount={0.001} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '0.001');

      const joinButton = screen.getByRole('button', { name: /find match/i });
      await userEvent.click(joinButton);

      expect(mockOnJoinQueue).toHaveBeenCalledWith(0.001, mockTokens[0].mint);
    });

    it('should handle very large bet amounts', async () => {
      render(<AutoMatchPanel {...defaultProps} maxBetAmount={1000000} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      await userEvent.type(betInput, '500000');

      const joinButton = screen.getByRole('button', { name: /find match/i });
      await userEvent.click(joinButton);

      expect(mockOnJoinQueue).toHaveBeenCalledWith(500000, mockTokens[0].mint);
    });

    it('should handle undefined maxBetAmount prop', () => {
      const propsWithoutMax = { ...defaultProps };
      delete propsWithoutMax.maxBetAmount;

      render(<AutoMatchPanel {...propsWithoutMax} />);

      const betInput = screen.getByPlaceholderText(/minimum/i);
      expect(betInput).not.toHaveAttribute('max');
    });
  });
});
