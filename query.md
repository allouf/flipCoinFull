 Phantom was registered as a Standard Wallet. The Wallet Adapter for Phantom can be removed from your app.
(anonymous) @ bundle.js:24416
(anonymous) @ bundle.js:24410
mountMemo @ bundle.js:75750
useMemo @ bundle.js:76135
useMemo @ bundle.js:95161
useStandardWalletAdapters @ bundle.js:24410
WalletProvider @ bundle.js:22301
renderWithHooks @ bundle.js:74978
mountIndeterminateComponent @ bundle.js:78950
beginWork @ bundle.js:80253
beginWork$1 @ bundle.js:85212
performUnitOfWork @ bundle.js:84482
workLoopSync @ bundle.js:84405
renderRootSync @ bundle.js:84378
performConcurrentWorkOnRoot @ bundle.js:83773
workLoop @ bundle.js:96834
flushWork @ bundle.js:96812
performWorkUntilDeadline @ bundle.js:97049
 ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
warnOnce @ bundle.js:90838
logDeprecation @ bundle.js:90841
logV6DeprecationWarnings @ bundle.js:90844
(anonymous) @ bundle.js:89014
commitHookEffectListMount @ bundle.js:81565
commitPassiveMountOnFiber @ bundle.js:83058
commitPassiveMountEffects_complete @ bundle.js:83030
commitPassiveMountEffects_begin @ bundle.js:83020
commitPassiveMountEffects @ bundle.js:83010
flushPassiveEffectsImpl @ bundle.js:84893
flushPassiveEffects @ bundle.js:84846
(anonymous) @ bundle.js:84661
workLoop @ bundle.js:96834
flushWork @ bundle.js:96812
performWorkUntilDeadline @ bundle.js:97049
 ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
warnOnce @ bundle.js:90838
logDeprecation @ bundle.js:90841
logV6DeprecationWarnings @ bundle.js:90847
(anonymous) @ bundle.js:89014
commitHookEffectListMount @ bundle.js:81565
commitPassiveMountOnFiber @ bundle.js:83058
commitPassiveMountEffects_complete @ bundle.js:83030
commitPassiveMountEffects_begin @ bundle.js:83020
commitPassiveMountEffects @ bundle.js:83010
flushPassiveEffectsImpl @ bundle.js:84893
flushPassiveEffects @ bundle.js:84846
(anonymous) @ bundle.js:84661
workLoop @ bundle.js:96834
flushWork @ bundle.js:96812
performWorkUntilDeadline @ bundle.js:97049
 ✅ IndexedDB initialized
 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: false, publicKey: undefined}
 ⚠️ useAnchorProgram: No wallet or public key, clearing program
 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: true, publicKey: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj'}
 🔗 useAnchorProgram: Creating Anchor provider and program...
 ✅ useAnchorProgram: Program initialized with ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
 🚀 useAnchorProgram: Program ready for use!
 🔍 Fetching game data for ID: 53227721
