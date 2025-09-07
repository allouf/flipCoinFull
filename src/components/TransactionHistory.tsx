import React, { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { HistoryTable } from './HistoryTable';
import { HistoryFilters } from './HistoryFilters';
import { HistoryStats } from './HistoryStats';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { useHistoryFilters } from '../hooks/useHistoryFilters';
import { useHistoryExport } from '../hooks/useHistoryExport';
import { GameHistoryFilters } from '../services/GameHistoryService';

export const TransactionHistory: React.FC = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filter management
  const {
    filters,
    updateFilter,
    clearFilters,
    getQuickFilters,
  } = useHistoryFilters();

  // Data fetching
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTransactionHistory({
    filters,
    page: currentPage,
    limit: pageSize,
    enabled: !!publicKey,
  });

  // Export functionality
  const {
    exportCSV,
    exportJSON,
    isExporting,
    exportProgress,
  } = useHistoryExport();

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<GameHistoryFilters>) => {
    updateFilter(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle quick filter buttons
  const handleQuickFilter = (filterType: string) => {
    const quickFilters = getQuickFilters();
    const filter = quickFilters[filterType as keyof typeof quickFilters];
    if (filter) {
      handleFilterChange(filter);
    }
  };

  // Handle export actions
  const handleExportCSV = async () => {
    try {
      const filename = `coinflip-history-${new Date().toISOString().split('T')[0]}.csv`;
      await exportCSV(filters, filename);
      toast.success('Game history exported to CSV successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export game history');
    }
  };

  const handleExportJSON = async () => {
    try {
      const filename = `coinflip-history-${new Date().toISOString().split('T')[0]}.json`;
      await exportJSON(filters, filename);
      toast.success('Game history exported to JSON successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export game history');
    }
  };

  // Load more data when scrolling
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Show wallet connection prompt if not connected
  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Transaction History
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your wallet to view your game history and statistics.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              💡 Your transaction history includes all completed games, winnings, and blockchain verification links.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Transaction History
          </h2>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-700 dark:text-red-300 mb-4">
              Failed to load transaction history
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">
              {error.message}
            </p>
            <button
              onClick={() => refetch()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Transaction History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all your coin flip games with complete blockchain verification
        </p>
      </div>

      {/* Statistics Cards */}
      {historyData?.stats && (
        <div className="mb-8">
          <HistoryStats stats={historyData.stats} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <HistoryFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
          onClearFilters={clearFilters}
          onQuickFilter={handleQuickFilter}
          isLoading={isLoading}
        />
      </div>

      {/* Export Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {historyData?.pagination.total ? (
            <>
              Showing
              {historyData.data.length}
              {' '}
              of
              {historyData.pagination.total}
              {' '}
              games
            </>
          ) : (
            'Loading...'
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </>
            )}
          </button>
          <button
            onClick={handleExportJSON}
            disabled={isExporting || isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* Export Progress */}
      {exportProgress && exportProgress > 0 && (
        <div className="mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">Exporting data...</span>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {Math.round(exportProgress)}
                %
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <HistoryTable
          data={historyData?.data || []}
          isLoading={isLoading}
          pagination={historyData?.pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onLoadMore={handleLoadMore}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          userAddress={publicKey.toString()}
        />
      </div>

      {/* Empty State */}
      {!isLoading && (!historyData?.data || historyData.data.length === 0) && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Games Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {Object.keys(filters).length > 0
              ? 'No games match your current filters. Try adjusting your search criteria.'
              : 'You haven\'t played any games yet. Start flipping coins to see your history here!'}
          </p>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
