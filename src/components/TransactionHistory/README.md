# Transaction History UI System

A comprehensive transaction history interface for the Solana Coin Flipper betting game that provides players with complete transparency, detailed analytics, and blockchain verification of all their games.

## Overview

This system implements a full-featured transaction history interface with:

- **Paginated Game History**: View all completed games with sortable columns and responsive design
- **Advanced Filtering**: Filter by date, outcome, amount, token type, and opponent address
- **Statistics Dashboard**: Visual cards showing win rate, profit/loss, streaks, and performance metrics
- **Export Functionality**: Download history as CSV/JSON with all relevant fields
- **Explorer Integration**: Direct links to Solana Explorer with transaction verification
- **Real-time Updates**: WebSocket integration for live transaction updates
- **Offline Caching**: IndexedDB storage for offline access and performance
- **Responsive Design**: Mobile-optimized interface with adaptive layouts

## Components

### Core Components

#### `TransactionHistory.tsx`
Main container component that orchestrates all transaction history functionality:
- Manages state for pagination, filtering, and data fetching
- Integrates with wallet connection and network detection
- Provides export functionality and handles error states
- Shows loading states and empty state messages

#### `HistoryTable.tsx`
Advanced table component with comprehensive features:
- Uses @tanstack/react-table for sorting, pagination, and column management
- Implements virtual scrolling for large datasets (react-window)
- Expandable rows with detailed transaction information
- Column visibility controls for mobile responsiveness
- Bulk selection for export operations

#### `HistoryFilters.tsx`
Sophisticated filtering system:
- Quick filter buttons for common use cases (today, this week, wins only, etc.)
- Advanced filters with date pickers, amount ranges, and opponent search
- Filter persistence using localStorage
- Real-time filter application with debouncing

#### `HistoryStats.tsx`
Comprehensive statistics dashboard:
- Key performance metrics (win rate, profit/loss, total volume)
- Streak tracking (current, best, worst)
- Time-based comparisons (this week vs last week)
- Interactive profit/loss chart using Recharts
- Performance insights and recommendations

### Utility Components

#### `ExplorerLink.tsx`
Solana Explorer integration:
- Automatic network detection (mainnet, devnet, testnet)
- Clickable links to transaction details
- Copy functionality for transaction signatures
- Network-specific URL generation

#### `AddressCopy.tsx`
Address display and copying utilities:
- Smart address truncation for readability
- One-click copying with toast notifications
- Fallback copying for older browsers
- Optional Explorer link integration

#### `TokenAmount.tsx`
Token amount formatting:
- Smart decimal precision based on token type and amount
- Support for SOL, USDC, BONK, and custom tokens
- Consistent formatting across the application
- Prefix/suffix support for profit/loss indicators

#### `LoadingSpinner.tsx`
Reusable loading indicator:
- Multiple sizes and color variants
- Consistent styling across components
- Accessibility-friendly animation

## Services

### `GameHistoryService.ts`
Core data fetching and caching service:

```typescript
class GameHistoryService {
  // Paginated game history fetching
  getGameHistory(filters, page, limit): Promise<PaginatedGameHistory>
  
  // Statistics calculation engine
  calculateStats(games, playerAddress): GameHistoryStats
  
  // Export functionality
  exportToCSV(filters, filename): Promise<string>
  exportToJSON(filters, filename): Promise<string>
  
  // IndexedDB caching
  initIndexedDB(): Promise<void>
  storeInIndexedDB(storeName, data): Promise<void>
  getFromIndexedDB(storeName, key): Promise<any>
}
```

**Key Features:**
- Implements pagination using Solana's `getProgramAccounts` with filters
- Caches data in IndexedDB for offline access and performance
- Incremental fetching - loads recent games first, fetches more on demand
- Statistics calculation client-side for real-time updates
- Web Workers for large export operations to prevent UI blocking

## Hooks

### `useTransactionHistory.ts`
React Query integration for data fetching:
- Paginated queries with infinite scroll support
- Automatic caching and background refetching
- Error handling and retry logic
- Real-time updates integration

### `useHistoryFilters.ts`
Filter management with persistence:
- localStorage persistence of filter preferences
- Quick filter presets (today, this week, wins only, etc.)
- Filter validation and error handling
- Compound filter logic support

### `useHistoryExport.ts`
Export functionality:
- CSV and JSON export with progress tracking
- Bulk selection export for specific transactions
- Tax reporting format export
- Clipboard copy functionality
- Web Worker integration for large datasets

## Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ TransactionHistory │───▶│ useTransactionHistory │───▶│ GameHistoryService │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ HistoryFilters  │───▶│ useHistoryFilters │   │ Solana RPC      │
└─────────────────┘    └─────────────────┘    │ Program Accounts│
        │                       │              └─────────────────┘
        ▼                       ▼                       │