53227721:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">
 📦 Game data received: {gameId: 53227721, betAmount: 0.01, playerA: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerB: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj', status: 'playersReady', …}
 🎮 Game Status Check: {gameId: 53227721, currentUser: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj', playerA: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerB: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj', isPlayerA: false, …}
 ✅ User is a player in this game
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: true, publicKey: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj'}
 🔗 useAnchorProgram: Creating Anchor provider and program...
 ✅ useAnchorProgram: Program initialized with ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
 🚀 useAnchorProgram: Program ready for use!
 🚀 useLobbyData: useEffect triggered {isProgramReady: false}
 ⏳ useLobbyData: Waiting for program to be ready...
 🔌 WebSocket not connected, attempting to connect...
 
==================================================
 🎬 WEBSOCKET CONNECT - START
 ==================================================
 🕒 Timestamp: 2025-10-06T08:13:02.790Z
 📋 Input: {serverUrl: 'ws://localhost:4000', walletAddress: 'None', timeout: '10000ms', reconnection: 'Manual (disabled auto-reconnect)'}
 
📍 Step 1: Initialize Socket.IO Client
   url: ws://localhost:4000
   transports: ['websocket']
   timeout: 10000
 
📍 Step 2: Setup Event Handlers
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 🚀 useLobbyData: useEffect triggered {isProgramReady: true}
 🎯 useLobbyData: Program ready, starting initial fetch
 🔍 useLobbyData: refreshData called {isProgramReady: true, userInitiated: false}
 📡 useLobbyData: Fetching rooms from blockchain...
 🚀 Making fresh request for fetchAllGameRooms
 🚀 Starting optimized fetchAllGameRooms...
 🔌 WebSocket not connected, attempting to connect for lobby updates...
 
==================================================
 🎬 WEBSOCKET CONNECT - START
 ==================================================
 🕒 Timestamp: 2025-10-06T08:13:02.806Z
 📋 Input: {serverUrl: 'ws://localhost:4000', walletAddress: 'None', timeout: '10000ms', reconnection: 'Manual (disabled auto-reconnect)'}
 
📍 Step 1: Initialize Socket.IO Client
   url: ws://localhost:4000
   transports: ['websocket']
   timeout: 10000
 
📍 Step 2: Setup Event Handlers
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
debugLogger.ts:183 ✅ 🌐 WebSocket connected successfully
debugLogger.ts:185   Data: {lastConnected: '2025-10-06T08:13:02.812Z', reconnectAttempts: 0}
GameInterface.tsx:503 🔄 WebSocket reconnected, re-subscribing to room: 53227721
debugLogger.ts:169 ℹ️  🔔 Subscribing to room updates
debugLogger.ts:171   Data: {roomId: '53227721', socketConnected: true}
debugLogger.ts:183 ✅ ✅ Subscribed to room
debugLogger.ts:185   Data: {roomId: '53227721'}
GameInterface.tsx:481 ✅ Subscribed to room after connection: 53227721
debugLogger.ts:169 ℹ️  💓 Starting heartbeat mechanism
debugLogger.ts:169 ℹ️  📬 Processing queued messages
debugLogger.ts:171   Data: {queuedCount: 0}
debugLogger.ts:183 ✅ 🌐 WebSocket connected successfully
debugLogger.ts:185   Data: {lastConnected: '2025-10-06T08:13:02.813Z', reconnectAttempts: 0}
debugLogger.ts:169 ℹ️  💓 Starting heartbeat mechanism
debugLogger.ts:169 ℹ️  📬 Processing queued messages
debugLogger.ts:171   Data: {queuedCount: 0}
debugLogger.ts:59 
==================================================
debugLogger.ts:60 ✅ WEBSOCKET CONNECT - SUCCESS
debugLogger.ts:61 ==================================================
debugLogger.ts:62 🕒 Completed at: 2025-10-06T08:13:02.814Z
debugLogger.ts:65 📤 Output: {connected: true, serverUrl: 'ws://localhost:4000'}
debugLogger.ts:68 ==================================================

debugLogger.ts:183 ✅ 🌐 WebSocket connected successfully
debugLogger.ts:185   Data: {lastConnected: '2025-10-06T08:13:02.814Z', reconnectAttempts: 0}
debugLogger.ts:169 ℹ️  💓 Starting heartbeat mechanism
debugLogger.ts:169 ℹ️  📬 Processing queued messages
debugLogger.ts:171   Data: {queuedCount: 0}
debugLogger.ts:183 ✅ 🌐 WebSocket connected successfully
debugLogger.ts:185   Data: {lastConnected: '2025-10-06T08:13:02.814Z', reconnectAttempts: 0}
debugLogger.ts:169 ℹ️  💓 Starting heartbeat mechanism
debugLogger.ts:169 ℹ️  📬 Processing queued messages
debugLogger.ts:171   Data: {queuedCount: 0}
debugLogger.ts:59 
==================================================
debugLogger.ts:60 ✅ WEBSOCKET CONNECT - SUCCESS
debugLogger.ts:61 ==================================================
debugLogger.ts:62 🕒 Completed at: 2025-10-06T08:13:02.815Z
debugLogger.ts:65 📤 Output: {connected: true, serverUrl: 'ws://localhost:4000'}
debugLogger.ts:68 ==================================================

useAnchorProgram.ts:761 📊 Found 11 total accounts for program
useAnchorProgram.ts:792 ✅ Successfully processed 11 game rooms
useLobbyData.ts:103 ✅ useLobbyData: Fetched rooms: 11 (11) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
GameInterface.tsx:385 🔍 Looking for game in allRooms with ID: 53227721 Available rooms: 11
GameInterface.tsx:396 📊 Found game data: {gameId: BN, playerA: PublicKey, playerB: PublicKey, betAmount: BN, houseWallet: PublicKey, …}
GameInterface.tsx:435 🎯 Both players ready - rejoining game
useFairCoinFlipper.ts:1396 Rejoining game: 53227721
debugLogger.ts:169 ℹ️  🔔 Subscribing to room updates
debugLogger.ts:171   Data: {roomId: '53227721', socketConnected: true}
debugLogger.ts:183 ✅ ✅ Subscribed to room
debugLogger.ts:185   Data: {roomId: '53227721'}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: true, …}
useFairCoinFlipper.ts:969 🎮 Loading game 53227721 directly via PDA: GXju1z2CFNsvQa9F34CaWDrJNX45LZ6eoSH83XiWTP1Z
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
useFairCoinFlipper.ts:992 🎮 Loading existing game state: {gameId: 53227721, isPlayerA: false, isPlayerB: true, betAmount: 0.01, status: {…}}
useFairCoinFlipper.ts:1010 🔍 [REJOIN] Commitment Status Check: {gameId: 53227721, currentPlayer: 'Player B', hasPlayerACommitted: false, hasPlayerBCommitted: false, hasCurrentPlayerCommitted: false, …}
useFairCoinFlipper.ts:1036 🎲 [REJOIN] Current player needs to make commitment
useFairCoinFlipper.ts:598 Starting commitment polling for game: 53227721
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:552 🔐 Making commitment with choice: tails
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
useFairCoinFlipper.ts:1158 🔍 Checking blockchain state before commitment...
useFairCoinFlipper.ts:1161 📊 Game account fetched: {playerA: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerB: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj', status: {…}}
useFairCoinFlipper.ts:1171 👤 Player role check: {walletAddress: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj', isPlayerA: false, isPlayerB: true}
useFairCoinFlipper.ts:1188 🔐 Commitment check: {commitmentA: Array(8), commitmentB: Array(8), hasPlayerACommitted: false, hasPlayerBCommitted: false, hasCurrentPlayerCommitted: false, …}
useFairCoinFlipper.ts:1222 📤 Sending commitment to blockchain... {gameId: 53227721, choice: 'tails', commitment: Array(32)}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
useFairCoinFlipper.ts:1237 ✅ Commitment transaction successful: C7puQ1W8DMo8r5S1k5CfuwDy9EnZERxje7LmYY3fsiUdj6ExiT5fFWKAk7rmwYHRsEDawppaF9whmmtzqWR58Kz
debugLogger.ts:41 
==================================================
debugLogger.ts:42 🎬 STORE COMMITMENT - START
debugLogger.ts:43 ==================================================
debugLogger.ts:44 🕒 Timestamp: 2025-10-06T08:13:17.872Z
debugLogger.ts:47 📋 Input: {walletAddress: '6GpnMc6s...', roomId: 53227721, choice: 'tails', commitmentHash: 'cd6bbcfd8c35f34a...'}
debugLogger.ts:100 
📍 Step 1: Prepare Commitment Data
debugLogger.ts:107   walletAddress: 6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj
debugLogger.ts:107   roomId: 53227721
debugLogger.ts:107   choice: tails
debugLogger.ts:107   choiceNum: 1
debugLogger.ts:107   secretLength: 16
debugLogger.ts:107   commitmentLength: 32
debugLogger.ts:107   storageLocation: CLIENT-SIDE ONLY (IndexedDB + localStorage)
debugLogger.ts:197 ⚠️  🔒 SECURITY: Secret NEVER leaves your device!
warning @ debugLogger.ts:197
storeCommitment @ commitmentService.ts:68
(anonymous) @ useFairCoinFlipper.ts:1252
await in (anonymous)
handleMakeCommitment @ GameInterface.tsx:553
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
debugLogger.ts:199   Data: {backend: 'CANNOT see your choice', storage: 'IndexedDB (primary) + localStorage (backup)', secure: true}
warning @ debugLogger.ts:199
storeCommitment @ commitmentService.ts:68
(anonymous) @ useFairCoinFlipper.ts:1252
await in (anonymous)
handleMakeCommitment @ GameInterface.tsx:553
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
debugLogger.ts:100 
📍 Step 2: Store in IndexedDB (Primary Storage)
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: true, …}
indexedDBStorage.ts:77 ✅ Commitment stored locally for room 53227721
debugLogger.ts:183 ✅ ✅ Commitment stored in IndexedDB
debugLogger.ts:185   Data: {duration: '5.80ms', size: '297 bytes'}
debugLogger.ts:100 
📍 Step 3: Store in localStorage (Backup Storage)
debugLogger.ts:183 ✅ ✅ Commitment also stored in localStorage
debugLogger.ts:185   Data: {key: 'commitment_6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj_53227721', duration: '0.00ms', size: '297 bytes'}
debugLogger.ts:59 
==================================================
debugLogger.ts:60 ✅ STORE COMMITMENT - SUCCESS
debugLogger.ts:61 ==================================================
debugLogger.ts:62 🕒 Completed at: 2025-10-06T08:13:17.879Z
debugLogger.ts:65 📤 Output: {success: true, storage: 'client-side-only', locations: Array(2), walletAddress: '6GpnMc6s...', roomId: 53227721}
debugLogger.ts:68 ==================================================

useFairCoinFlipper.ts:1259 💾 Commitment stored securely on your device (IndexedDB + localStorage backup)
useFairCoinFlipper.ts:598 Starting commitment polling for game: 53227721
GameInterface.tsx:555 ✅ Commitment successful!
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
GameInterface.tsx:560 🔥 REVEAL BUTTON CLICKED! {phase: 'revealing', gameId: 53227721, playerChoice: 'tails', isLoading: false}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'CommitmentsReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'CommitmentsReady', isLoading: true, …}
useFairCoinFlipper.ts:1584 📊 Reveal check: {status: 'revealingPhase', isPlayerA: false, hasPlayerARevealed: true, hasPlayerBRevealed: false, canReveal: true}
useFairCoinFlipper.ts:1599 📤 Revealing choice: {choice: 'tails', choiceEnum: {…}, secret: 3774333866409918}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'CommitmentsReady', isLoading: true, …}
useFairCoinFlipper.ts:560 Handling game resolution: {gameId: BN, playerA: PublicKey, playerB: PublicKey, betAmount: BN, houseWallet: PublicKey, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'resolved', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'Resolved', isLoading: true, …}
GameInterface.tsx:573 ✅ Choice revealed successfully, starting coin flip animation
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'resolved', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'Resolved', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'resolved', gameId: 53227721, playerChoice: 'tails', blockchainStatus: 'Resolved', isLoading: false, …}
debugLogger.ts:169 ℹ️  🔕 Unsubscribing from room updates
debugLogger.ts:171   Data: {roomId: '53227721'}
debugLogger.ts:183 ✅ ✅ Unsubscribed from room
debugLogger.ts:185   Data: {roomId: '53227721'}
useAnchorProgram.ts:105 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: true, publicKey: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj'}
useAnchorProgram.ts:119 🔗 useAnchorProgram: Creating Anchor provider and program...
useAnchorProgram.ts:140 ✅ useAnchorProgram: Program initialized with ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
useAnchorProgram.ts:146 🚀 useAnchorProgram: Program ready for use!
useWebSocket.ts:18 🔌 Connecting to WebSocket server...
debugLogger.ts:41 
==================================================
debugLogger.ts:42 🎬 WEBSOCKET CONNECT - START
debugLogger.ts:43 ==================================================
debugLogger.ts:44 🕒 Timestamp: 2025-10-06T08:15:00.890Z
debugLogger.ts:47 📋 Input: {serverUrl: 'ws://localhost:4000', walletAddress: '6GpnMc6s...', timeout: '10000ms', reconnection: 'Manual (disabled auto-reconnect)'}
debugLogger.ts:100 
📍 Step 1: Initialize Socket.IO Client
debugLogger.ts:107   url: ws://localhost:4000
debugLogger.ts:105   transports: ['websocket']
debugLogger.ts:107   timeout: 10000
debugLogger.ts:100 
📍 Step 2: Setup Event Handlers
useAnchorProgram.ts:105 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: true, publicKey: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj'}
useAnchorProgram.ts:119 🔗 useAnchorProgram: Creating Anchor provider and program...
useAnchorProgram.ts:140 ✅ useAnchorProgram: Program initialized with ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
useAnchorProgram.ts:146 🚀 useAnchorProgram: Program ready for use!
useLobbyData.ts:121 🚀 useLobbyData: useEffect triggered {isProgramReady: false}
useLobbyData.ts:126 ⏳ useLobbyData: Waiting for program to be ready...
useLobbyData.ts:121 🚀 useLobbyData: useEffect triggered {isProgramReady: true}
useLobbyData.ts:123 🎯 useLobbyData: Program ready, starting initial fetch
useLobbyData.ts:91 🔍 useLobbyData: refreshData called {isProgramReady: true, userInitiated: false}
useLobbyData.ts:101 📡 useLobbyData: Fetching rooms from blockchain...
rpcManager.ts:234 🚀 Making fresh request for fetchAllGameRooms
useAnchorProgram.ts:752 🚀 Starting optimized fetchAllGameRooms...
debugLogger.ts:183 ✅ 🌐 WebSocket connected successfully
debugLogger.ts:185   Data: {lastConnected: '2025-10-06T08:15:00.912Z', reconnectAttempts: 0}
debugLogger.ts:169 ℹ️  💓 Starting heartbeat mechanism
debugLogger.ts:169 ℹ️  📬 Processing queued messages
debugLogger.ts:171   Data: {queuedCount: 0}
debugLogger.ts:183 ✅ 🌐 WebSocket connected successfully
debugLogger.ts:185   Data: {lastConnected: '2025-10-06T08:15:00.913Z', reconnectAttempts: 0}
debugLogger.ts:169 ℹ️  💓 Starting heartbeat mechanism
debugLogger.ts:169 ℹ️  📬 Processing queued messages
debugLogger.ts:171   Data: {queuedCount: 0}
debugLogger.ts:100 
📍 Step 3: Identify Wallet to Server
debugLogger.ts:107   walletAddress: 6GpnMc6s...
debugLogger.ts:59 
==================================================
debugLogger.ts:60 ✅ WEBSOCKET CONNECT - SUCCESS
debugLogger.ts:61 ==================================================
debugLogger.ts:62 🕒 Completed at: 2025-10-06T08:15:00.913Z
debugLogger.ts:65 📤 Output: {connected: true, serverUrl: 'ws://localhost:4000'}
debugLogger.ts:68 ==================================================

