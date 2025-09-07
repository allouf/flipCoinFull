import { PublicKey } from '@solana/web3.js';

/**
 * Truncate a Solana address for display purposes
 * @param address - The address to truncate (string or PublicKey)
 * @param startChars - Number of characters to show at the start (default: 4)
 * @param endChars - Number of characters to show at the end (default: 4)
 * @returns Truncated address string
 */
export const truncateAddress = (
  address: string | PublicKey | null | undefined,
  startChars = 4,
  endChars = 4,
): string => {
  if (!address) return 'Unknown';

  const addressString = typeof address === 'string' ? address : address.toString();

  if (addressString.length <= startChars + endChars) {
    return addressString;
  }

  return `${addressString.slice(0, startChars)}...${addressString.slice(-endChars)}`;
};

/**
 * Validate if a string is a valid Solana address
 * @param address - The address to validate
 * @returns Boolean indicating if the address is valid
 */
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Copy address to clipboard and return success status
 * @param address - The address to copy
 * @returns Promise<boolean> - Success status
 */
export const copyAddressToClipboard = async (
  address: string | PublicKey | null | undefined,
): Promise<boolean> => {
  if (!address) return false;

  const addressString = typeof address === 'string' ? address : address.toString();

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(addressString);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = addressString;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error('Failed to copy address to clipboard:', error);
    return false;
  }
};

/**
 * Format address for different display contexts
 * @param address - The address to format
 * @param context - The display context
 * @returns Formatted address string
 */
export const formatAddress = (
  address: string | PublicKey | null | undefined,
  context: 'short' | 'medium' | 'long' | 'full' = 'short',
): string => {
  if (!address) return 'Unknown';

  const addressString = typeof address === 'string' ? address : address.toString();

  switch (context) {
    case 'short':
      return truncateAddress(addressString, 4, 4);
    case 'medium':
      return truncateAddress(addressString, 6, 6);
    case 'long':
      return truncateAddress(addressString, 8, 8);
    case 'full':
      return addressString;
    default:
      return truncateAddress(addressString, 4, 4);
  }
};

/**
 * Get explorer URL for an address
 * @param address - The address to get URL for
 * @param network - The Solana network
 * @returns Explorer URL string
 */
export const getAddressExplorerUrl = (
  address: string | PublicKey | null | undefined,
  network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet',
): string => {
  if (!address) return '#';

  const addressString = typeof address === 'string' ? address : address.toString();
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;

  return `https://explorer.solana.com/account/${addressString}${cluster}`;
};

/**
 * Component for displaying a copyable address
 */
export interface AddressDisplayProps {
  address: string | PublicKey | null | undefined;
  context?: 'short' | 'medium' | 'long' | 'full';
  showCopy?: boolean;
  className?: string;
  network?: 'devnet' | 'testnet' | 'mainnet-beta';
}

/**
 * Hook for address-related operations
 */
export const useAddress = (address: string | PublicKey | null | undefined) => {
  const copyToClipboard = async () => copyAddressToClipboard(address);

  const getExplorerUrl = (network: 'devnet' | 'testnet' | 'mainnet-beta' = 'devnet') => getAddressExplorerUrl(address, network);

  const format = (context: 'short' | 'medium' | 'long' | 'full' = 'short') => formatAddress(address, context);

  const isValid = () => {
    if (!address) return false;
    const addressString = typeof address === 'string' ? address : address.toString();
    return isValidSolanaAddress(addressString);
  };

  return {
    copyToClipboard,
    getExplorerUrl,
    format,
    isValid,
    address: address ? (typeof address === 'string' ? address : address.toString()) : null,
  };
};
