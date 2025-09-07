import { useState, useEffect } from 'react';
import { Room, GameResult, GameStats } from '../utils/types';

// React hook for using the store

interface GameState {
  // Room management
  rooms: Room[];
  currentRoom: Room | null;

  // Game history and stats
  gameHistory: GameResult[];
  gameStats: GameStats;

  // UI state
  loading: boolean;
  error: string | null;
}

// Simple store implementation without external dependencies
class GameStore {
  private state: GameState = {
    rooms: [],
    currentRoom: null,
    gameHistory: [],
    gameStats: this.initialGameStats,
    loading: false,
    error: null,
  };

  private listeners: Array<() => void> = [];

  private get initialGameStats(): GameStats { // eslint-disable-line class-methods-use-this
    return {
      totalGames: 0,
      totalVolume: 0,
      activeRooms: 0,
      userWins: 0,
      userLosses: 0,
    };
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private setState(updates: Partial<GameState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  getState(): GameState {
    return this.state;
  }

  // Basic state setters
  setRooms = (rooms: Room[]) => {
    this.setState({ rooms });
  };

  addRoom = (room: Room) => {
    this.setState({ rooms: [...this.state.rooms, room] });
  };

  setCurrentRoom = (room: Room | null) => {
    this.setState({ currentRoom: room });
  };

  addGameResult = (result: GameResult) => {
    this.setState({ gameHistory: [result, ...this.state.gameHistory] });
  };

  setLoading = (loading: boolean) => {
    this.setState({ loading });
  };

  setError = (error: string | null) => {
    this.setState({ error });
  };

  clearError = () => {
    this.setState({ error: null });
  };

  // Game actions (placeholder implementations)
  createRoom = async (betAmount: number, minBet: number, maxBet: number) => {
    this.setState({ loading: true, error: null });

    try {
      // Placeholder - actual blockchain interaction will go here
      // eslint-disable-next-line no-console
      console.log('Creating room with:', { betAmount, minBet, maxBet });

      // Simulate async operation
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      // Mock room creation
      const newRoom: Room = {
        id: `room_${Date.now()}`,
        creator: 'mock-user-public-key',
        betAmount,
        minBet,
        maxBet,
        isActive: true,
        createdAt: new Date(),
      };

      this.addRoom(newRoom);
      this.setState({ currentRoom: newRoom });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create room:', error);
      this.setState({ error: 'Failed to create room' });
    } finally {
      this.setState({ loading: false });
    }
  };

  joinRoom = async (roomId: string) => {
    this.setState({ loading: true, error: null });

    try {
      // eslint-disable-next-line no-console
      console.log('Joining room:', roomId);

      // Placeholder - actual blockchain interaction will go here
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      // Mock joining room
      const room = this.state.rooms.find((r) => r.id === roomId);
      if (room) {
        this.setState({ currentRoom: room });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to join room:', error);
      this.setState({ error: 'Failed to join room' });
    } finally {
      this.setState({ loading: false });
    }
  };

  flipCoin = async (roomId: string, choice: 'heads' | 'tails') => {
    this.setState({ loading: true, error: null });

    try {
      // eslint-disable-next-line no-console
      console.log('Flipping coin for room:', roomId, 'choice:', choice);

      // Placeholder - actual blockchain interaction will go here
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      }); // Simulate flip animation time

      // Mock flip result
      const flipResult = Math.random() > 0.5 ? 'heads' : 'tails';
      const won = flipResult === choice;

      // eslint-disable-next-line no-console
      console.log('Flip result:', flipResult, 'Won:', won);

      // Update game stats (mock)
      this.setState({
        gameStats: {
          ...this.state.gameStats,
          totalGames: this.state.gameStats.totalGames + 1,
          userWins: won ? this.state.gameStats.userWins + 1 : this.state.gameStats.userWins,
          userLosses: !won ? this.state.gameStats.userLosses + 1 : this.state.gameStats.userLosses,
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to flip coin:', error);
      this.setState({ error: 'Failed to flip coin' });
    } finally {
      this.setState({ loading: false });
    }
  };
}

export const gameStore = new GameStore();

export const useGameStore = () => {
  const [state, setState] = useState(gameStore.getState());

  useEffect(() => {
    const unsubscribe = gameStore.subscribe(() => {
      setState(gameStore.getState());
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    // Actions
    createRoom: gameStore.createRoom,
    joinRoom: gameStore.joinRoom,
    flipCoin: gameStore.flipCoin,
    setRooms: gameStore.setRooms,
    addRoom: gameStore.addRoom,
    setCurrentRoom: gameStore.setCurrentRoom,
    addGameResult: gameStore.addGameResult,
    setLoading: gameStore.setLoading,
    setError: gameStore.setError,
    clearError: gameStore.clearError,
  };
};
