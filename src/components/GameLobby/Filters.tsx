import React from 'react';

interface FiltersProps {
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' | 'time';
  onSortChange: (sort: 'newest' | 'oldest' | 'highest' | 'lowest' | 'time') => void;
  betFilter: 'all' | 'low' | 'medium' | 'high';
  onBetFilterChange: (filter: 'all' | 'low' | 'medium' | 'high') => void;
}

export const Filters: React.FC<FiltersProps> = ({
  sortBy,
  onSortChange,
  betFilter,
  onBetFilterChange
}) => {
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      <div className="flex-1">
        <label className="label">
          <span className="label-text">Sort By</span>
        </label>
        <select
          className="select select-bordered w-full h-12"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Bet</option>
          <option value="lowest">Lowest Bet</option>
          <option value="time">Time Remaining</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="label">
          <span className="label-text">Bet Amount</span>
        </label>
        <select
          className="select select-bordered w-full h-12"
          value={betFilter}
          onChange={(e) => onBetFilterChange(e.target.value as any)}
        >
          <option value="all">All Amounts</option>
          <option value="low">Low (≤0.1 SOL)</option>
          <option value="medium">Medium (0.1-1 SOL)</option>
          <option value="high">High (&gt;1 SOL)</option>
        </select>
      </div>
    </div>
  );
};
