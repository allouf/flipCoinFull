import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GameCard } from '../GameLobby/GameCard';
import { LobbyPage } from '../../pages/LobbyPage';
import { StatsPage } from '../../pages/StatsPage';

// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
  }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletMultiButton: () => <button>Connect Wallet</button>,
  WalletModalProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../hooks/useFairCoinFlipper', () => ({
  useFairCoinFlipper: () => null,
}));

jest.mock('../../hooks/useLobbyData', () => ({
  useLobbyData: () => ({
    availableGames: [],
    runningGames: [],
    myGames: [],
    gameHistory: [],
    stats: null,
    loading: false,
    error: null,
    refreshData: jest.fn(),
  }),
}));

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({}),
}));

jest.mock('../../hooks/useTransactionHistory', () => ({
  useTransactionHistory: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe('Responsive Layout Tests', () => {
  describe('GameCard Component', () => {
    const mockGame = {
      gamePda: 'test-pda',
      gameId: 1,
      betAmount: 0.5,
      playerA: 'test-player-a',
      playerB: null,
      status: 'WaitingForPlayer' as const,
      timeRemaining: 3600,
      createdAt: new Date(),
      winner: null,
    };

    test('renders with responsive classes', () => {
      const { container } = render(
        <GameCard
          game={mockGame}
          onJoin={jest.fn()}
          onRejoin={jest.fn()}
        />
      );

      // Check for responsive padding
      const cardBody = container.querySelector('.card-body');
      expect(cardBody?.className).toContain('p-4 sm:p-6');
    });

    test('has responsive text sizing', () => {
      const { container } = render(
        <GameCard
          game={mockGame}
          onJoin={jest.fn()}
          onRejoin={jest.fn()}
        />
      );

      // Check for responsive title sizing
      const title = container.querySelector('.card-title');
      expect(title?.className).toContain('text-base sm:text-lg');
    });

    test('has touch-friendly button sizes', () => {
      const { container } = render(
        <GameCard
          game={mockGame}
          onJoin={jest.fn()}
          onRejoin={jest.fn()}
        />
      );

      // Check for minimum touch target height
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button.className).toContain('min-h-[44px]');
      });
    });
  });

  describe('LobbyPage Component', () => {
    test('renders with mobile-optimized header', () => {
      const { container } = render(
        <BrowserRouter>
          <LobbyPage />
        </BrowserRouter>
      );

      // Check for responsive title sizing
      const title = container.querySelector('h1');
      expect(title?.className).toContain('text-base sm:text-xl');
    });

    test('has responsive container padding', () => {
      const { container } = render(
        <BrowserRouter>
          <LobbyPage />
        </BrowserRouter>
      );

      // Check for responsive padding
      const main = container.querySelector('main');
      expect(main?.className).toContain('px-3 sm:px-4');
    });

    test('has responsive tab sizing', () => {
      const { container } = render(
        <BrowserRouter>
          <LobbyPage />
        </BrowserRouter>
      );

      // Check for responsive tabs
      const tabs = container.querySelectorAll('.tab');
      tabs.forEach(tab => {
        expect(tab.className).toContain('tab-sm sm:tab-md');
      });
    });
  });

  describe('StatsPage Component', () => {
    test('renders with responsive header sizing', () => {
      const { container } = render(
        <BrowserRouter>
          <StatsPage />
        </BrowserRouter>
      );

      // Check for responsive title sizing
      const title = container.querySelector('h1');
      expect(title?.className).toContain('text-2xl sm:text-3xl');
    });

    test('has responsive grid for stats cards', () => {
      const { container } = render(
        <BrowserRouter>
          <StatsPage />
        </BrowserRouter>
      );

      // Check for responsive grid
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('md:grid-cols-2');
    });
  });

  describe('CoinFlipAnimation Styles', () => {
    test('has mobile-first responsive breakpoints', async () => {
      // Read the CSS file content
      const fs = require('fs');
      const path = require('path');
      const cssPath = path.join(__dirname, '../../styles/CoinFlipAnimation.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Check for mobile breakpoint
      expect(cssContent).toContain('@media (max-width: 480px)');

      // Check for tablet breakpoint
      expect(cssContent).toContain('@media (min-width: 481px) and (max-width: 768px)');

      // Check for touch-friendly button sizing
      expect(cssContent).toContain('min-height: 44px');
    });
  });

  describe('Viewport Meta Tags', () => {
    test('has mobile-optimized viewport settings', async () => {
      const fs = require('fs');
      const path = require('path');
      const htmlPath = path.join(__dirname, '../../../public/index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');

      // Check for mobile viewport settings
      expect(htmlContent).toContain('maximum-scale=1');
      expect(htmlContent).toContain('user-scalable=no');
      expect(htmlContent).toContain('apple-mobile-web-app-capable');
    });
  });
});
