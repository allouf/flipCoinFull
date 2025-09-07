import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GameHistoryStats } from '../services/GameHistoryService';
import { TokenAmount } from './TokenAmount';

interface HistoryStatsProps {
  stats: GameHistoryStats;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <div className="text-blue-600 dark:text-blue-400">
                {icon}
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {trend && (
              <div className={`flex items-center text-xs ${
                trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                <svg 
                  className={`w-3 h-3 mr-1 ${
                    trend.isPositive ? 'transform rotate-180' : ''
                  }`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {Math.abs(trend.value)}% {trend.label}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
};

// Generate mock chart data for profit/loss over time
// TODO: Replace with real data from game history
const generateChartData = (stats: GameHistoryStats) => {
  const data: Array<{date: string; profit: number; cumulativeProfit: number}> = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Mock profit calculation - replace with real data
    const mockProfit = (Math.random() - 0.5) * 2; // Random profit between -1 and 1
    
    data.push({
      date: date.toISOString().split('T')[0],
      profit: mockProfit,
      cumulativeProfit: data.length > 0 ? data[data.length - 1].cumulativeProfit + mockProfit : mockProfit
    });
  }
  
  return data;
};

export const HistoryStats: React.FC<HistoryStatsProps> = ({ stats, className = '' }) => {
  const chartData = generateChartData(stats);
  
  // Calculate percentage changes
  const gamesChangePercent = stats.gamesLastWeek > 0 
    ? ((stats.gamesThisWeek - stats.gamesLastWeek) / stats.gamesLastWeek) * 100 
    : 0;
    
  const profitChangePercent = stats.profitLastWeek !== 0 
    ? ((stats.profitThisWeek - stats.profitLastWeek) / Math.abs(stats.profitLastWeek)) * 100 
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Games */}
        <StatCard
          title="Total Games"
          value={stats.totalGames.toLocaleString()}
          subtitle={`${stats.gamesThisWeek} this week`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          trend={gamesChangePercent !== 0 ? {
            value: Math.abs(gamesChangePercent),
            isPositive: gamesChangePercent > 0,
            label: 'vs last week'
          } : undefined}
        />

        {/* Win Rate */}
        <StatCard
          title="Win Rate"
          value={`${(stats.winRate * 100).toFixed(1)}%`}
          subtitle={`${stats.totalWins}W / ${stats.totalLosses}L`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Net Profit */}
        <StatCard
          title="Net Profit"
          value={
            <TokenAmount
              amount={Math.abs(stats.netProfit)}
              token="SOL"
              prefix={stats.netProfit >= 0 ? '+' : '-'}
              className={stats.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
            />
          }
          subtitle={`${stats.profitThisWeek >= 0 ? '+' : ''}${stats.profitThisWeek.toFixed(3)} SOL this week`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
          trend={profitChangePercent !== 0 ? {
            value: Math.abs(profitChangePercent),
            isPositive: profitChangePercent > 0,
            label: 'vs last week'
          } : undefined}
        />

        {/* Current Streak */}
        <StatCard
          title="Current Streak"
          value={
            <span className={stats.currentStreak >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {Math.abs(stats.currentStreak)} {stats.currentStreak >= 0 ? 'wins' : 'losses'}
            </span>
          }
          subtitle={`Best: ${stats.bestStreak} wins`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Volume */}
        <StatCard
          title="Total Volume"
          value={
            <TokenAmount
              amount={stats.totalVolume}
              token="SOL"
              className="text-gray-900 dark:text-white"
            />
          }
          subtitle="Total amount wagered"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
        />

        {/* Average Bet */}
        <StatCard
          title="Average Bet"
          value={
            <TokenAmount
              amount={stats.averageBet}
              token="SOL"
              className="text-gray-900 dark:text-white"
            />
          }
          subtitle="Per game average"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />

        {/* Largest Win */}
        <StatCard
          title="Largest Win"
          value={
            <TokenAmount
              amount={stats.largestWin}
              token="SOL"
              className="text-green-600 dark:text-green-400"
              prefix="+"
            />
          }
          subtitle="Best single game"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
            </svg>
          }
        />

        {/* Largest Loss */}
        <StatCard
          title="Largest Loss"
          value={
            <TokenAmount
              amount={Math.abs(stats.largestLoss)}
              token="SOL"
              className="text-red-600 dark:text-red-400"
              prefix="-"
            />
          }
          subtitle="Worst single game"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          }
        />
      </div>

      {/* Profit/Loss Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Profit/Loss Trend
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cumulative profit over the last 30 days
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {/* TODO: Add chart controls (timeframe selection) */}
            Last 30 days
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(2)} SOL`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(4)} SOL`, 'Cumulative P&L']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: '1px solid var(--tooltip-border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="cumulativeProfit" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart Legend */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          📊 Hover over the chart to see detailed profit/loss data for each day
        </div>
      </div>

      {/* Performance Insights */}
      {stats.totalGames > 10 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Performance Insights
              </h4>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                {stats.winRate > 0.6 && (
                  <p>✓ Excellent win rate! You're performing above average.</p>
                )}
                {stats.winRate < 0.4 && (
                  <p>⚠️ Your win rate is below 40%. Consider adjusting your strategy.</p>
                )}
                {stats.currentStreak >= 5 && (
                  <p>🔥 You're on a hot streak with {stats.currentStreak} consecutive wins!</p>
                )}
                {stats.currentStreak <= -3 && (
                  <p>📊 You've had {Math.abs(stats.currentStreak)} losses in a row. Take a break if needed.</p>
                )}
                {stats.netProfit > 0 && stats.winRate < 0.5 && (
                  <p>💰 Despite a low win rate, you're still profitable. Your risk management is working!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
