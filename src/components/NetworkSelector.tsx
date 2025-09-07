import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { SolanaNetwork, NETWORK_CONFIGS } from '../utils/networks';

interface NetworkSelectorProps {
  className?: string;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  className = '',
}) => {
  const {
    network, connected, connecting, switchNetwork,
  } = useWallet();

  const handleNetworkChange = async (newNetwork: SolanaNetwork) => {
    if (newNetwork === network) return;

    // Show confirmation if wallet is connected
    if (connected) {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        `Are you sure you want to switch networks? This will disconnect your wallet and you'll need to reconnect on ${NETWORK_CONFIGS[newNetwork].displayName}.`,
      );
      if (!confirmed) return;
    }

    try {
      await switchNetwork(newNetwork);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to switch network:', error);
    }
  };

  const getCurrentConfig = () => NETWORK_CONFIGS[network];

  const getNetworkIcon = (networkName: SolanaNetwork) => {
    switch (networkName) {
      case 'mainnet-beta':
        return '🟢';
      case 'devnet':
        return '🟡';
      case 'testnet':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getNetworkColor = (networkName: SolanaNetwork) => {
    switch (networkName) {
      case 'mainnet-beta':
        return 'text-success';
      case 'devnet':
        return 'text-warning';
      case 'testnet':
        return 'text-error';
      default:
        return 'text-base-content';
    }
  };

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div
        tabIndex={connecting ? -1 : 0}
        role="button"
        className={`
          btn btn-ghost btn-sm flex items-center space-x-2 
          ${connecting ? 'btn-disabled cursor-not-allowed' : 'hover:btn-outline'}
        `}
        aria-disabled={connecting}
      >
        <span className="text-lg">{getNetworkIcon(network)}</span>
        <span className={`font-medium text-sm ${getNetworkColor(network)}`}>
          {getCurrentConfig().displayName}
        </span>
        <svg
          className="w-4 h-4 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>

      <ul
        className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-56 border border-base-300"
      >
        <li className="menu-title text-xs text-base-content/60 px-3 py-1">
          Solana Networks
        </li>

        {Object.entries(NETWORK_CONFIGS).map(([networkKey, config]) => {
          const networkName = networkKey as SolanaNetwork;
          const isCurrentNetwork = networkName === network;

          return (
            <li key={networkKey}>
              <button
                type="button"
                onClick={() => handleNetworkChange(networkName)}
                className={`
                  flex items-center justify-between rounded-lg
                  ${isCurrentNetwork
                  ? 'bg-primary text-primary-content font-medium'
                  : 'hover:bg-base-200'
                  }
                  ${connecting ? 'cursor-not-allowed opacity-50' : ''}
                `}
                disabled={connecting}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getNetworkIcon(networkName)}</span>
                  <div className="text-left">
                    <div className="font-medium">{config.displayName}</div>
                    <div className="text-xs opacity-60">
                      {networkName === 'mainnet-beta'
                        ? 'Production network'
                        : `${config.displayName} testing`}
                    </div>
                  </div>
                </div>

                {isCurrentNetwork && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </li>
          );
        })}

        <div className="divider my-2" />

        <li className="px-3 py-2">
          <div className="text-xs text-base-content/60">
            <div className="flex items-center space-x-2">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {connected ? 'Switching networks will disconnect wallet' : 'Network affects transaction costs'}
              </span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
};
