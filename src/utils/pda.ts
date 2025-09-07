import { PublicKey } from '@solana/web3.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { BN } from '@coral-xyz/anchor';

/**
 * Derive the PDA for a game room using the creator's public key and room ID
 */
export const deriveGameRoomPDA = (
  programId: PublicKey,
  creatorKey: PublicKey,
  roomId: number,
): [PublicKey, number] => {
  const roomIdBN = new BN(roomId);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('game_room'),
      creatorKey.toBuffer(),
      roomIdBN.toArrayLike(Buffer, 'le', 8),
    ],
    programId,
  );
};

/**
 * Try to find a game room PDA by trying different potential creators
 * This is a workaround for when we don't know the creator beforehand
 */
export const findGameRoomPDA = async (
  program: any,
  roomId: number,
  potentialCreators: PublicKey[],
): Promise<{ pda: PublicKey; creator: PublicKey } | null> => {
  for (const creator of potentialCreators) {
    try {
      const [pda] = deriveGameRoomPDA(program.programId, creator, roomId);

      // Try to fetch the account to see if it exists
      const account = await program.account.gameRoom.fetch(pda);

      if (account) {
        return { pda, creator };
      }
    } catch (error) {
      // Account doesn't exist with this creator, try next
      continue;
    }
  }

  return null;
};
