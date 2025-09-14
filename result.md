hook.js:608  Phantom was registered as a Standard Wallet. The Wallet Adapter for Phantom can be removed from your app. Error Component Stack
    at WalletProvider (WalletProvider.tsx:45:1)
    at ConnectionProvider (ConnectionProvider.tsx:12:1)
    at WalletProvider (WalletProvider.tsx:22:1)
    at App (App.tsx:109:1)
overrideMethod @ hook.js:608
(anonymous) @ useStandardWalletAdapters.ts:49
(anonymous) @ useStandardWalletAdapters.ts:42
mountMemo @ react-dom.development.js:16406
useMemo @ react-dom.development.js:16851
useMemo @ react.development.js:1650
useStandardWalletAdapters @ useStandardWalletAdapters.ts:42
WalletProvider @ WalletProvider.tsx:52
renderWithHooks @ react-dom.development.js:15486
mountIndeterminateComponent @ react-dom.development.js:20103
beginWork @ react-dom.development.js:21626
beginWork$1 @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopSync @ react-dom.development.js:26505
renderRootSync @ react-dom.development.js:26473
performConcurrentWorkOnRoot @ react-dom.development.js:25777
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
hook.js:600  Phantom was registered as a Standard Wallet. The Wallet Adapter for Phantom can be removed from your app. Error Component Stack
    at WalletProvider (WalletProvider.tsx:45:1)
    at ConnectionProvider (ConnectionProvider.tsx:12:1)
    at WalletProvider (WalletProvider.tsx:22:1)
    at App (App.tsx:109:1)