useWebSocket.ts:22 ✅ WebSocket connected successfully
useAnchorProgram.ts:761 📊 Found 11 total accounts for program
useAnchorProgram.ts:792 ✅ Successfully processed 11 game rooms
useLobbyData.ts:103 ✅ useLobbyData: Fetched rooms: 11 (11) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
------------------

useFairCoinFlipper.ts:354 🎮 Creating game: {gameId: 53227721, betAmount: 0.01, gamePda: 'GXju1z2CFNsvQa9F34CaWDrJNX45LZ6eoSH83XiWTP1Z', escrowPda: '8NydvVfx1b6JfAKoiPRxQT53ygP1ZYJCbQkpYbwycw2T'}
useFairCoinFlipper.ts:362 📤 Sending transaction to blockchain...
useFairCoinFlipper.ts:429  Error creating game (attempt 1/3): Proxy(SendTransactionError) {signature: '', transactionMessage: 'Transaction simulation failed: This transaction has already been processed', transactionLogs: Array(0), programErrorStack: ProgramErrorStack, stack: 'Error: Simulation failed. \nMessage: Transaction si…tatic/js/src_pages_LobbyPage_tsx.chunk.js:610:22)', …}
overrideMethod @ hook.js:608
(anonymous) @ useFairCoinFlipper.ts:429
await in (anonymous)
handleCreateGame @ CreateGameModal.tsx:45
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
useFairCoinFlipper.ts:433 Transaction was already processed - checking if game was created...
[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
        Don't show again
 ✅ Game was actually created successfully: 53227721
CreateGameModal.tsx:48 ✅ Game created successfully with bet amount: 0.01 gameId: 53227721
useLobbyData.ts:91 🔍 useLobbyData: refreshData called {isProgramReady: true, userInitiated: true}
useLobbyData.ts:101 📡 useLobbyData: Fetching rooms from blockchain...
rpcManager.ts:234 🚀 Making fresh request for fetchAllGameRooms
useAnchorProgram.ts:752 🚀 Starting optimized fetchAllGameRooms...
 
==================================================
 🎬 WEBSOCKET DISCONNECT - START
 ==================================================
 🕒 Timestamp: 2025-10-06T08:11:57.914Z
 📋 Input: {currentlyConnected: true, reconnecting: false}
 ℹ️  Heartbeat stopped
  ⚠️  🔌 WebSocket disconnected 
overrideMethod @ installHook.js:1
warning @ src_hooks_useAnchorP…am_ts.chunk.js:2106
handleDisconnect @ src_hooks_useFairCoi…ta_ts.chunk.js:2390
(anonymous) @ vendors-node_modules…dex_js.chunk.js:139
onclose @ vendors-node_modules…ex_js.chunk.js:3506
disconnect @ vendors-node_modules…ex_js.chunk.js:3710
disconnect @ src_hooks_useFairCoi…ta_ts.chunk.js:2259
(anonymous) @ src_pages_LobbyPage_tsx.chunk.js:3783
safelyCallDestroy @ bundle.js:81386
commitHookEffectListUnmount @ bundle.js:81524
commitPassiveUnmountInsideDeletedTreeOnFiber @ bundle.js:83205
commitPassiveUnmountEffectsInsideOfDeletedTree_begin @ bundle.js:83161
commitPassiveUnmountEffects_begin @ bundle.js:83083
commitPassiveUnmountEffects @ bundle.js:83071
flushPassiveEffectsImpl @ bundle.js:84892
flushPassiveEffects @ bundle.js:84846
(anonymous) @ bundle.js:84661
workLoop @ bundle.js:96834
flushWork @ bundle.js:96812
performWorkUntilDeadline @ bundle.js:97049
    Data: {reason: 'io client disconnect', wasConnected: true, lastConnected: '2025-10-06T08:11:16.760Z', willReconnect: false} 
overrideMethod @ installHook.js:1
warning @ src_hooks_useAnchorP…am_ts.chunk.js:2108
handleDisconnect @ src_hooks_useFairCoi…ta_ts.chunk.js:2390
(anonymous) @ vendors-node_modules…dex_js.chunk.js:139
onclose @ vendors-node_modules…ex_js.chunk.js:3506
disconnect @ vendors-node_modules…ex_js.chunk.js:3710
disconnect @ src_hooks_useFairCoi…ta_ts.chunk.js:2259
(anonymous) @ src_pages_LobbyPage_tsx.chunk.js:3783
safelyCallDestroy @ bundle.js:81386
commitHookEffectListUnmount @ bundle.js:81524
commitPassiveUnmountInsideDeletedTreeOnFiber @ bundle.js:83205
commitPassiveUnmountEffectsInsideOfDeletedTree_begin @ bundle.js:83161
commitPassiveUnmountEffects_begin @ bundle.js:83083
commitPassiveUnmountEffects @ bundle.js:83071
flushPassiveEffectsImpl @ bundle.js:84892
flushPassiveEffects @ bundle.js:84846
(anonymous) @ bundle.js:84661
workLoop @ bundle.js:96834
flushWork @ bundle.js:96812
performWorkUntilDeadline @ bundle.js:97049
 ℹ️  Socket disconnected and cleared
 
==================================================
 ✅ WEBSOCKET DISCONNECT - SUCCESS
 ==================================================
 🕒 Completed at: 2025-10-06T08:11:57.918Z
 📤 Output: {disconnected: true}
 ==================================================

useAnchorProgram.ts:105 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: true, publicKey: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2'}
useAnchorProgram.ts:119 🔗 useAnchorProgram: Creating Anchor provider and program...
useAnchorProgram.ts:140 ✅ useAnchorProgram: Program initialized with ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
useAnchorProgram.ts:146 🚀 useAnchorProgram: Program ready for use!
GameRoomPage.tsx:63 🔍 Fetching game data for ID: 53227721
useAnchorProgram.ts:761 📊 Found 11 total accounts for program
useAnchorProgram.ts:792 ✅ Successfully processed 11 game rooms
useLobbyData.ts:103 ✅ useLobbyData: Fetched rooms: 11 (11) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
useLobbyData.ts:108 🔄 Lobby data refreshed: 11 rooms found
GameRoomPage.tsx:73 📦 Game data received: {gameId: 53227721, betAmount: 0.01, playerA: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerB: '11111111111111111111111111111111', status: 'waitingForPlayer', …}
GameRoomPage.tsx:116 🎮 Game Status Check: {gameId: 53227721, currentUser: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerA: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerB: '11111111111111111111111111111111', isPlayerA: true, …}
GameRoomPage.tsx:131 ✅ User is a player in this game
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 🔧 useAnchorProgram: useEffect triggered {hasWallet: true, hasPublicKey: true, publicKey: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2'}
 🔗 useAnchorProgram: Creating Anchor provider and program...
 ✅ useAnchorProgram: Program initialized with ID: 7CCbhfJx5fUPXZGRu9bqvztBiQHpYPaNL1rGFy9hrcf6
 🚀 useAnchorProgram: Program ready for use!
 🚀 useLobbyData: useEffect triggered {isProgramReady: false}
 ⏳ useLobbyData: Waiting for program to be ready...
 🔌 WebSocket not connected, attempting to connect...
 
==================================================
 🎬 WEBSOCKET CONNECT - START
 ==================================================
 🕒 Timestamp: 2025-10-06T08:11:59.114Z
 📋 Input: {serverUrl: 'ws://localhost:4000', walletAddress: 'None', timeout: '10000ms', reconnection: 'Manual (disabled auto-reconnect)'}
 
📍 Step 1: Initialize Socket.IO Client
   url: ws://localhost:4000
   transports: ['websocket']
   timeout: 10000
 
📍 Step 2: Setup Event Handlers
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 🚀 useLobbyData: useEffect triggered {isProgramReady: true}
 🎯 useLobbyData: Program ready, starting initial fetch
 🔍 useLobbyData: refreshData called {isProgramReady: true, userInitiated: false}
 📡 useLobbyData: Fetching rooms from blockchain...
 💾 Cache hit for fetchAllGameRooms (fresh)
 🔌 WebSocket not connected, attempting to connect for lobby updates...
 
==================================================
 🎬 WEBSOCKET CONNECT - START
 ==================================================
 🕒 Timestamp: 2025-10-06T08:11:59.117Z
 📋 Input: {serverUrl: 'ws://localhost:4000', walletAddress: 'None', timeout: '10000ms', reconnection: 'Manual (disabled auto-reconnect)'}
 
📍 Step 1: Initialize Socket.IO Client
   url: ws://localhost:4000
   transports: ['websocket']
   timeout: 10000
 
📍 Step 2: Setup Event Handlers
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 ✅ useLobbyData: Fetched rooms: 11 (11) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 🔍 Looking for game in allRooms with ID: 53227721 Available rooms: 11
 📊 Found game data: {gameId: BN, playerA: PublicKey, playerB: PublicKey, betAmount: BN, houseWallet: PublicKey, …}
 🎯 Game is waiting for player - need to rejoin
 Rejoining game: 53227721
 ⏳ WebSocket not connected yet, will subscribe when connected
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: true, …}
 🔍 Looking for game in allRooms with ID: 53227721 Available rooms: 11
 📊 Found game data: {gameId: BN, playerA: PublicKey, playerB: PublicKey, betAmount: BN, houseWallet: PublicKey, …}
 🎯 Game is waiting for player - need to rejoin
 Rejoining game: 53227721
 ⏳ WebSocket not connected yet, will subscribe when connected
 🎮 Loading game 53227721 directly via PDA: GXju1z2CFNsvQa9F34CaWDrJNX45LZ6eoSH83XiWTP1Z
 🎮 Loading game 53227721 directly via PDA: GXju1z2CFNsvQa9F34CaWDrJNX45LZ6eoSH83XiWTP1Z
 🎮 GameInterface - Current game state: {phase: 'idle', gameId: null, playerChoice: null, blockchainStatus: null, isLoading: false, …}
 ✅ 🌐 WebSocket connected successfully
   Data: {lastConnected: '2025-10-06T08:11:59.133Z', reconnectAttempts: 0}
 🔄 WebSocket reconnected, re-subscribing to room: 53227721
 ℹ️  🔔 Subscribing to room updates
   Data: {roomId: '53227721', socketConnected: true}
 ✅ ✅ Subscribed to room
   Data: {roomId: '53227721'}
 ✅ Subscribed to room after connection: 53227721
 ℹ️  💓 Starting heartbeat mechanism
 ℹ️  📬 Processing queued messages
   Data: {queuedCount: 0}
 ✅ 🌐 WebSocket connected successfully
   Data: {lastConnected: '2025-10-06T08:11:59.134Z', reconnectAttempts: 0}
 ℹ️  💓 Starting heartbeat mechanism
 ℹ️  📬 Processing queued messages
   Data: {queuedCount: 0}
 
==================================================
 ✅ WEBSOCKET CONNECT - SUCCESS
 ==================================================
 🕒 Completed at: 2025-10-06T08:11:59.135Z
 📤 Output: {connected: true, serverUrl: 'ws://localhost:4000'}
 ==================================================

 ✅ 🌐 WebSocket connected successfully
   Data: {lastConnected: '2025-10-06T08:11:59.139Z', reconnectAttempts: 0}
 ℹ️  💓 Starting heartbeat mechanism
 ℹ️  📬 Processing queued messages
   Data: {queuedCount: 0}
 ✅ 🌐 WebSocket connected successfully
   Data: {lastConnected: '2025-10-06T08:11:59.140Z', reconnectAttempts: 0}
 ℹ️  💓 Starting heartbeat mechanism
 ℹ️  📬 Processing queued messages
   Data: {queuedCount: 0}
 
==================================================
debugLogger.ts:60 ✅ WEBSOCKET CONNECT - SUCCESS
debugLogger.ts:61 ==================================================
debugLogger.ts:62 🕒 Completed at: 2025-10-06T08:11:59.140Z
debugLogger.ts:65 📤 Output: {connected: true, serverUrl: 'ws://localhost:4000'}
debugLogger.ts:68 ==================================================

useFairCoinFlipper.ts:992 🎮 Loading existing game state: {gameId: 53227721, isPlayerA: true, isPlayerB: false, betAmount: 0.01, status: {…}}
useFairCoinFlipper.ts:1010 🔍 [REJOIN] Commitment Status Check: {gameId: 53227721, currentPlayer: 'Player A', hasPlayerACommitted: false, hasPlayerBCommitted: false, hasCurrentPlayerCommitted: false, …}
 🎮 GameInterface - Current game state: {phase: 'waiting', gameId: 53227721, playerChoice: null, blockchainStatus: 'WaitingForPlayer', isLoading: false, …}
 🔍 Looking for game in allRooms with ID: 53227721 Available rooms: 11
 📊 Found game data: {gameId: BN, playerA: PublicKey, playerB: PublicKey, betAmount: BN, houseWallet: PublicKey, …}
 ℹ️  🔔 Subscribing to room updates
   Data: {roomId: '53227721', socketConnected: true}
 ✅ ✅ Subscribed to room
debugLogger.ts:185   Data: {roomId: '53227721'}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'waiting', gameId: 53227721, playerChoice: null, blockchainStatus: 'WaitingForPlayer', isLoading: false, …}
useFairCoinFlipper.ts:992 🎮 Loading existing game state: {gameId: 53227721, isPlayerA: true, isPlayerB: false, betAmount: 0.01, status: {…}}
useFairCoinFlipper.ts:1010 🔍 [REJOIN] Commitment Status Check: {gameId: 53227721, currentPlayer: 'Player A', hasPlayerACommitted: false, hasPlayerBCommitted: false, hasCurrentPlayerCommitted: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'waiting', gameId: 53227721, playerChoice: null, blockchainStatus: 'WaitingForPlayer', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'waiting', gameId: 53227721, playerChoice: null, blockchainStatus: 'WaitingForPlayer', isLoading: false, …}
useFairCoinFlipper.ts:598 Starting commitment polling for game: 53227721
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
53227721:1  Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:552 🔐 Making commitment with choice: heads
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
useFairCoinFlipper.ts:1158 🔍 Checking blockchain state before commitment...
useFairCoinFlipper.ts:1161 📊 Game account fetched: {playerA: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', playerB: '6GpnMc6su2JNzDPMx5MXDD6eznREGEKzvtrJAASKwCJj', status: {…}}
useFairCoinFlipper.ts:1171 👤 Player role check: {walletAddress: 'EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2', isPlayerA: true, isPlayerB: false}
useFairCoinFlipper.ts:1188 🔐 Commitment check: {commitmentA: Array(8), commitmentB: Array(8), hasPlayerACommitted: false, hasPlayerBCommitted: true, hasCurrentPlayerCommitted: false, …}
useFairCoinFlipper.ts:1222 📤 Sending commitment to blockchain... {gameId: 53227721, choice: 'heads', commitment: Array(32)}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
useFairCoinFlipper.ts:1292  Error making commitment: Proxy(SendTransactionError) {signature: '', transactionMessage: 'Transaction simulation failed: This transaction has already been processed', transactionLogs: Array(0), programErrorStack: ProgramErrorStack, stack: 'Error: Simulation failed. \nMessage: Transaction si…c/js/src_pages_GameRoomPage_tsx.chunk.js:1969:21)', …}
overrideMethod @ hook.js:608
(anonymous) @ useFairCoinFlipper.ts:1292
await in (anonymous)
handleMakeCommitment @ GameInterface.tsx:553
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
useFairCoinFlipper.ts:1296 Transaction was already processed - checking if commitment was made...
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: null, blockchainStatus: 'PlayersReady', isLoading: true, …}
 ✅ Commitment was actually made successfully
 
