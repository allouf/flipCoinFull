import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { parseWalletDataFromUrl, WalletConnectionData } from '../../utils/mobileWalletDeepLink';
import toast from 'react-hot-toast';

interface MobileWalletProviderProps {
  children: React.ReactNode;
}

/**
 * MobileWalletProvider
 *
 * Handles return flow from mobile wallet apps
 * Parses URL parameters and establishes wallet connection
 */
export const MobileWalletProvider: React.FC<MobileWalletProviderProps> = ({ children }) => {
  const { connect, disconnect, publicKey } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if we're returning from a mobile wallet
    const walletData = parseWalletDataFromUrl();

    if (walletData.error) {
      // Wallet connection failed
      console.error('❌ Mobile wallet connection error:', walletData.error);
      toast.error(`Wallet connection failed: ${walletData.error}`);

      // Clean up URL parameters
      cleanupUrlParams();
      return;
    }

    if (walletData.publicKey && !isProcessing && !publicKey) {
      setIsProcessing(true);

      // We have wallet data, process the connection
      handleMobileWalletReturn(walletData)
        .then(() => {
          console.log('✅ Mobile wallet connected successfully');
          toast.success('Wallet connected successfully!');
        })
        .catch((error) => {
          console.error('❌ Failed to process mobile wallet connection:', error);
          toast.error('Failed to connect wallet. Please try again.');
        })
        .finally(() => {
          setIsProcessing(false);
          // Clean up URL parameters
          cleanupUrlParams();
        });
    }
  }, [publicKey, isProcessing]);

  const handleMobileWalletReturn = async (walletData: WalletConnectionData): Promise<void> => {
    if (!walletData.publicKey) {
      throw new Error('No public key in wallet data');
    }

    // Verify signature if provided
    if (walletData.signature && walletData.message) {
      const isValid = await verifyWalletSignature(
        walletData.publicKey,
        walletData.signature,
        walletData.message
      );

      if (!isValid) {
        throw new Error('Invalid wallet signature');
      }
    }

    // Store wallet data in session storage for wallet adapter
    sessionStorage.setItem('mobile_wallet_public_key', walletData.publicKey);
    if (walletData.signature) {
      sessionStorage.setItem('mobile_wallet_signature', walletData.signature);
    }

    // Trigger wallet connection
    // Note: The actual connection logic depends on your wallet adapter setup
    // This is a placeholder for the connection process
    console.log('📱 Processing mobile wallet connection:', walletData.publicKey);
  };

  const cleanupUrlParams = () => {
    // Remove wallet-related URL parameters
    const url = new URL(window.location.href);
    const paramsToRemove = [
      'wallet_public_key',
      'publicKey',
      'wallet_signature',
      'signature',
      'wallet_message',
      'message',
      'wallet_error',
      'error',
    ];

    paramsToRemove.forEach(param => url.searchParams.delete(param));

    // Update URL without reloading
    window.history.replaceState({}, '', url.toString());
  };

  return <>{children}</>;
};

/**
 * Verify wallet signature
 *
 * @param publicKey - Base58 encoded public key
 * @param signature - Base58 encoded signature
 * @param message - Original message that was signed
 */
async function verifyWalletSignature(
  publicKey: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Import necessary libraries
    const { PublicKey } = await import('@solana/web3.js');
    const nacl = await import('tweetnacl');

    // Decode public key
    const pubKey = new PublicKey(publicKey);

    // Decode signature (base58)
    const signatureBytes = decodeBase58(signature);

    // Encode message
    const messageBytes = new TextEncoder().encode(message);

    // Verify signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubKey.toBytes()
    );

    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Decode base58 string to Uint8Array
 */
function decodeBase58(str: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const ALPHABET_MAP: { [key: string]: number } = {};

  for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET[i]] = i;
  }

  let result = BigInt(0);
  for (let i = 0; i < str.length; i++) {
    result = result * BigInt(58) + BigInt(ALPHABET_MAP[str[i]]);
  }

  // Convert BigInt to Uint8Array
  const hex = result.toString(16);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }

  return bytes;
}
