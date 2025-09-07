import React from 'react';

interface TokenAmountProps {
  amount: number;
  token: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  showSymbol?: boolean;
}

/**
 * Component for displaying token amounts with proper formatting
 */
export const TokenAmount: React.FC<TokenAmountProps> = ({
  amount,
  token,
  className = '',
  prefix = '',
  suffix = '',
  decimals,
  showSymbol = true,
}) => {
  // Determine decimals based on token type
  const getDecimals = (tokenSymbol: string, value: number): number => {
    if (decimals !== undefined) {
      return decimals;
    }

    switch (tokenSymbol.toUpperCase()) {
      case 'SOL':
        return value < 0.001 ? 6 : value < 1 ? 4 : 3;
      case 'USDC':
      case 'USDT':
        return 2;
      case 'BONK':
        return value < 1000 ? 0 : -3; // Show in thousands
      default:
        return value < 0.001 ? 6 : value < 1 ? 4 : 3;
    }
  };

  // Format the amount
  const formatAmount = (value: number, tokenSymbol: string): string => {
    const precision = getDecimals(tokenSymbol, Math.abs(value));

    if (tokenSymbol.toUpperCase() === 'BONK' && precision === -3) {
      // Show BONK in thousands
      return `${(value / 1000).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}K`;
    }

    return value.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  };

  const formattedAmount = formatAmount(amount, token);
  const symbol = showSymbol ? ` ${token.toUpperCase()}` : '';

  return (
    <span className={`font-mono ${className}`}>
      {prefix}
      {formattedAmount}
      {suffix}
      {symbol}
    </span>
  );
};

/**
 * Hook for token formatting utilities
 */
export const useTokenFormatting = () => {
  const formatTokenAmount = (amount: number, token: string, options?: {
    decimals?: number;
    showSymbol?: boolean;
    prefix?: string;
    suffix?: string;
  }): string => {
    const {
      decimals,
      showSymbol = true,
      prefix = '',
      suffix = '',
    } = options || {};

    const getDecimals = (tokenSymbol: string, value: number): number => {
      if (decimals !== undefined) {
        return decimals;
      }

      switch (tokenSymbol.toUpperCase()) {
        case 'SOL':
          return value < 0.001 ? 6 : value < 1 ? 4 : 3;
        case 'USDC':
        case 'USDT':
          return 2;
        case 'BONK':
          return value < 1000 ? 0 : -3;
        default:
          return value < 0.001 ? 6 : value < 1 ? 4 : 3;
      }
    };

    const precision = getDecimals(token, Math.abs(amount));
    let formattedAmount: string;

    if (token.toUpperCase() === 'BONK' && precision === -3) {
      formattedAmount = `${(amount / 1000).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      })}K`;
    } else {
      formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
    }

    const symbol = showSymbol ? ` ${token.toUpperCase()}` : '';
    return `${prefix}${formattedAmount}${suffix}${symbol}`;
  };

  const parseTokenAmount = (amountString: string, token: string): number => {
    // Remove token symbol and whitespace
    const cleanAmount = amountString
      .replace(new RegExp(token.toUpperCase(), 'gi'), '')
      .replace(/[^0-9.-]/g, '');

    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : parsed;
  };

  return {
    formatTokenAmount,
    parseTokenAmount,
  };
};
