import React, { useState } from 'react';
import { useAnchorProgram } from '../hooks/useAnchorProgram';

const RefundManager: React.FC = () => {
  const { handleTimeout } = useAnchorProgram();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClaimRefund = async () => {
    if (!roomIdInput) {
      setError('Please enter a room ID');
      return;
    }

    const roomId = parseInt(roomIdInput, 10);
    if (Number.isNaN(roomId)) {
      setError('Please enter a valid room ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const result = await handleTimeout(roomId);

      setMessage(`Successfully claimed refund for room ${roomId}! Transaction: ${result.tx}`);
      setRoomIdInput('');
    } catch (err) {
      console.error('Refund error:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim refund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Claim Refund</h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Stuck SOL Recovery
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                If you created a room and no one joined, or if a game was abandoned,
                your SOL may be stuck in the escrow account. Use this function to claim it back.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
            Room ID
          </label>
          <input
            id="roomId"
            type="text"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Enter the Room ID to claim refund for"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <button
          type="button"
          onClick={handleClaimRefund}
          disabled={loading || !roomIdInput}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Claiming Refund...
            </div>
          ) : (
            'Claim Refund'
          )}
        </button>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-semibold mb-2">How it works:</h4>
        <ul className="space-y-1 text-sm">
          <li>• Enter the Room ID of the abandoned/stuck room</li>
          <li>• The smart contract will check if the room qualifies for a refund</li>
          <li>• If eligible, your escrowed SOL will be returned to your wallet</li>
          <li>• This works for rooms that are waiting for players or have selection timeouts</li>
        </ul>
      </div>
    </div>
  );
};

export default RefundManager;
