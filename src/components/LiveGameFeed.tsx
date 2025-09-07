import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import { useRealTimeGameUpdates } from '../hooks/useRealTimeGameUpdates';
import { formatAddress } from '../utils/address';

interface CompletedGame {
  id: string;
  roomId: string;
  winner: string;
  loser: string;
  betAmount: number;
  token: string;
  winnerChoice: 'heads' | 'tails';
  result: 'heads' | 'tails';
  payout: number;
  timestamp: number;
  signature: string;
}

interface LiveGameFeedProps {
  maxGames?: number;
  autoScroll?: boolean;
  showAnimation?: boolean;
  className?: string;
}

/**
 * LiveGameFeed - Shows a real-time feed of recently completed games
 *
 * Features:
 * - Real-time updates of game completions
 * - Smooth animations for new entries
 * - Virtual scrolling for performance
 * - Auto-scroll to latest games
 * - Game result verification links
 */
export const LiveGameFeed: React.FC<LiveGameFeedProps> = ({
  maxGames = 20,
  autoScroll = true,
  showAnimation = true,
  className = '',
}) => {
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [newGameIds, setNewGameIds] = useState<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement>(null);
  const { subscribe, unsubscribe } = useRealTimeGameUpdates();

  /**
   * Handle new game completion events
   */
  const handleGameCompleted = useCallback((event: any) => {
    if (event.type !== 'GameResolved') return;

    const { data } = event;
    const completedGame: CompletedGame = {
      id: `${data.roomId}_${event.timestamp}`,
      roomId: data.roomId,
      winner: data.winner,
      loser: data.loser,
      betAmount: data.betAmount || 0,
      token: data.token || 'SOL',
      winnerChoice: data.winnerChoice || 'heads',
      result: data.result || 'heads',
      payout: data.payout || 0,
      timestamp: event.timestamp,
      signature: event.signature || '',
    };

    setCompletedGames((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter((game) => game.id !== completedGame.id);
      // Add new game at the beginning
      const updated = [completedGame, ...filtered].slice(0, maxGames);
      return updated;
    });

    // Mark as new for animation
    if (showAnimation) {
      setNewGameIds((prev) => new Set(prev).add(completedGame.id));
      // Remove new status after animation
      setTimeout(() => {
        setNewGameIds((prev) => {
          const next = new Set(prev);
          next.delete(completedGame.id);
          return next;
        });
      }, 3000);
    }

    // Auto-scroll to top if enabled
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [maxGames, showAnimation, autoScroll]);

  // Subscribe to global game events
  useEffect(() => {
    const subscriptionId = subscribe('global', handleGameCompleted);
    return () => unsubscribe(subscriptionId);
  }, [subscribe, unsubscribe, handleGameCompleted]);

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  };

  /**
   * Get explorer URL for transaction
   */
  const getExplorerUrl = (signature: string): string => {
    // TODO: Use actual network configuration
    const network = 'devnet'; // or 'mainnet-beta'
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  };

  /**
   * Format token amount for display
   */
  const formatAmount = (amount: number, token: string): string => {
    if (token === 'SOL') {
      return `${(amount / 1e9).toFixed(4)} SOL`; // Convert lamports to SOL
    }
    return `${amount.toLocaleString()} ${token}`;
  };

  return (
    <div className={`live-game-feed ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Live Game Results
        </h3>
        <div className="flex items-center text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
          Live
        </div>
      </div>

      {/* Game Feed */}
      <div
        ref={feedRef}
        className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {completedGames.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">🎲</div>
            <p>Waiting for games to complete...</p>
          </div>
        ) : (
          completedGames.map((game) => (
            <GameFeedItem
              key={game.id}
              game={game}
              isNew={newGameIds.has(game.id)}
              formatTime={formatTime}
              formatAmount={formatAmount}
              getExplorerUrl={getExplorerUrl}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {completedGames.length > 0 && (
        <div className="mt-4 text-center text-xs text-gray-500">
          Showing last
          {' '}
          {Math.min(completedGames.length, maxGames)}
          {' '}
          completed games
        </div>
      )}
    </div>
  );
};

/**
 * Individual game feed item component
 */
interface GameFeedItemProps {
  game: CompletedGame;
  isNew: boolean;
  formatTime: (timestamp: number) => string;
  formatAmount: (amount: number, token: string) => string;
  getExplorerUrl: (signature: string) => string;
}

const GameFeedItem: React.FC<GameFeedItemProps> = ({
  game,
  isNew,
  formatTime,
  formatAmount,
  getExplorerUrl,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`
        border rounded-lg p-3 transition-all duration-300 cursor-pointer hover:shadow-md
        ${isNew
        ? 'border-green-400 bg-green-50 animate-pulse'
        : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Main Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Result Icon */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
            ${game.result === 'heads' ? 'bg-blue-500' : 'bg-red-500'}
          `}
          >
            {game.result === 'heads' ? 'H' : 'T'}
          </div>

          {/* Winner Info */}
          <div>
            <div className="font-medium text-gray-900">
              {formatAddress(game.winner)}
              {' '}
              won
            </div>
            <div className="text-sm text-gray-500">
              {formatAmount(game.payout, game.token)}
              {' '}
              payout
            </div>
          </div>
        </div>

        {/* Time and Amount */}
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {formatAmount(game.betAmount * 2, game.token)}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(game.timestamp)}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Winner chose:</span>
              <span className="ml-2 font-medium capitalize">{game.winnerChoice}</span>
            </div>
            <div>
              <span className="text-gray-500">Result:</span>
              <span className={`ml-2 font-medium capitalize ${
                game.result === game.winnerChoice ? 'text-green-600' : 'text-red-600'
              }`}
              >
                {game.result}
              </span>
            </div>
          </div>

          <div>
            <span className="text-gray-500">Loser:</span>
            <span className="ml-2 font-mono text-xs">{formatAddress(game.loser)}</span>
          </div>

          <div>
            <span className="text-gray-500">Room ID:</span>
            <span className="ml-2 font-mono text-xs">{formatAddress(game.roomId)}</span>
          </div>

          {/* Transaction Link */}
          {game.signature && (
            <div className="pt-2">
              <a
                href={getExplorerUrl(game.signature)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Explorer
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
