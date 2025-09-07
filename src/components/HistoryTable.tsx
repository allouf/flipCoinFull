import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
  VisibilityState,
  OnChangeFn,
} from '@tanstack/react-table';
import { FixedSizeList as List } from 'react-window';
import { format } from 'date-fns';
import { GameHistoryRecord, PaginatedGameHistory } from '../services/GameHistoryService';
import { ExplorerLink } from './ExplorerLink';
import { AddressCopy } from './AddressCopy';
import { LoadingSpinner } from './LoadingSpinner';
import { TokenAmount } from './TokenAmount';

interface HistoryTableProps {
  data: GameHistoryRecord[];
  isLoading: boolean;
  pagination?: PaginatedGameHistory['pagination'];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  userAddress: string;
}

interface ExpandedRowData {
  game: GameHistoryRecord;
  userAddress: string;
}

// Column helper for type safety
const columnHelper = createColumnHelper<GameHistoryRecord>();

// Row expansion component
const ExpandedRow: React.FC<ExpandedRowData> = ({ game, userAddress }) => {
  const isUserWinner = game.winner === userAddress;
  const userChoice = game.player1 === userAddress ? game.player1Choice : game.player2Choice;
  const opponent = game.player1 === userAddress ? game.player2 : game.player1;
  const profitLoss = isUserWinner ? game.betAmount - game.houseFee : -game.betAmount;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Game Details */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Game Details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Your Choice:</span>
              <span className="font-medium capitalize text-gray-900 dark:text-white">
                {userChoice}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Result:</span>
              <span className="font-medium capitalize text-gray-900 dark:text-white">
                {game.result}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">House Fee:</span>
              <TokenAmount
                amount={game.houseFee}
                token={game.token}
                className="text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Block:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                #
                {game.blockNumber.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Opponent & Transaction */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Transaction Info
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-1">Opponent:</span>
              <AddressCopy
                address={opponent}
                className="text-xs"
                showCopyButton
              />
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-1">Transaction:</span>
              <ExplorerLink
                signature={game.signature}
                className="text-xs"
                showFullSignature={false}
              />
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-1">Program Account:</span>
              <AddressCopy
                address={game.programAccount}
                className="text-xs font-mono"
                showCopyButton
              />
            </div>
          </div>
        </div>

        {/* Profit/Loss Summary */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Financial Summary
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Bet Amount:</span>
              <TokenAmount
                amount={game.betAmount}
                token={game.token}
                className="text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Net Result:</span>
              <TokenAmount
                amount={Math.abs(profitLoss)}
                token={game.token}
                className={`font-medium ${profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                prefix={profitLoss >= 0 ? '+' : '-'}
              />
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isUserWinner
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
              >
                {isUserWinner ? '✓ Win' : '✗ Loss'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HistoryTable: React.FC<HistoryTableProps> = ({
  data,
  isLoading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  userAddress,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    opponent: true,
    betAmount: true,
    choice: true,
    result: true,
    outcome: true,
    profitLoss: true,
    timestamp: true,
    transaction: true,
  });

  const columns = useMemo<ColumnDef<GameHistoryRecord>[]>(() => [
    // Expand column
    columnHelper.display({
      id: 'expand',
      size: 40,
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.id);
        return (
          <button
            onClick={() => {
              const newExpanded = new Set(expandedRows);
              if (isExpanded) {
                newExpanded.delete(row.original.id);
              } else {
                newExpanded.add(row.original.id);
              }
              setExpandedRows(newExpanded);
            }}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      },
    }),

    // Date column
    {
      id: 'timestamp',
      header: 'Date',
      size: 120,
      accessorFn: (row) => row.timestamp,
      cell: (info) => {
        const date = info.getValue() as Date;
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {format(date, 'MMM dd')}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              {format(date, 'HH:mm')}
            </div>
          </div>
        );
      },
      sortingFn: 'datetime',
    } as ColumnDef<GameHistoryRecord>,

    // Opponent column
    columnHelper.display({
      header: 'Opponent',
      id: 'opponent',
      size: 140,
      cell: ({ row }) => {
        const game = row.original;
        const opponent = game.player1 === userAddress ? game.player2 : game.player1;
        return (
          <AddressCopy
            address={opponent}
            className="text-sm"
            showCopyButton={false}
          />
        );
      },
    }),

    // Bet Amount column
    {
      id: 'betAmount',
      header: 'Bet Amount',
      size: 100,
      accessorFn: (row) => row.betAmount,
      cell: (info) => {
        const game = info.row.original;
        return (
          <TokenAmount
            amount={info.getValue() as number}
            token={game.token}
            className="text-sm font-medium text-gray-900 dark:text-white"
          />
        );
      },
    } as ColumnDef<GameHistoryRecord>,

    // User's Choice column
    columnHelper.display({
      header: 'Your Choice',
      id: 'choice',
      size: 80,
      cell: ({ row }) => {
        const game = row.original;
        const userChoice = game.player1 === userAddress ? game.player1Choice : game.player2Choice;
        return (
          <div className="text-sm capitalize font-medium text-gray-900 dark:text-white">
            {userChoice}
          </div>
        );
      },
    }),

    // Result column
    {
      id: 'result',
      header: 'Result',
      size: 80,
      accessorFn: (row) => row.result,
      cell: (info) => (
        <div className="text-sm capitalize font-medium text-gray-900 dark:text-white">
          {String(info.getValue())}
        </div>
      ),
    } as ColumnDef<GameHistoryRecord>,

    // Outcome column
    columnHelper.display({
      header: 'Outcome',
      id: 'outcome',
      size: 80,
      cell: ({ row }) => {
        const game = row.original;
        const isWin = game.winner === userAddress;
        return (
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isWin
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}
          >
            {isWin ? '✓ Win' : '✗ Loss'}
          </div>
        );
      },
    }),

    // Profit/Loss column
    columnHelper.display({
      header: 'Profit/Loss',
      id: 'profitLoss',
      size: 100,
      cell: ({ row }) => {
        const game = row.original;
        const isWin = game.winner === userAddress;
        const profitLoss = isWin ? game.betAmount - game.houseFee : -game.betAmount;

        return (
          <TokenAmount
            amount={Math.abs(profitLoss)}
            token={game.token}
            className={`text-sm font-medium ${
              profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
            prefix={profitLoss >= 0 ? '+' : '-'}
          />
        );
      },
    }),

    // Transaction column
    {
      id: 'transaction',
      header: 'Transaction',
      size: 120,
      accessorFn: (row) => row.signature,
      cell: (info) => (
        <ExplorerLink
          signature={info.getValue() as string}
          className="text-sm"
          showFullSignature={false}
        />
      ),
    } as ColumnDef<GameHistoryRecord>,
  ], [userAddress, expandedRows]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility as OnChangeFn<VisibilityState>,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.limit) : -1,
  });

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 flex items-center space-x-4">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 grid grid-cols-8 gap-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading && data.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="overflow-hidden">
      {/* Column Visibility Controls (Mobile) */}
      <div className="md:hidden p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {Object.entries(columnVisibility).map(([key, visible]) => (
            <button
              key={key}
              onClick={() => setColumnVisibility((prev) => ({ ...prev, [key]: !visible }))}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                visible
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                      {header.column.getCanSort() && (
                        <span className="flex flex-col">
                          <svg className={`w-3 h-3 ${header.column.getIsSorted() === 'asc' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg className={`w-3 h-3 ${header.column.getIsSorted() === 'desc' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => {
              const isExpanded = expandedRows.has(row.original.id);
              return (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={columns.length} className="p-0">
                        <ExpandedRow game={row.original} userAddress={userAddress} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFetchingNextPage ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Loading More...
              </>
            ) : (
              'Load More Games'
            )}
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
          Showing
          {' '}
          {((pagination.page - 1) * pagination.limit) + 1}
          {' '}
          to
          {' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)}
          {' '}
          of
          {' '}
          {pagination.total}
          {' '}
          results
        </div>
      )}
    </div>
  );
};
