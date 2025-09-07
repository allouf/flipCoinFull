import { Connection, PublicKey, AccountChangeCallback } from '@solana/web3.js';
import { EventEmitter } from 'eventemitter3';
import { Program, Idl } from '@coral-xyz/anchor';
import { CoinFlipper } from '../types/program'; // TODO: Import actual program type
import { webSocketManager } from './WebSocketManager';

export interface SubscriptionInfo {
  id: number;
  accountAddress: string;
  callback: AccountChangeCallback;
  discriminator?: Buffer;
  active: boolean;
  createdAt: number;
}

export interface ParsedGameEvent {
  type: 'RoomCreated' | 'PlayerJoined' | 'SelectionMade' | 'GameResolved';
  roomId: string;
  data: any;
  signature: string;
  slot: number;
  timestamp: number;
}

/**
 * EventSubscriptionManager - Manages Solana program account subscriptions
 *
 * Features:
 * - Subscribe to specific program accounts
 * - Filter events by discriminator
 * - Parse events using Anchor IDL
 * - Prevent duplicate subscriptions
 * - Clean up subscriptions on unmount
 */
export class EventSubscriptionManager extends EventEmitter {
  private connection: Connection;

  private program: Program<Idl> | null = null;

  private subscriptions: Map<string, SubscriptionInfo> = new Map();

  private subscriptionCounter = 0;

  private eventCache: Map<string, ParsedGameEvent> = new Map(); // Cache for deduplication

  constructor(connection: Connection, program?: Program<Idl>) {
    super();
    this.connection = connection;
    this.program = program || null;
  }

  /**
   * Set the Anchor program for event parsing
   */
  public setProgram(program: Program<Idl>): void {
    this.program = program;
  }

  /**
   * Subscribe to account changes for a specific game room
   */
  public subscribeToGameRoom(roomAddress: string): number {
    const subscriptionKey = `room_${roomAddress}`;

    // Prevent duplicate subscriptions
    if (this.subscriptions.has(subscriptionKey)) {
      console.warn('Already subscribed to room:', roomAddress);
      return this.subscriptions.get(subscriptionKey)!.id;
    }

    const callback: AccountChangeCallback = (accountInfo, context) => {
      this.handleAccountChange(roomAddress, accountInfo, context);
    };

    try {
      const subscriptionId = this.connection.onAccountChange(
        new PublicKey(roomAddress),
        callback,
        'confirmed', // Commitment level
      );

      const subscription: SubscriptionInfo = {
        id: subscriptionId,
        accountAddress: roomAddress,
        callback,
        active: true,
        createdAt: Date.now(),
      };

      this.subscriptions.set(subscriptionKey, subscription);
      console.log('Subscribed to game room:', roomAddress, 'ID:', subscriptionId);

      return subscriptionId;
    } catch (error) {
      console.error('Failed to subscribe to game room:', error);
      throw error;
    }
  }

