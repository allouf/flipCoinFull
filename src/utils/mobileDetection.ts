/**
 * Mobile Detection Utilities
 *
 * Detects mobile browsers and operating systems for wallet deep linking
 */

/**
 * Detect if the current device is mobile (iOS or Android)
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

  // Android detection
  const isAndroid = /android/i.test(userAgent);

  // Additional mobile detection patterns
  const isMobilePattern = /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Touch support check (additional verification)
  const hasTouchScreen =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  return isIOS || isAndroid || (isMobilePattern && hasTouchScreen);
};

/**
 * Detect if the current device is iOS
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
};

/**
 * Detect if the current device is Android
 */
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent);
};

/**
 * Get the mobile operating system name
 */
export const getMobileOS = (): 'iOS' | 'Android' | 'Other' => {
  if (isIOS()) return 'iOS';
  if (isAndroid()) return 'Android';
  return 'Other';
};

/**
 * Detect if running in an in-app browser (like Instagram, Facebook)
 */
export const isInAppBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  const inAppBrowsers = [
    'FBAN',     // Facebook App
    'FBAV',     // Facebook App
    'Instagram', // Instagram
    'Twitter',   // Twitter
    'Line',      // Line
    'MicroMessenger', // WeChat
  ];

  return inAppBrowsers.some(browser => userAgent.includes(browser));
};

/**
 * Detect if running in a standalone web app (PWA)
 */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;

  // iOS standalone check
  const isIOSStandalone = (window.navigator as any).standalone === true;

  // Android/Chrome standalone check
  const isAndroidStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return isIOSStandalone || isAndroidStandalone;
};

/**
 * Get viewport dimensions
 */
export const getViewport = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

/**
 * Detect if device is in landscape mode
 */
export const isLandscape = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.innerWidth > window.innerHeight;
};
