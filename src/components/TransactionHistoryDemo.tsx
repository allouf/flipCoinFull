import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransactionHistory } from './TransactionHistory';

/**
 * Demo component showing how to integrate the Transaction History system
 * This component should be wrapped with QueryClientProvider in the main app
 */
export const TransactionHistoryDemo: React.FC = () => {
  // Create a query client for React Query
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000, // 30 seconds
        gcTime: 300000, // 5 minutes
        retry: 3,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Coin Flipper - Transaction History
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View and analyze your complete betting history with blockchain verification
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <TransactionHistory />
        </main>

        {/* Integration Notes */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
              Integration Notes
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                <strong>✅ Complete Transaction History System:</strong>
                {' '}
                This demo includes all components for a full-featured transaction history interface.
              </p>
              <p>
                <strong>🔧 Setup Required:</strong>
                {' '}
                The main App component needs to be wrapped with QueryClientProvider and WalletProvider for full functionality.
              </p>
              <p>
                <strong>🔗 Integration Points:</strong>
                {' '}
                The GameHistoryService needs to be connected to your actual Solana program for real data fetching.
              </p>
              <p>
                <strong>📊 Features Included:</strong>
                {' '}
                Filtering, sorting, pagination, statistics, CSV/JSON export, Explorer links, and responsive design.
              </p>
              <p>
                <strong>🎨 Styling:</strong>
                {' '}
                Uses Tailwind CSS with dark mode support and follows the existing design patterns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
};

/**
 * Instructions for integrating the Transaction History system into your main app:
 *
 * 1. Add to your main App component:
 *    ```tsx
 *    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *    import { TransactionHistory } from './components/TransactionHistory';
 *
 *    const queryClient = new QueryClient();
 *
 *    function App() {
 *      return (
 *        <QueryClientProvider client={queryClient}>
 *          <WalletProvider>
 *            // Your existing components
 *            <TransactionHistory />
 *          </WalletProvider>
 *        </QueryClientProvider>
 *      );
 *    }
 *    ```
 *
 * 2. Update GameHistoryService.ts:
 *    - Replace mock data with actual Solana program account fetching
 *    - Implement proper getProgramAccounts queries
 *    - Add real VRF data parsing from transaction logs
 *
 * 3. Connect to existing program infrastructure:
 *    - Update useAnchorProgram hook usage
 *    - Integrate with your existing game state management
 *    - Add real-time updates via WebSocket connections
 *
 * 4. Customize styling and behavior:
 *    - Adjust token support in TokenAmount component
 *    - Modify filter options based on your game rules
 *    - Update Explorer URLs for your target network
 *
 * 5. Add to routing (if using React Router):
 *    ```tsx
 *    <Route path="/history" element={<TransactionHistory />} />
 *    ```
 */