┌─────────────────┐    ┌─────────────────┐              ▼
│ HistoryTable    │    │ React Query     │    ┌─────────────────┐
└─────────────────┘    │ Cache          │    │ IndexedDB       │
        │              └─────────────────┘    │ Cache          │
        ▼                                     └─────────────────┘
┌─────────────────┐
│ HistoryStats    │
└─────────────────┘
```

## Installation & Setup

### Dependencies
```bash
npm install @tanstack/react-table@^8.10.0 \
            react-window@^1.8.8 \
            date-fns@^2.30.0 \
            papaparse@^5.4.0 \
            recharts@^2.8.0 \
            @tanstack/react-query@^4.0.0
```

### Type Dependencies
```bash
npm install -D @types/react-window@^1.8.5 \
               @types/papaparse@^5.0.0
```

### Integration

1. **Wrap your app with QueryClientProvider:**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      cacheTime: 300000,
      retry: 3
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        {/* Your app components */}
        <TransactionHistory />
      </WalletProvider>
    </QueryClientProvider>
  );
}
```

2. **Update GameHistoryService with real data:**
```typescript
// Replace mock data in fetchGameHistoryFromRPC with:
const accounts = await this.program.account.gameState.all([
  {
    memcmp: {
      offset: 8, // After discriminator
      bytes: playerPublicKey.toBase58()
    }
  }
]);
```

3. **Add to routing (optional):**
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/history" element={<TransactionHistory />} />
</Routes>
```

## Customization

### Styling
The system uses Tailwind CSS with full dark mode support. Key customization points:
- Color themes in component className props
- Responsive breakpoints in grid layouts
- Chart colors in HistoryStats component
- Loading skeleton animations

### Token Support
Add new tokens in `TokenAmount.tsx`:
```typescript
switch (tokenSymbol.toUpperCase()) {
  case 'SOL':
    return value < 0.001 ? 6 : value < 1 ? 4 : 3;
  case 'YOUR_TOKEN':
    return 4; // Custom decimal places
}
```

### Filter Options
Modify filter presets in `HistoryFilters.tsx`:
```typescript
const QUICK_FILTERS = [
  {
    id: 'custom',
    label: 'Custom Filter',
    filters: { /* your filter logic */ }
  }
];
```

## Performance Optimizations

- **Virtual Scrolling**: Tables over 100 rows use react-window
- **Lazy Loading**: Statistics calculated on-demand
- **Request Deduplication**: Prevents concurrent identical requests
- **Batch API Calls**: Multiple pages fetched efficiently
- **IndexedDB Caching**: Offline access and reduced API calls
- **React.memo**: Row components prevent unnecessary re-renders
- **Debounced Filtering**: 300ms delay prevents excessive queries

## Security Considerations

- **Input Validation**: All user inputs are validated and sanitized
- **XSS Prevention**: Address and signature display uses safe rendering
- **HTTPS Only**: All Explorer links use secure connections
- **No Private Key Exposure**: Only public addresses and signatures handled
- **Rate Limiting**: Debounced API calls prevent spam

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **IndexedDB**: Required for caching functionality
- **Clipboard API**: Copy functionality with fallback for older browsers
- **CSS Grid**: Required for responsive layouts
- **WebSocket**: Optional for real-time updates

## Testing

The system includes comprehensive test coverage:
- Unit tests for all utility functions
- Component tests with React Testing Library
- Integration tests for data flow
- Mock data for development and testing

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Advanced analytics and charts
- [ ] Tournament history tracking
- [ ] Social features (compare with friends)
- [ ] Mobile app integration
- [ ] Multi-language support
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] PWA features for offline functionality

## Troubleshooting

### Common Issues

1. **"Wallet not connected" error**
   - Ensure WalletProvider wraps the component
   - Check wallet connection state

2. **Data not loading**
   - Verify program instance is available
   - Check network connection
   - Inspect browser developer tools for RPC errors

3. **Export not working**
   - Check browser popup blocker settings
   - Ensure sufficient browser storage space
   - Verify data permissions

4. **Performance issues**
   - Reduce page size in large datasets
   - Clear IndexedDB cache if corrupted
   - Check for memory leaks in dev tools

### Debug Mode
Enable debug logging:
```typescript
// In GameHistoryService constructor
console.log('Debug mode enabled for transaction history');
```

## Contributing

When contributing to this system:
1. Maintain TypeScript strict mode compliance
2. Follow existing code patterns and naming conventions
3. Add unit tests for new functionality
4. Update this documentation for new features
5. Test across different wallet types and networks
6. Ensure mobile responsiveness
7. Verify dark mode compatibility

## License

This transaction history system is part of the Solana Coin Flipper project and follows the same license terms.
