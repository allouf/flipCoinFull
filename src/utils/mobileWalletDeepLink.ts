/**
 * Mobile Wallet Deep Link Utilities
 *
 * Generates deep links for Phantom and Solflare mobile wallets
 * Handles wallet connection flow on mobile devices
 */

import { isIOS, isAndroid } from './mobileDetection';

export type WalletType = 'phantom' | 'solflare';

interface DeepLinkConfig {
  /** The current page URL to return to after wallet interaction */
  returnUrl: string;
  /** Optional cluster (mainnet-beta or devnet) */
  cluster?: 'mainnet-beta' | 'devnet';
}

/**
 * Generate Phantom mobile wallet deep link
 *
 * Phantom Mobile Deep Link Structure:
 * - iOS: phantom://browse/<encoded_url>
 * - Android: https://phantom.app/ul/browse/<encoded_url>
 */
export const getPhantomMobileUrl = (config: DeepLinkConfig): string => {
  const { returnUrl, cluster = 'devnet' } = config;

  // Encode the return URL
  const encodedUrl = encodeURIComponent(returnUrl);

  // Add cluster parameter
  const urlWithCluster = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}cluster=${cluster}`;
  const encodedUrlWithCluster = encodeURIComponent(urlWithCluster);

  if (isIOS()) {
    // iOS deep link
    return `phantom://browse/${encodedUrlWithCluster}`;
  } else if (isAndroid()) {
    // Android universal link
    return `https://phantom.app/ul/browse/${encodedUrlWithCluster}`;
  }

  // Fallback (shouldn't reach here on mobile)
  return returnUrl;
};

/**
 * Generate Solflare mobile wallet deep link
 *
 * Solflare Mobile Deep Link Structure:
 * - iOS: solflare://browse/<encoded_url>
 * - Android: https://solflare.com/ul/v1/browse/<encoded_url>
 */
export const getSolflareMobileUrl = (config: DeepLinkConfig): string => {
  const { returnUrl, cluster = 'devnet' } = config;

  // Encode the return URL
  const encodedUrl = encodeURIComponent(returnUrl);

  // Add cluster parameter
  const urlWithCluster = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}cluster=${cluster}`;
  const encodedUrlWithCluster = encodeURIComponent(urlWithCluster);

  if (isIOS()) {
    // iOS deep link
    return `solflare://browse/${encodedUrlWithCluster}`;
  } else if (isAndroid()) {
    // Android universal link
    return `https://solflare.com/ul/v1/browse/${encodedUrlWithCluster}`;
  }

  // Fallback (shouldn't reach here on mobile)
  return returnUrl;
};

/**
 * Get mobile wallet deep link based on wallet type
 */
export const getMobileWalletUrl = (
  walletType: WalletType,
  config: DeepLinkConfig
): string => {
  switch (walletType) {
    case 'phantom':
      return getPhantomMobileUrl(config);
    case 'solflare':
      return getSolflareMobileUrl(config);
    default:
      return config.returnUrl;
  }
};

/**
 * Check if a wallet app is likely installed
 *
 * Note: This is a best-effort check. There's no reliable way to detect
 * if a mobile wallet app is installed without attempting the deep link.
 */
export const isWalletAppInstalled = async (
  walletType: WalletType
): Promise<boolean> => {
  // This is a placeholder. In practice, you would:
  // 1. Attempt the deep link
  // 2. Set a timeout
  // 3. If the page doesn't blur (leave focus), assume app not installed
  // 4. Fall back to app store link

  return new Promise((resolve) => {
    // Simplified check - always assume not installed
    // Real implementation would use visibility/blur events
    resolve(false);
  });
};

/**
 * Get app store link for wallet installation
 */
export const getWalletAppStoreUrl = (walletType: WalletType): string => {
  const storeUrls = {
    phantom: {
      ios: 'https://apps.apple.com/us/app/phantom-solana-wallet/id1598432977',
      android: 'https://play.google.com/store/apps/details?id=app.phantom',
    },
    solflare: {
      ios: 'https://apps.apple.com/us/app/solflare/id1580902717',
      android: 'https://play.google.com/store/apps/details?id=com.solflare.mobile',
    },
  };

  const urls = storeUrls[walletType];

  if (isIOS()) {
    return urls.ios;
  } else if (isAndroid()) {
    return urls.android;
  }

  // Fallback to iOS URL
  return urls.ios;
};

/**
 * Open mobile wallet with fallback to app store
 *
 * This function attempts to open the wallet app. If the app is not installed,
 * it redirects to the app store after a timeout.
 */
export const openMobileWallet = (
  walletType: WalletType,
  config: DeepLinkConfig
): void => {
  const deepLink = getMobileWalletUrl(walletType, config);
  const appStoreUrl = getWalletAppStoreUrl(walletType);

  // Track if we successfully opened the app
  let didOpen = false;

  // Listen for visibility change (app was opened)
  const onVisibilityChange = () => {
    if (document.hidden) {
      didOpen = true;
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);

  // Attempt to open the wallet app
  window.location.href = deepLink;

  // After 1.5 seconds, if the app didn't open, go to app store
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);

    if (!didOpen) {
      // App not installed, redirect to app store
      window.location.href = appStoreUrl;
    }
  }, 1500);
};

/**
 * Parse wallet data from URL parameters (after return from wallet app)
 */
export interface WalletConnectionData {
  publicKey?: string;
  signature?: string;
  message?: string;
  error?: string;
}

export const parseWalletDataFromUrl = (): WalletConnectionData => {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    publicKey: params.get('wallet_public_key') || params.get('publicKey') || undefined,
    signature: params.get('wallet_signature') || params.get('signature') || undefined,
    message: params.get('wallet_message') || params.get('message') || undefined,
    error: params.get('wallet_error') || params.get('error') || undefined,
  };
};