==================================================
 🎬 STORE COMMITMENT - START
 ==================================================
 🕒 Timestamp: 2025-10-06T08:13:31.632Z
 📋 Input: {walletAddress: 'EKRKZxha...', roomId: 53227721, choice: 'heads', commitmentHash: '93127f068f820042...'}
 
📍 Step 1: Prepare Commitment Data
   walletAddress: EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2
   roomId: 53227721
   choice: heads
   choiceNum: 0
   secretLength: 16
   commitmentLength: 32
   storageLocation: CLIENT-SIDE ONLY (IndexedDB + localStorage)
  ⚠️  🔒 SECURITY: Secret NEVER leaves your device!
overrideMethod @ installHook.js:1
warning @ src_hooks_useAnchorP…am_ts.chunk.js:2106
storeCommitment @ src_hooks_useAnchorP…am_ts.chunk.js:1561
(anonymous) @ src_hooks_useFairCoi…ta_ts.chunk.js:1330
await in (anonymous)
handleMakeCommitment @ src_pages_GameRoomPage_tsx.chunk.js:1969
callCallback @ bundle.js:65234
invokeGuardedCallbackDev @ bundle.js:65278
invokeGuardedCallback @ bundle.js:65335
invokeGuardedCallbackAndCatchFirstError @ bundle.js:65349
executeDispatch @ bundle.js:69492
processDispatchQueueItemsInOrder @ bundle.js:69518
processDispatchQueue @ bundle.js:69529
dispatchEventsForPlugins @ bundle.js:69538
(anonymous) @ bundle.js:69698
batchedUpdates$1 @ bundle.js:84117
batchedUpdates @ bundle.js:65082
dispatchEventForPluginEventSystem @ bundle.js:69697
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ bundle.js:67204
dispatchEvent @ bundle.js:67198
dispatchDiscreteEvent @ bundle.js:67175
debugLogger.ts:199    Data: {backend: 'CANNOT see your choice', storage: 'IndexedDB (primary) + localStorage (backup)', secure: true}
overrideMethod @ hook.js:608
warning @ debugLogger.ts:199
storeCommitment @ commitmentService.ts:68
(anonymous) @ useFairCoinFlipper.ts:1334
await in (anonymous)
handleMakeCommitment @ GameInterface.tsx:553
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(anonymous) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430
debugLogger.ts:100 
📍 Step 2: Store in IndexedDB (Primary Storage)
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: true, …}
indexedDBStorage.ts:77 ✅ Commitment stored locally for room 53227721
debugLogger.ts:183 ✅ ✅ Commitment stored in IndexedDB
debugLogger.ts:185   Data: {duration: '2.40ms', size: '296 bytes'}
debugLogger.ts:100 
📍 Step 3: Store in localStorage (Backup Storage)
debugLogger.ts:183 ✅ ✅ Commitment also stored in localStorage
debugLogger.ts:185   Data: {key: 'commitment_EKRKZxhaAPYKpG3cV17TcZfkoQ1N3DEFX7VmAmAo75u2_53227721', duration: '0.00ms', size: '296 bytes'}
debugLogger.ts:59 
==================================================
debugLogger.ts:60 ✅ STORE COMMITMENT - SUCCESS
debugLogger.ts:61 ==================================================
debugLogger.ts:62 🕒 Completed at: 2025-10-06T08:13:31.636Z
debugLogger.ts:65 📤 Output: {success: true, storage: 'client-side-only', locations: Array(2), walletAddress: 'EKRKZxha...', roomId: 53227721}
debugLogger.ts:68 ==================================================

