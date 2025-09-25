Compiled with problems:
×
ERROR in ./src/App.tsx 43:10-31
export 'BackpackWalletAdapter' (imported as 'BackpackWalletAdapter') was not found in '@solana/wallet-adapter-wallets' (possible exports: AlphaWalletAdapter, AlphaWalletName, AvanaWalletAdapter, AvanaWalletName, BitKeepWalletAdapter, BitKeepWalletName, BitgetWalletAdapter, BitgetWalletName, BitpieWalletAdapter, BitpieWalletName, CloverWalletAdapter, CloverWalletName, Coin98WalletAdapter, Coin98WalletName, CoinbaseWalletAdapter, CoinbaseWalletName, CoinhubWalletAdapter, CoinhubWalletName, FractalWalletAdapter, FractalWalletName, HuobiWalletAdapter, HuobiWalletName, HyperPayWalletAdapter, HyperPayWalletName, KeystoneWalletAdapter, KeystoneWalletName, KrystalWalletAdapter, KrystalWalletName, LedgerWalletAdapter, LedgerWalletName, MathWalletAdapter, MathWalletName, NekoWalletAdapter, NekoWalletName, NightlyWalletAdapter, NightlyWalletName, NufiWalletAdapter, NufiWalletName, OntoWalletAdapter, OntoWalletName, ParticleAdapter, ParticleName, PhantomWalletAdapter, PhantomWalletName, SafePalWalletAdapter, SafePalWalletName, SaifuWalletAdapter, SaifuWalletName, SalmonWalletAdapter, SalmonWalletName, SkyWalletAdapter, SkyWalletName, SolflareWalletAdapter, SolflareWalletName, SolongWalletAdapter, SolongWalletName, SpotWalletAdapter, SpotWalletName, TokenPocketWalletAdapter, TokenPocketWalletName, TokenaryWalletAdapter, TokenaryWalletName, TorusWalletAdapter, TorusWalletName, TrezorWalletAdapter, TrezorWalletName, TrustWalletAdapter, TrustWalletName, UnsafeBurnerWalletAdapter, UnsafeBurnerWalletName, WalletConnectWalletAdapter, WalletConnectWalletName, XDEFIWalletAdapter, XDEFIWalletName, getDerivationPath)
ERROR in src/App.tsx:12:3
TS2724: '"@solana/wallet-adapter-wallets"' has no exported member named 'BackpackWalletAdapter'. Did you mean 'AlphaWalletAdapter'?
    10 |   PhantomWalletAdapter,
    11 |   SolflareWalletAdapter,
  > 12 |   BackpackWalletAdapter,
       |   ^^^^^^^^^^^^^^^^^^^^^
    13 | } from '@solana/wallet-adapter-wallets';
    14 | import { clusterApiUrl } from '@solana/web3.js';
    15 | import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
ERROR in src/components/BlockchainGame.tsx:4:10
TS2305: Module '"../config/constants"' has no exported member 'RESOLUTION_FEE_PER_PLAYER'.
    2 | import { useWallet, useConnection } from '@solana/wallet-adapter-react';
    3 | import { useCoinFlipper } from '../hooks/useCoinFlipper';
  > 4 | import { RESOLUTION_FEE_PER_PLAYER } from '../config/constants';
      |          ^^^^^^^^^^^^^^^^^^^^^^^^^
    5 | import RoomBrowser from './RoomBrowser';
    6 | import RefundManager from './RefundManager';
    7 | import AboutGame from './AboutGame';
ERROR in src/components/lobby/AvailableGames.tsx:6:9
TS7034: Variable 'availableGames' implicitly has type 'any[]' in some locations where its type cannot be determined.
    4 | export const AvailableGames: React.FC = () => {
    5 |   // Mock data - replace with actual data from hooks
  > 6 |   const availableGames = [];
      |         ^^^^^^^^^^^^^^
    7 |
    8 |   if (availableGames.length === 0) {
    9 |     return (
ERROR in src/components/lobby/AvailableGames.tsx:60:10
TS7005: Variable 'availableGames' implicitly has an 'any[]' type.
    58 |       {/* Games List */}
    59 |       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  > 60 |         {availableGames.map((game: any) => (
       |          ^^^^^^^^^^^^^^
    61 |           <div key={game.id} className="card bg-base-100 shadow-xl">
    62 |             <div className="card-body">
    63 |               <div className="flex justify-between items-start">
ERROR in src/components/lobby/GameHistory.tsx:11:9
TS7034: Variable 'gameHistory' implicitly has type 'any[]' in some locations where its type cannot be determined.
     9 |   
    10 |   // Mock data - replace with actual data from hooks
  > 11 |   const gameHistory = [];
       |         ^^^^^^^^^^^
    12 |
    13 |   if (!connected) {
    14 |     return (
ERROR in src/components/lobby/GameHistory.tsx:105:10
TS7005: Variable 'gameHistory' implicitly has an 'any[]' type.
    103 |       {/* History List */}
    104 |       <div className="space-y-2">
  > 105 |         {gameHistory.map((game: any) => (
        |          ^^^^^^^^^^^
    106 |           <div 
    107 |             key={game.id} 
    108 |             className={`card bg-base-100 shadow-sm border-l-4 ${
ERROR in src/components/lobby/MyGames.tsx:9:9
TS7034: Variable 'myGames' implicitly has type 'any[]' in some locations where its type cannot be determined.
     7 |   
     8 |   // Mock data - replace with actual data from hooks
  >  9 |   const myGames = [];
       |         ^^^^^^^
    10 |
    11 |   if (!connected) {
    12 |     return (
ERROR in src/components/lobby/MyGames.tsx:50:10
TS7005: Variable 'myGames' implicitly has an 'any[]' type.
    48 |       {/* Games List */}
    49 |       <div className="space-y-3">
  > 50 |         {myGames.map((game: any) => (
       |          ^^^^^^^
    51 |           <div key={game.id} className="card bg-base-100 shadow-lg">
    52 |             <div className="card-body p-4">
    53 |               <div className="flex justify-between items-start">
ERROR in src/components/lobby/RunningGames.tsx:6:9
TS7034: Variable 'runningGames' implicitly has type 'any[]' in some locations where its type cannot be determined.
    4 | export const RunningGames: React.FC = () => {
    5 |   // Mock data - replace with actual data from hooks
  > 6 |   const runningGames = [];
      |         ^^^^^^^^^^^^
    7 |
    8 |   if (runningGames.length === 0) {
    9 |     return (
ERROR in src/components/lobby/RunningGames.tsx:44:10
TS7005: Variable 'runningGames' implicitly has an 'any[]' type.
    42 |       {/* Games List */}
    43 |       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  > 44 |         {runningGames.map((game: any) => (
       |          ^^^^^^^^^^^^
    45 |           <div key={game.id} className="card bg-base-100 shadow-xl">
    46 |             <div className="card-body">
    47 |               <div className="flex justify-between items-start mb-4">
ERROR in src/services/WebSocketManager.ts:3:10
TS2305: Module '"../config/constants"' has no exported member 'WEBSOCKET_CONFIG'.
    1 | import { EventEmitter } from 'eventemitter3';
    2 | import { io, Socket } from 'socket.io-client';
  > 3 | import { WEBSOCKET_CONFIG } from '../config/constants';
      |          ^^^^^^^^^^^^^^^^
    4 |
    5 | export interface GameEvent {
    6 |   type: 'room_created' | 'player_joined' | 'selection_made' | 'game_resolved' | 'player_disconnected';