import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import Papa from 'papaparse';
import { getGameHistoryService, GameHistoryFilters } from '../services/GameHistoryService';
import { useAnchorProgram } from './useAnchorProgram';

/**
 * Hook for exporting transaction history data to various formats
 */
export const useHistoryExport = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useAnchorProgram();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  // Get game history service instance
  const getService = useCallback(() => {
    const service = getGameHistoryService(connection, program?.program || undefined);
    service.setUserPublicKey(publicKey);
    return service;
  }, [connection, program, publicKey]);

  /**
   * Export transaction history to CSV format
   */
  const exportCSV = useCallback(async (
    filters: GameHistoryFilters = {},
    filename?: string,
  ): Promise<void> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const service = getService();

      // Use Web Worker for large exports to prevent UI blocking
      // TODO: Implement actual Web Worker for processing

      // For now, use direct service call
      const csvData = await service.exportToCSV(filters, filename);

      // Generate filename if not provided
      const finalFilename = filename || `coinflip-history-${new Date().toISOString().split('T')[0]}.csv`;

      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', finalFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportProgress(100);

      // Clear progress after a short delay
      setTimeout(() => {
        setExportProgress(null);
      }, 2000);
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [publicKey, getService]);

  /**
   * Export transaction history to JSON format
   */
  const exportJSON = useCallback(async (
    filters: GameHistoryFilters = {},
    filename?: string,
  ): Promise<void> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const service = getService();
      const jsonData = await service.exportToJSON(filters, filename);

      // Generate filename if not provided
      const finalFilename = filename || `coinflip-history-${new Date().toISOString().split('T')[0]}.json`;

      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', finalFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportProgress(100);

      // Clear progress after a short delay
      setTimeout(() => {
        setExportProgress(null);
      }, 2000);
    } catch (error) {
      console.error('JSON export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [publicKey, getService]);

  /**
   * Export selected transactions (for bulk operations)
   */
  const exportSelected = useCallback(async (
    transactionIds: string[],
    format: 'csv' | 'json' = 'csv',
    filename?: string,
  ): Promise<void> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (transactionIds.length === 0) {
      throw new Error('No transactions selected');
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const service = getService();

      // TODO: Implement selective export in GameHistoryService
      // For now, get all data and filter client-side
      const allData = await service.getGameHistory({}, 1, 10000);
      const selectedData = allData.data.filter((game) => transactionIds.includes(game.id));

      const timestamp = new Date().toISOString().split('T')[0];
      const defaultFilename = `coinflip-selected-${timestamp}.${format}`;
      const finalFilename = filename || defaultFilename;

      let exportData: string;
      let mimeType: string;

      if (format === 'csv') {
        // Convert to CSV using papaparse
        exportData = Papa.unparse(selectedData.map((game) => ({
          Date: game.timestamp.toISOString(),
          Opponent: game.player1 === publicKey.toString() ? game.player2 : game.player1,
          Amount: game.betAmount,
          Token: game.token,
          'Your Choice': game.player1 === publicKey.toString() ? game.player1Choice : game.player2Choice,
          Result: game.result,
          Outcome: game.winner === publicKey.toString() ? 'Win' : 'Loss',
          'Profit/Loss': game.winner === publicKey.toString()
            ? game.betAmount - game.houseFee
            : -game.betAmount,
          'Transaction Signature': game.signature,
        })));
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        exportData = JSON.stringify({
          exportDate: new Date().toISOString(),
          selectedCount: selectedData.length,
          data: selectedData,
        }, null, 2);
        mimeType = 'application/json;charset=utf-8;';
      }

      // Create and download file
      const blob = new Blob([exportData], { type: mimeType });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', finalFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportProgress(100);

      // Clear progress after a short delay
      setTimeout(() => {
        setExportProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Selected export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [publicKey, getService]);

  /**
   * Copy transaction data to clipboard
   */
  const copyToClipboard = useCallback(async (
    transactionIds: string[],
    format: 'csv' | 'json' = 'json',
  ): Promise<void> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    if (transactionIds.length === 0) {
      throw new Error('No transactions selected');
    }

    try {
      const service = getService();
      const allData = await service.getGameHistory({}, 1, 10000);
      const selectedData = allData.data.filter((game) => transactionIds.includes(game.id));

      let clipboardData: string;

      if (format === 'csv') {
        clipboardData = Papa.unparse(selectedData.map((game) => ({
          Date: game.timestamp.toISOString(),
          Opponent: game.player1 === publicKey.toString() ? game.player2 : game.player1,
          Amount: game.betAmount,
          Token: game.token,
          'Your Choice': game.player1 === publicKey.toString() ? game.player1Choice : game.player2Choice,
          Result: game.result,
          Outcome: game.winner === publicKey.toString() ? 'Win' : 'Loss',
          'Profit/Loss': game.winner === publicKey.toString()
            ? game.betAmount - game.houseFee
            : -game.betAmount,
          'Transaction Signature': game.signature,
        })));
      } else {
        clipboardData = JSON.stringify(selectedData, null, 2);
      }

      await navigator.clipboard.writeText(clipboardData);
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      throw error;
    }
  }, [publicKey, getService]);

  /**
   * Generate shareable link for transaction data
   */
  const generateShareableLink = useCallback(async (
    filters: GameHistoryFilters = {},
  ): Promise<string> => {
    // TODO: Implement shareable link generation
    // This would create a temporary link that others can use to view anonymized stats

    const encodedFilters = btoa(JSON.stringify(filters));
    const baseUrl = window.location.origin;

    return `${baseUrl}/shared-stats?filters=${encodedFilters}`;
  }, []);

  /**
   * Export for tax reporting (specific format)
   */
  const exportForTaxes = useCallback(async (
    taxYear: number,
    filename?: string,
  ): Promise<void> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    const yearStart = new Date(taxYear, 0, 1);
    const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59);

    const filters: GameHistoryFilters = {
      startDate: yearStart,
      endDate: yearEnd,
    };

    setIsExporting(true);
    setExportProgress(0);

    try {
      const service = getService();
      const data = await service.getGameHistory(filters, 1, 10000);

      // Create tax-specific CSV format
      const taxData = data.data.map((game) => ({
        Date: game.timestamp.toISOString().split('T')[0],
        'Transaction ID': game.signature,
        Type: 'Gambling',
        'Amount Wagered': game.betAmount,
        Currency: game.token,
        'Amount Won/Lost': game.winner === publicKey.toString()
          ? game.betAmount - game.houseFee
          : -game.betAmount,
        'Net Gain/Loss': game.winner === publicKey.toString()
          ? game.betAmount - game.houseFee
          : -game.betAmount,
        Fees: game.houseFee,
        Description: `Coin flip game - ${game.result}`,
        Counterparty: game.player1 === publicKey.toString() ? game.player2 : game.player1,
      }));

      const csvData = Papa.unparse(taxData);
      const finalFilename = filename || `coinflip-tax-report-${taxYear}.csv`;

      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', finalFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportProgress(100);

      setTimeout(() => {
        setExportProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Tax export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [publicKey, getService]);

  return {
    exportCSV,
    exportJSON,
    exportSelected,
    copyToClipboard,
    generateShareableLink,
    exportForTaxes,
    isExporting,
    exportProgress,
  };
};