  /**
   * Subscribe to program account changes (all game rooms)
   */
  public subscribeToProgramAccounts(discriminator?: Buffer): number {
    const subscriptionKey = `program_${discriminator?.toString('hex') || 'all'}`;

    if (this.subscriptions.has(subscriptionKey)) {
      console.warn('Already subscribed to program accounts with discriminator:', discriminator);
      return this.subscriptions.get(subscriptionKey)!.id;
    }

    // TODO: Implement program account subscription
    // This would require using connection.onProgramAccountChange()
    // For now, we'll use a placeholder

    const subscriptionId = ++this.subscriptionCounter;
    const subscription: SubscriptionInfo = {
      id: subscriptionId,
      accountAddress: 'program_accounts',
      callback: () => {}, // Placeholder
      discriminator,
      active: true,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscriptionKey, subscription);
    console.log('Subscribed to program accounts with discriminator:', discriminator);

    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  public async unsubscribe(subscriptionId: number): Promise<void> {
    const subscription = Array.from(this.subscriptions.values()).find(
      (sub) => sub.id === subscriptionId,
    );

    if (!subscription) {
      console.warn('Subscription not found:', subscriptionId);
      return;
    }

    try {
      await this.connection.removeAccountChangeListener(subscriptionId);

      const subscriptionKey = Array.from(this.subscriptions.entries()).find(
        ([, sub]) => sub.id === subscriptionId,
      )?.[0];

      if (subscriptionKey) {
        this.subscriptions.delete(subscriptionKey);
        console.log('Unsubscribed from:', subscriptionKey);
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  public async cleanup(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.values()).map((subscription) => this.unsubscribe(subscription.id).catch((error) => {
      console.error('Error cleaning up subscription:', subscription.id, error);
    }));

    await Promise.all(unsubscribePromises);
    this.subscriptions.clear();
    this.eventCache.clear();
    console.log('All subscriptions cleaned up');
  }

  /**
   * Get active subscriptions
   */
  public getActiveSubscriptions(): SubscriptionInfo[] {
    return Array.from(this.subscriptions.values()).filter((sub) => sub.active);
  }

  /**
   * Handle account change events
   */
  private handleAccountChange(address: string, accountInfo: any, context: any): void {
    try {
      // Parse the account data using Anchor if program is available
      if (this.program && accountInfo.data) {
        const parsedEvent = this.parseAccountData(address, accountInfo.data, context);
        if (parsedEvent) {
          // Check for duplicates
          const eventKey = `${parsedEvent.signature}_${parsedEvent.slot}`;
          if (!this.eventCache.has(eventKey)) {
            this.eventCache.set(eventKey, parsedEvent);
            this.emit('gameEvent', parsedEvent);

            // Forward to WebSocket manager for real-time distribution
            webSocketManager.emit('solanaEvent', parsedEvent);

            // Cleanup old cache entries (keep last 1000 events)
            if (this.eventCache.size > 1000) {
              const firstKey = this.eventCache.keys().next().value;
              this.eventCache.delete(firstKey);
            }
          }
        }
      } else {
        // Emit raw account change if no program available
        this.emit('accountChange', {
          address,
          accountInfo,
          context,
        });
      }
    } catch (error) {
      console.error('Error handling account change:', error);
      this.emit('subscriptionError', { address, error });
    }
  }

  /**
   * Parse account data using Anchor IDL
   */
  private parseAccountData(address: string, data: Buffer, context: any): ParsedGameEvent | null {
    if (!this.program || !data || data.length === 0) {
      return null;
    }

    try {
      // TODO: Implement proper account data parsing using Anchor
      // This is a placeholder implementation

      // Get discriminator (first 8 bytes)
      const discriminator = data.slice(0, 8);

      // Determine event type based on discriminator
      // These would match the discriminators from your Anchor program
      const eventType = this.getEventTypeFromDiscriminator(discriminator);

      if (!eventType) {
        return null; // Unknown event type
      }

      // Parse the account data (this would use actual Anchor deserialization)
      const parsedData = this.deserializeAccountData(data, eventType);

      const parsedEvent: ParsedGameEvent = {
        type: eventType as any,
        roomId: address, // Assuming the account address is the room ID
        data: parsedData,
        signature: context.signature || 'unknown',
        slot: context.slot || 0,
        timestamp: Date.now(),
      };

      return parsedEvent;
    } catch (error) {
      console.error('Failed to parse account data:', error);
      return null;
    }
  }

  /**
   * Get event type from discriminator
   */
  private getEventTypeFromDiscriminator(discriminator: Buffer): string | null {
    // TODO: Replace with actual discriminator mapping from your Anchor program
    const discriminatorMap = new Map([
      // These are placeholder discriminators - replace with actual ones from your program
      ['0x00', 'RoomCreated'],
      ['0x01', 'PlayerJoined'],
      ['0x02', 'SelectionMade'],
      ['0x03', 'GameResolved'],
    ]);

    const discriminatorHex = discriminator.toString('hex').slice(0, 4); // First 2 bytes
    return discriminatorMap.get(discriminatorHex) || null;
  }

  /**
   * Deserialize account data based on event type
   */
  private deserializeAccountData(data: Buffer, eventType: string): any {
    // TODO: Implement proper deserialization using Anchor
    // This is a placeholder that returns raw data

    try {
      // Skip discriminator (first 8 bytes) and deserialize the rest
      const accountData = data.slice(8);

      // This would use Anchor's account deserialization
      // For now, return a placeholder structure
      return {
        eventType,
        rawData: accountData,
        parsed: false, // Indicates this needs proper parsing
      };
    } catch (error) {
      console.error('Failed to deserialize account data:', error);
      return null;
    }
  }

  /**
   * Enable event replay for missed events during disconnection
   */
  public async replayEvents(fromSlot?: number): Promise<void> {
    // TODO: Implement event replay functionality
    // This would query historical transactions and re-emit missed events

    try {
      if (!fromSlot) {
        console.log('No fromSlot provided, skipping event replay');
        return;
      }

      // Get recent confirmed blocks and filter for program transactions
      // Then re-emit any missed events
      console.log('Event replay not yet implemented - TODO');
    } catch (error) {
      console.error('Failed to replay events:', error);
    }
  }
}

// Export default instance
export const eventSubscriptionManager = new EventSubscriptionManager(
  // TODO: Pass actual connection from config/context
  {} as Connection,
);
