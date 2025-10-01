import { useCallback, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { PROGRAM_ID } from '../config/program';

// Import the correct program ID from config

export interface PublicGameInfo {
  gameId: number;
  gamePda: string;
  playerA: string;
  betAmount: number; // in SOL
  createdAt: Date;
  timeRemaining: number; // seconds until timeout
  status: 'WaitingForPlayer' | 'PlayersReady' | 'CommitmentsReady' | 'RevealingPhase' | 'Resolved' | 'TimedOut';
}

export interface GameDiscoveryState {
  games: PublicGameInfo[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

// Global variable to prevent multiple simultaneous calls
let isCurrentlyFetching = false;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 10000; // 10 seconds minimum between fetches (increased from 5s)
let fetchPromise: Promise<void> | null = null; // Share the same promise across instances

export const useGameDiscovery = () => {
  const { connection } = useConnection();
  const [state, setState] = useState<GameDiscoveryState>({
    games: [],
    isLoading: false,
    error: null,
    lastRefresh: null,
  });

  // Fetch all public games waiting for players
  const fetchPublicGames = useCallback(async () => {
    if (!connection) return;

    // Prevent multiple simultaneous calls
    const now = Date.now();
    if (isCurrentlyFetching) {
      console.log('⚠️ Fetch already in progress, waiting for existing request...');
      // Wait for the existing request to complete
      if (fetchPromise) {
        await fetchPromise;
      }
      return;
    }

    // Prevent too frequent calls
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      console.log(`⚠️ Too soon since last fetch (${now - lastFetchTime}ms ago), skipping...`);
      return;
    }

    isCurrentlyFetching = true;
    lastFetchTime = now;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Create a shared promise for this fetch operation
    fetchPromise = (async () => {

    try {
      console.log('🔍 Fetching public games...');

      // Debug: Log the program ID being used
      console.log(`🔍 Searching for games from program: ${PROGRAM_ID.toString()}`);
      
      // Try without filters first to see all accounts
      console.log('🔍 Fetching ALL accounts from program (no filters)...');
      const allAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        commitment: 'confirmed',
      });
      
      console.log(`📊 Found ${allAccounts.length} total accounts from program`);
      
      // Now try with data size filter
      const filters: GetProgramAccountsFilter[] = [
        {
          dataSize: 296, // Updated to match your transaction: 296 bytes
        },
      ];

      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters,
        commitment: 'confirmed',
      });
      
      console.log(`📊 Found ${accounts.length} accounts with dataSize filter (296 bytes)`);
      
      // If filtered results are empty but total accounts exist, use all accounts and log sizes
      let accountsToProcess = accounts;
      if (accounts.length === 0 && allAccounts.length > 0) {
        console.log('🔍 No accounts found with 296 bytes filter, using all accounts...');
        allAccounts.forEach((acc, index) => {
          console.log(`   Account ${index}: ${acc.pubkey.toString()} - Size: ${acc.account.data.length} bytes`);
        });
        accountsToProcess = allAccounts; // Use all accounts if filter fails
      }

      const games: PublicGameInfo[] = [];
      const now = new Date();

      console.log(`📊 Processing ${accountsToProcess.length} accounts...`);
      
      for (const { pubkey, account } of accountsToProcess) {
        try {
          // Parse account data (simplified parsing without full IDL)
          const data = account.data;
          console.log(`🔍 Processing account ${pubkey.toString()}, size: ${data.length}`);
          
          if (data.length < 100) {
            console.log(`⚠️ Skipping account - too small (${data.length} bytes)`);
            continue;
          }

          // Basic parsing to extract key information
          // Note: This is a simplified approach - in production you'd use the full IDL
          
          // First 8 bytes are discriminator, then fields follow in order
          const gameId = data.readBigUInt64LE(8); // Skip discriminator
          const playerA = new PublicKey(data.subarray(16, 48));
          const playerB = new PublicKey(data.subarray(48, 80));
          const betAmount = data.readBigUInt64LE(80);
          
          // Log account structure for debugging
          console.log(`🔍 Account ${pubkey.toString().slice(0, 8)}... structure:`);
          console.log(`   Discriminator: ${Array.from(data.subarray(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
          console.log(`   Game ID: ${Number(gameId)}`);
          console.log(`   Player A: ${playerA.toString()}`);
          console.log(`   Player B: ${playerB.toString()}`);
          console.log(`   Bet Amount: ${Number(betAmount)} lamports (${Number(betAmount) / 1e9} SOL)`);
          console.log(`   Total size: ${data.length} bytes`);
          
          // Parse timestamp from correct position in Game struct based on IDL
          // Calculate exact offset based on IDL structure:
          // discriminator(8) + gameId(8) + playerA(32) + playerB(32) + betAmount(8) + 
          // houseWallet(32) + commitmentA(32) + commitmentB(32) + commitmentsComplete(1) +
          // choiceA(9) + secretA(9) + choiceB(9) + secretB(9) + status(1) + 
          // coinResult(33) + winner(33) + houseFee(8) + createdAt(8)
          // Calculated offset should be: 8+8+32+32+8+32+32+32+1+9+9+9+9+1+33+33+8 = 254
          
          // Initialize with fallback value to avoid TypeScript error
          let createdAt: bigint = BigInt(Math.floor(Date.now() / 1000));
          let timestampFound = false;
          // Try the calculated offset first, then some nearby offsets in case of alignment issues
          const possibleOffsets = [254, 256, 252, 248, 260]; // Start with calculated offset
          
          for (const offset of possibleOffsets) {
            try {
              if (data.length >= offset + 8) {
                const testTimestamp = data.readBigInt64LE(offset);
                console.log(`🕰️ Testing offset ${offset}: ${Number(testTimestamp)} (${new Date(Number(testTimestamp) * 1000).toLocaleString()})`);
                
                // Validate timestamp - should be reasonable (after Jan 1 2020, before 2030)
                if (Number(testTimestamp) >= 1577836800 && Number(testTimestamp) <= 1893456000) {
                  createdAt = testTimestamp;
                  timestampFound = true;
                  console.log(`✅ Valid timestamp found at offset ${offset}`);
                  break;
                }
              }
            } catch (err) {
              console.log(`❌ Failed to read timestamp at offset ${offset}: ${err}`);
              continue;
            }
          }
          
          if (!timestampFound) {
            console.warn(`🕰️ No valid timestamp found, using current time fallback`);
          }
          
          console.log(`🎮 Found game ${Number(gameId)}: playerA=${playerA.toString()}, playerB=${playerB.toString()}, bet=${Number(betAmount)}`);
          
          // Check game status by examining playerB and actual game status field
          const systemProgram = new PublicKey('11111111111111111111111111111111');
          const isWaitingForPlayer = playerB.equals(systemProgram);
          
          // Try to read the actual status field from the account data
          // Status is an enum at a specific offset in the Game struct
          // Based on the IDL: after discriminator(8) + gameId(8) + playerA(32) + playerB(32) + betAmount(8) + 
          // houseWallet(32) + commitmentA(32) + commitmentB(32) + commitmentsComplete(1) +
          // choiceA(9) + secretA(9) + choiceB(9) + secretB(9) + status(1)
          // Status offset should be around: 8+8+32+32+8+32+32+32+1+9+9+9+9 = 221
          let status: 'WaitingForPlayer' | 'PlayersReady' | 'CommitmentsReady' | 'RevealingPhase' | 'Resolved' | 'TimedOut' = 'WaitingForPlayer';
          
          if (isWaitingForPlayer) {
            status = 'WaitingForPlayer';
          } else {
            // Game has both players - try to read the actual status byte
            try {
              if (data.length > 221) {
                const statusByte = data.readUInt8(221);
                console.log(`📊 Game ${Number(gameId)} status byte: ${statusByte}`);
                
                // Status enum values (from updated smart contract):
                // WaitingForPlayer = 0, PlayersReady = 1, CommitmentsReady = 2, RevealingPhase = 3, Resolved = 4, TimedOut = 5
                switch (statusByte) {
                  case 0: status = 'WaitingForPlayer'; break;
                  case 1: status = 'PlayersReady'; break;
                  case 2: status = 'CommitmentsReady'; break;
                  case 3: status = 'RevealingPhase'; break;
                  case 4: status = 'Resolved'; break;
                  case 5: status = 'TimedOut'; break;
                  default: 
                    console.warn(`Unknown status byte ${statusByte}, defaulting to PlayersReady`);
                    status = 'PlayersReady';
                }
              } else {
                // Fallback: if we can't read status but both players exist, assume players ready
                status = 'PlayersReady';
              }
            } catch (err) {
              console.warn(`Failed to read game status, defaulting to PlayersReady:`, err);
              status = 'PlayersReady';
            }
          }
          
          // For available games tab, only show games waiting for players
          // For running games tab, show games with both players
          // We'll let the filtering happen in the UI component

          // Calculate time remaining (using timeout from config: 300 seconds for testing)
          const gameCreatedAt = new Date(Number(createdAt) * 1000); // Convert seconds to milliseconds
          const timeoutAt = new Date(gameCreatedAt.getTime() + (300 * 1000)); // 300 seconds timeout for easier testing
          const timeRemaining = Math.max(0, Math.floor((timeoutAt.getTime() - now.getTime()) / 1000));
          
          console.log(`🕒 Game ${Number(gameId)} timing:`);
          console.log(`   Created: ${gameCreatedAt.toLocaleString()}`);
          console.log(`   Timeout: ${timeoutAt.toLocaleString()}`);
          console.log(`   Current: ${now.toLocaleString()}`);
          console.log(`   Remaining: ${timeRemaining} seconds`);

          // Skip expired games
          if (timeRemaining <= 0) {
            console.log(`⏰ Skipping expired game ${Number(gameId)} (expired ${Math.abs(timeRemaining)} seconds ago)`);
            continue;
          }

          const gameInfo = {
            gameId: Number(gameId),
            gamePda: pubkey.toString(),
            playerA: playerA.toString(),
            betAmount: Number(betAmount) / 1000000000, // Convert from lamports to SOL
            createdAt: gameCreatedAt,
            timeRemaining,
            status,
          };
          
          console.log(`✅ Added game to list:`, gameInfo);
          games.push(gameInfo);
        } catch (parseError) {
          console.warn(`❌ Failed to parse game account ${pubkey.toString()}:`, parseError);
          continue;
        }
      }

      // Sort by newest first
      games.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`✅ Found ${games.length} public games`);

      setState(prev => ({
        ...prev,
        games,
        isLoading: false,
        lastRefresh: now,
      }));

    } catch (error) {
      console.error('❌ Failed to fetch public games:', error);
      
      let errorMessage = 'Failed to fetch games';
      if (error instanceof Error) {
        if (error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait before refreshing again.';
          // Add extra delay for 429 errors
          lastFetchTime = Date.now() + 15000; // Add 15 second penalty
        } else {
          errorMessage = error.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    } finally {
      // Always reset the fetching flag
      isCurrentlyFetching = false;
      fetchPromise = null;
    }
    })();

    await fetchPromise;
  }, [connection]);

  // No automatic fetching - only manual refresh

  // Manual refresh function
  const refreshGames = useCallback(() => {
    fetchPublicGames();
  }, [fetchPublicGames]);

  // Filter games by criteria
  const filterGamesByBetRange = useCallback((minBet: number, maxBet: number) => {
    return state.games.filter(game => game.betAmount >= minBet && game.betAmount <= maxBet);
  }, [state.games]);

  const filterGamesByPlayer = useCallback((playerAddress: string) => {
    return state.games.filter(game => 
      game.playerA.toLowerCase().includes(playerAddress.toLowerCase())
    );
  }, [state.games]);

  // Generate shareable URL for a game
  const generateGameShareUrl = useCallback((gameId: number, gamePda: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/game/${gameId}`;
  }, []);

  return {
    ...state,
    refreshGames,
    filterGamesByBetRange,
    filterGamesByPlayer,
    generateGameShareUrl,
  };
};
