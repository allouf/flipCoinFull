import { useState, useCallback, useMemo } from 'react';
import {
  startOfDay, endOfDay, subDays, subWeeks, subMonths,
} from 'date-fns';
import { GameHistoryFilters } from '../services/GameHistoryService';

/**
 * Custom hook for managing transaction history filters with localStorage persistence
 */
export const useHistoryFilters = () => {
  const [filters, setFilters] = useState<GameHistoryFilters>(() => {
    // Load filters from localStorage on initialization
    try {
      const saved = localStorage.getItem('coinFlipHistoryFilters');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
      return {};
    }
  });

  // Update filters and persist to localStorage
  const updateFilter = useCallback((newFilters: Partial<GameHistoryFilters>) => {
    setFilters((current) => {
      const updated = { ...current, ...newFilters };

      // Remove undefined/null values
      const cleaned = Object.fromEntries(
        Object.entries(updated).filter(([_, value]) => value !== undefined && value !== null && value !== ''),
      );

      // Persist to localStorage
      try {
        localStorage.setItem('coinFlipHistoryFilters', JSON.stringify(cleaned));
      } catch (error) {
        console.warn('Failed to save filters to localStorage:', error);
      }

      return cleaned;
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    try {
      localStorage.removeItem('coinFlipHistoryFilters');
    } catch (error) {
      console.warn('Failed to clear filters from localStorage:', error);
    }
  }, []);

  // Quick filter presets
  const getQuickFilters = useCallback(() => {
    const now = new Date();

    return {
      today: {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      },
      yesterday: {
        startDate: startOfDay(subDays(now, 1)),
        endDate: endOfDay(subDays(now, 1)),
      },
      thisWeek: {
        startDate: subDays(now, 7),
        endDate: now,
      },
      lastWeek: {
        startDate: subDays(now, 14),
        endDate: subDays(now, 7),
      },
      thisMonth: {
        startDate: subDays(now, 30),
        endDate: now,
      },
      lastMonth: {
        startDate: subDays(now, 60),
        endDate: subDays(now, 30),
      },
      winsOnly: {
        outcome: 'wins' as const,
      },
      lossesOnly: {
        outcome: 'losses' as const,
      },
      highValue: {
        minAmount: 1, // 1 SOL or equivalent
      },
      lowValue: {
        maxAmount: 0.1, // 0.1 SOL or equivalent
      },
      recentGames: {
        startDate: subDays(now, 3),
        endDate: now,
      },
    };
  }, []);

  // Apply quick filter
  const applyQuickFilter = useCallback((filterType: keyof ReturnType<typeof getQuickFilters>) => {
    const quickFilters = getQuickFilters();
    const quickFilter = quickFilters[filterType];
    if (quickFilter) {
      updateFilter(quickFilter);
    }
  }, [getQuickFilters, updateFilter]);

  // Reset to specific date range
  const setDateRange = useCallback((startDate: Date | null, endDate: Date | null) => {
    updateFilter({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [updateFilter]);

  // Set outcome filter
  const setOutcomeFilter = useCallback((outcome: 'wins' | 'losses' | 'all') => {
    updateFilter({
      outcome: outcome === 'all' ? undefined : outcome,
    });
  }, [updateFilter]);

  // Set amount range filter
  const setAmountRange = useCallback((minAmount?: number, maxAmount?: number) => {
    updateFilter({
      minAmount,
      maxAmount,
    });
  }, [updateFilter]);

  // Set token filter
  const setTokenFilter = useCallback((token?: string) => {
    updateFilter({
      token: token || undefined,
    });
  }, [updateFilter]);

  // Set opponent filter
  const setOpponentFilter = useCallback((opponent?: string) => {
    updateFilter({
      opponent: opponent || undefined,
    });
  }, [updateFilter]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => Object.keys(filters).length > 0, [filters]);

  // Get filter summary for display
  const getFilterSummary = useMemo(() => {
    const summary: string[] = [];

    if (filters.startDate || filters.endDate) {
      if (filters.startDate && filters.endDate) {
        summary.push(`Date: ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`);
      } else if (filters.startDate) {
        summary.push(`After: ${filters.startDate.toLocaleDateString()}`);
      } else if (filters.endDate) {
        summary.push(`Before: ${filters.endDate.toLocaleDateString()}`);
      }
    }

    if (filters.outcome) {
      summary.push(`Outcome: ${filters.outcome}`);
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
        summary.push(`Amount: ${filters.minAmount} - ${filters.maxAmount}`);
      } else if (filters.minAmount !== undefined) {
        summary.push(`Min Amount: ${filters.minAmount}`);
      } else if (filters.maxAmount !== undefined) {
        summary.push(`Max Amount: ${filters.maxAmount}`);
      }
    }

    if (filters.token) {
      summary.push(`Token: ${filters.token}`);
    }

    if (filters.opponent) {
      summary.push(`Opponent: ${filters.opponent.slice(0, 8)}...`);
    }

    return summary;
  }, [filters]);

  // Validate filters
  const validateFilters = useMemo(() => {
    const errors: string[] = [];

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      errors.push('Start date must be before end date');
    }

    if (filters.minAmount !== undefined && filters.maxAmount !== undefined && filters.minAmount > filters.maxAmount) {
      errors.push('Minimum amount must be less than maximum amount');
    }

    if (filters.minAmount !== undefined && filters.minAmount < 0) {
      errors.push('Minimum amount must be positive');
    }

    if (filters.maxAmount !== undefined && filters.maxAmount < 0) {
      errors.push('Maximum amount must be positive');
    }

    return errors;
  }, [filters]);

  // Get filter count for badges
  const getFilterCount = useMemo(() => Object.keys(filters).length, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    getQuickFilters,
    applyQuickFilter,
    setDateRange,
    setOutcomeFilter,
    setAmountRange,
    setTokenFilter,
    setOpponentFilter,
    hasActiveFilters,
    getFilterSummary,
    validateFilters,
    getFilterCount,

    // Helper functions for common filter combinations
    showWinsOnly: () => applyQuickFilter('winsOnly'),
    showLossesOnly: () => applyQuickFilter('lossesOnly'),
    showToday: () => applyQuickFilter('today'),
    showThisWeek: () => applyQuickFilter('thisWeek'),
    showThisMonth: () => applyQuickFilter('thisMonth'),
    showHighValue: () => applyQuickFilter('highValue'),
    showRecentGames: () => applyQuickFilter('recentGames'),
  };
};

/**
 * Hook for managing filter presets/favorites
 */
export const useFilterPresets = () => {
  const [presets, setPresets] = useState<Record<string, GameHistoryFilters>>(() => {
    try {
      const saved = localStorage.getItem('coinFlipFilterPresets');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load filter presets:', error);
      return {};
    }
  });

  const savePreset = useCallback((name: string, filters: GameHistoryFilters) => {
    setPresets((current) => {
      const updated = { ...current, [name]: filters };
      try {
        localStorage.setItem('coinFlipFilterPresets', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save filter preset:', error);
      }
      return updated;
    });
  }, []);

  const deletePreset = useCallback((name: string) => {
    setPresets((current) => {
      const updated = { ...current };
      delete updated[name];
      try {
        localStorage.setItem('coinFlipFilterPresets', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to delete filter preset:', error);
      }
      return updated;
    });
  }, []);

  const getPreset = useCallback((name: string): GameHistoryFilters | null => presets[name] || null, [presets]);

  return {
    presets,
    savePreset,
    deletePreset,
    getPreset,
    presetNames: Object.keys(presets),
  };
};
