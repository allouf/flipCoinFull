import { useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { webSocketManager } from '../services/WebSocketManager';
import { WEBSOCKET_CONFIG } from '../config/constants';

export const useWebSocket = () => {
  const { publicKey } = useWallet();
  const connectedRef = useRef(false);
  const lastWalletRef = useRef<string | null>(null);

  // Connect to WebSocket when wallet connects
  useEffect(() => {
    const walletAddress = publicKey?.toString();

    // Only connect if we have a wallet and haven't connected yet
    // or if the wallet has changed
    if (walletAddress && (!connectedRef.current || lastWalletRef.current !== walletAddress)) {
      console.log('🔌 Connecting to WebSocket server...');

      webSocketManager.connect(WEBSOCKET_CONFIG.SERVER_URL, walletAddress)
        .then(() => {
          console.log('✅ WebSocket connected successfully');
          connectedRef.current = true;
          lastWalletRef.current = walletAddress;
        })
        .catch((error) => {
          console.error('❌ Failed to connect to WebSocket:', error);
          connectedRef.current = false;
        });
    }

    // Disconnect when wallet disconnects
    if (!walletAddress && connectedRef.current) {
      console.log('🔌 Disconnecting WebSocket (wallet disconnected)');
      webSocketManager.disconnect();
      connectedRef.current = false;
      lastWalletRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (connectedRef.current) {
        webSocketManager.disconnect();
        connectedRef.current = false;
      }
    };
  }, [publicKey]);

  // Subscribe to a specific room
  const subscribeToRoom = useCallback((roomId: string) => {
    if (connectedRef.current) {
      webSocketManager.subscribeToRoom(roomId);
    }
  }, []);

  // Unsubscribe from a room
  const unsubscribeFromRoom = useCallback((roomId: string) => {
    if (connectedRef.current) {
      webSocketManager.unsubscribeFromRoom(roomId);
    }
  }, []);

  // Send a game event
  const sendGameEvent = useCallback((type: string, roomId: string, data: any) => {
    if (connectedRef.current && publicKey) {
      webSocketManager.sendMessage('game_event', {
        type,
        roomId,
        playerId: publicKey.toString(),
        data,
        timestamp: Date.now()
      });
    }
  }, [publicKey]);

  // Send a chat message
  const sendChatMessage = useCallback((roomId: string, message: string) => {
    if (connectedRef.current) {
      webSocketManager.sendMessage('send_message', {
        roomId,
        message
      });
    }
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return webSocketManager.getConnectionStatus();
  }, []);

  return {
    subscribeToRoom,
    unsubscribeFromRoom,
    sendGameEvent,
    sendChatMessage,
    getConnectionStatus,
    webSocketManager
  };
};