useFairCoinFlipper.ts:1341 💾 Commitment stored securely on your device (IndexedDB + localStorage backup)
useFairCoinFlipper.ts:598 Starting commitment polling for game: 53227721
GameInterface.tsx:555 ✅ Commitment successful!
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'committing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'PlayersReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
GameInterface.tsx:560 🔥 REVEAL BUTTON CLICKED! {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', isLoading: false}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: true, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: true, …}
useFairCoinFlipper.ts:1584 📊 Reveal check: {status: 'commitmentsReady', isPlayerA: true, hasPlayerARevealed: false, hasPlayerBRevealed: false, canReveal: true}
useFairCoinFlipper.ts:1599 📤 Revealing choice: {choice: 'heads', choiceEnum: {…}, secret: 6254002628569673}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: true, …}
GameInterface.tsx:573 ✅ Choice revealed successfully, starting coin flip animation
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'revealing', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'CommitmentsReady', isLoading: false, …}
useFairCoinFlipper.ts:560 Handling game resolution: {gameId: BN, playerA: PublicKey, playerB: PublicKey, betAmount: BN, houseWallet: PublicKey, …}
GameInterface.tsx:342 🎮 GameInterface - Current game state: {phase: 'resolved', gameId: 53227721, playerChoice: 'heads', blockchainStatus: 'Resolved', isLoading: false, …}
