import React, { useState } from 'react';
import {
  format, startOfDay, endOfDay, subDays, subWeeks, subMonths,
} from 'date-fns';
import { GameHistoryFilters } from '../services/GameHistoryService';

interface HistoryFiltersProps {
  filters: GameHistoryFilters;
  onFiltersChange: (filters: Partial<GameHistoryFilters>) => void;
  onClearFilters: () => void;
  onQuickFilter: (filterType: string) => void;
  isLoading?: boolean;
}

interface QuickFilterButton {
  id: string;
  label: string;
  description: string;
  filters: Partial<GameHistoryFilters>;
  icon: React.ReactNode;
}

const QUICK_FILTERS: QuickFilterButton[] = [
  {
    id: 'today',
    label: 'Today',
    description: 'Games from today',
    filters: {
      startDate: startOfDay(new Date()),
      endDate: endOfDay(new Date()),
    },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'week',
    label: 'This Week',
    description: 'Games from the last 7 days',
    filters: {
      startDate: subDays(new Date(), 7),
      endDate: new Date(),
    },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'month',
    label: 'This Month',
    description: 'Games from the last 30 days',
    filters: {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
    },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'wins',
    label: 'Wins Only',
    description: 'Show only winning games',
    filters: {
      outcome: 'wins',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'losses',
    label: 'Losses Only',
    description: 'Show only losing games',
    filters: {
      outcome: 'losses',
    },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'highValue',
    label: 'High Value',
    description: 'Games with bets ≥ 1 SOL',
    filters: {
      minAmount: 1,
    },
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

const TOKEN_OPTIONS = [
  { value: '', label: 'All Tokens' },
  { value: 'SOL', label: 'SOL' },
  { value: 'USDC', label: 'USDC' },
  { value: 'BONK', label: 'BONK' },
  // TODO: Add more tokens as they're supported
];

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  onQuickFilter,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<GameHistoryFilters>(filters);

  // Apply filters with debouncing
  const applyFilters = (newFilters: Partial<GameHistoryFilters>) => {
    const updatedFilters = { ...localFilters, ...newFilters };
    setLocalFilters(updatedFilters);

    // Debounce the actual filter application
    setTimeout(() => {
      onFiltersChange(newFilters);
    }, 300);
  };

  const handleQuickFilter = (quickFilter: QuickFilterButton) => {
    onQuickFilter(quickFilter.id);
    setLocalFilters({ ...localFilters, ...quickFilter.filters });
  };

  const formatDate = (date: Date | undefined) => (date ? format(date, 'yyyy-MM-dd') : '');

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const date = value ? new Date(value) : undefined;
    applyFilters({ [field]: date });
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Quick Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Quick Filters
          </h3>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {Object.keys(filters).length}
                {' '}
                active
              </span>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {isExpanded ? 'Less filters' : 'More filters'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_FILTERS.map((filter) => {
            const isActive = JSON.stringify(filter.filters) === JSON.stringify(filters);
            return (
              <button
                key={filter.id}
                onClick={() => handleQuickFilter(filter)}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={filter.description}
              >
                {filter.icon}
                <span className="truncate">{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={formatDate(localFilters.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={formatDate(localFilters.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Amount
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={localFilters.minAmount || ''}
                onChange={(e) => applyFilters({ minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                disabled={isLoading}
                placeholder="0.001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Amount
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={localFilters.maxAmount || ''}
                onChange={(e) => applyFilters({ maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                disabled={isLoading}
                placeholder="1000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Outcome & Token */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Outcome
              </label>
              <select
                value={localFilters.outcome || 'all'}
                onChange={(e) => applyFilters({ outcome: e.target.value === 'all' ? undefined : e.target.value as 'wins' | 'losses' })}
                disabled={isLoading}
                className="w-full h-11 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">All Games</option>
                <option value="wins">Wins Only</option>
                <option value="losses">Losses Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Token
              </label>
              <select
                value={localFilters.token || ''}
                onChange={(e) => applyFilters({ token: e.target.value || undefined })}
                disabled={isLoading}
                className="w-full h-11 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {TOKEN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opponent Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opponent Address
            </label>
            <input
              type="text"
              value={localFilters.opponent || ''}
              onChange={(e) => applyFilters({ opponent: e.target.value || undefined })}
              disabled={isLoading}
              placeholder="Enter wallet address..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Filters are applied automatically as you type
            </div>
            <button
              onClick={onClearFilters}
              disabled={!hasActiveFilters || isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