overrideMethod @ hook.js:600
(anonymous) @ useStandardWalletAdapters.ts:49
(anonymous) @ useStandardWalletAdapters.ts:42
mountMemo @ react-dom.development.js:16406
useMemo @ react-dom.development.js:16851
useMemo @ react.development.js:1650
useStandardWalletAdapters @ useStandardWalletAdapters.ts:42
WalletProvider @ WalletProvider.tsx:52
renderWithHooks @ react-dom.development.js:15486
mountIndeterminateComponent @ react-dom.development.js:20174
beginWork @ react-dom.development.js:21626
beginWork$1 @ react-dom.development.js:27465
performUnitOfWork @ react-dom.development.js:26596
workLoopSync @ react-dom.development.js:26505
renderRootSync @ react-dom.development.js:26473
performConcurrentWorkOnRoot @ react-dom.development.js:25777
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
programIdValidator.ts:62 ✅ Program ID validation passed: DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp
programIdValidator.ts:62 ✅ Program ID validation passed: DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp
[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
        Don't show again
useAnchorProgram.ts:129 Program initialized with ID: DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp
BlockchainGame.tsx:118 🔍 User connected - NOT auto-checking for existing games to prevent stuck states
useAnchorProgram.ts:129 Program initialized with ID: DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp
RoomBrowser.tsx:54 === loadRooms called ===
RoomBrowser.tsx:55 isProgramReady: true
RoomBrowser.tsx:56 forceRefresh: false
RoomBrowser.tsx:86 Starting to load rooms...
RoomBrowser.tsx:93 Calling fetchAllGameRooms...
rpcManager.ts:220 🚀 Making fresh request for fetchAllGameRooms
useAnchorProgram.ts:470 🚀 Starting optimized fetchAllGameRooms...
useAnchorProgram.ts:479 📊 Found 9 total accounts for program
useAnchorProgram.ts:501 ✅ Successfully processed 8 game rooms
RoomBrowser.tsx:98 fetchAllGameRooms completed in 500ms
RoomBrowser.tsx:99 Fetched rooms: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
RoomBrowser.tsx:100 Number of rooms: 8
RoomBrowser.tsx:112 Successfully updated rooms state
RoomBrowser.tsx:151 Setting loading to false
rpcManager.ts:220 🚀 Making fresh request for fetchGameRoom-835823
rpcManager.ts:112 💾 Cache hit for fetchAllGameRooms (fresh)
useCoinFlipper.ts:490 Rejoined room: {roomId: 835823, gameStatus: 'selecting', playerSelection: null, opponentSelection: true}
RoomBrowser.tsx:187 Cleared room polling interval
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:586 🎲 Making selection: heads for room 835823
useAnchorProgram.ts:389 Current room status before selection: SelectionsPending
useAnchorProgram.ts:433 Making selection with coinSide: {heads: {…}} for room: 835823
useAnchorProgram.ts:434 CoinSide object keys: ['heads']
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:602 Selection made: {roomId: 835823, selection: 'heads', tx: 'https://explorer.solana.com?cluster=devnet/tx/4s2x…Vc9TXJWMPNox4WsnvweJ4DxEQx68FW75a8w92n3Qgr3MKRudh'}
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:167 🎯 Game State Transition: resolving → selecting (Room: 835823)
useCoinFlipper.ts:167 🎯 Game State Transition: resolving → selecting (Room: 835823)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:586 🎲 Making selection: heads for room 835823
useAnchorProgram.ts:389 Current room status before selection: Resolving
useAnchorProgram.ts:395 ⚠️ Room state mismatch detected, clearing cache for room: 835823
rpcManager.ts:305 🗑️ Cache cleared
rpcManager.ts:220 🚀 Making fresh request for fetchGameRoom-835823
rpcManager.ts:220 🚀 Making fresh request for fetchAllGameRooms
useAnchorProgram.ts:470 🚀 Starting optimized fetchAllGameRooms...
rpcManager.ts:133 ⏳ Request already pending for fetchGameRoom-835823, waiting...
useAnchorProgram.ts:479 📊 Found 9 total accounts for program
useAnchorProgram.ts:501 ✅ Successfully processed 8 game rooms
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:1057 🚑 Attempting to recover stuck game state for room: 835823
rpcManager.ts:305 🗑️ Cache cleared
rpcManager.ts:220 🚀 Making fresh request for fetchGameRoom-835823
useAnchorProgram.ts:973 🔄 Force refreshing room 835823...
rpcManager.ts:220 🚀 Making fresh request for fetchAllGameRooms
useAnchorProgram.ts:941 🔄 Force refreshing all game rooms...
useAnchorProgram.ts:961 ✅ Force refresh completed: 8 rooms
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:136 🎲 Both players selected - game ready for manual resolution
useCoinFlipper.ts:177 ✅ Game state refreshed by user: {gameStatus: 'resolving', playerSelection: null, opponentSelection: false, winner: null}
useCoinFlipper.ts:1080 ✅ Game state recovery completed
useCoinFlipper.ts:167 🎯 Game State Transition: selecting → resolving (Room: 835823)
useCoinFlipper.ts:167 🎯 Game State Transition: selecting → resolving (Room: 835823)
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:136 🎲 Both players selected - game ready for manual resolution
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
-----
rpcManager.ts:220 🚀 Making fresh request for fetchGameRoom-835823
rpcManager.ts:112 💾 Cache hit for fetchAllGameRooms (fresh)
useCoinFlipper.ts:553 Room joined: {roomId: 835823, tx: 'https://explorer.solana.com?cluster=devnet/tx/5d7u…ynGRcoqpYTmqForJNHkEoWFh7dokNHQiTrRJFNrJjEXPWPAfa'}
RoomBrowser.tsx:187 Cleared room polling interval
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:586 🎲 Making selection: tails for room 835823
useAnchorProgram.ts:389 Current room status before selection: SelectionsPending
useAnchorProgram.ts:433 Making selection with coinSide: {tails: {…}} for room: 835823
useAnchorProgram.ts:434 CoinSide object keys: ['tails']
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:602 Selection made: {roomId: 835823, selection: 'tails', tx: 'https://explorer.solana.com?cluster=devnet/tx/3xh2…swqjDKCxuUEaPjmZ4hwPVD9LGLdQLaCVVbV7JWsYgCE177Z7M'}
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:112 💾 Cache hit for fetchGameRoom-835823 (fresh)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:613
setTimeout
(anonymous) @ useCoinFlipper.ts:610
await in (anonymous)
handleSelection @ BlockchainGame.tsx:191
await in handleSelection
onClick @ BlockchainGame.tsx:731
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
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:118 💾 Cache hit for fetchGameRoom-835823 (stale, refreshing in background)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:243
setInterval
(anonymous) @ useCoinFlipper.ts:229
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:118 💾 Cache hit for fetchGameRoom-835823 (stale, refreshing in background)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:243
setInterval
(anonymous) @ useCoinFlipper.ts:229
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:118 💾 Cache hit for fetchGameRoom-835823 (stale, refreshing in background)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:243
setInterval
(anonymous) @ useCoinFlipper.ts:229
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:118 💾 Cache hit for fetchGameRoom-835823 (stale, refreshing in background)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:243
setInterval
(anonymous) @ useCoinFlipper.ts:229
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:118 💾 Cache hit for fetchGameRoom-835823 (stale, refreshing in background)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:243
setInterval
(anonymous) @ useCoinFlipper.ts:229
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
rpcManager.ts:118 💾 Cache hit for fetchGameRoom-835823 (stale, refreshing in background)
useCoinFlipper.ts:86 Current player is not part of this room
(anonymous) @ useCoinFlipper.ts:86
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:243
setInterval
(anonymous) @ useCoinFlipper.ts:229
commitHookEffectListMount @ react-dom.development.js:23189
commitPassiveMountOnFiber @ react-dom.development.js:24965
commitPassiveMountEffects_complete @ react-dom.development.js:24930
commitPassiveMountEffects_begin @ react-dom.development.js:24917
commitPassiveMountEffects @ react-dom.development.js:24905
flushPassiveEffectsImpl @ react-dom.development.js:27078
flushPassiveEffects @ react-dom.development.js:27023
(anonymous) @ react-dom.development.js:26808
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
useCoinFlipper.ts:223 🔄 Starting minimal background refresh for resolving game: 835823
----
useAnchorProgram.ts:689  Error resolving game: AnchorError: AnchorError caused by account: game_room. Error Code: AccountDidNotSerialize. Error Number: 3004. Error Message: Failed to serialize the account.
    at AnchorError.parse (error.ts:167:1)
    at translateError (error.ts:276:1)
    at MethodsBuilder.rpc [as _rpcFn] (rpc.ts:35:1)
    at async retryTransaction (transaction.ts:26:1)
    at async useAnchorProgram.ts:664:1
    at async useCoinFlipper.ts:992:1
    at async onClick (BlockchainGame.tsx:893:1)
overrideMethod @ hook.js:608
(anonymous) @ useAnchorProgram.ts:689
await in (anonymous)
(anonymous) @ useCoinFlipper.ts:992
await in (anonymous)
onClick @ BlockchainGame.tsx:893
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
[NEW] Explain Console errors by using Copilot in Edge: click
         
         to explain an error. 
        Learn more
        Don't show again
