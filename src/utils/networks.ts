export type SolanaNetwork = 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkConfig {
  name: string;
  displayName: string;
  rpcUrl: string;
  explorerUrl: string;
}

export const NETWORK_CONFIGS: Record<SolanaNetwork, NetworkConfig> = {
  devnet: {
    name: 'devnet',
    displayName: 'Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com',
  },
  testnet: {
    name: 'testnet',
    displayName: 'Testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    explorerUrl: 'https://explorer.solana.com',
  },
  'mainnet-beta': {
    name: 'mainnet-beta',
    displayName: 'Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
  },
};

export const getNetworkConfig = (
  network: SolanaNetwork,
): NetworkConfig => NETWORK_CONFIGS[network] || NETWORK_CONFIGS.devnet;

export const getExplorerUrl = (
  signature: string,
  network: SolanaNetwork,
): string => {
  const config = getNetworkConfig(network);
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `${config.explorerUrl}/tx/${signature}${cluster}`;
};

export const getAccountUrl = (
  address: string,
  network: SolanaNetwork,
): string => {
  const config = getNetworkConfig(network);
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `${config.explorerUrl}/account/${address}${cluster}`;
};

export const isValidNetwork = (
  network: string,
): network is SolanaNetwork => network in NETWORK_CONFIGS;
