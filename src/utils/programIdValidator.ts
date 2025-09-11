import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '../config/program';

/**
 * Program ID Validation Utility
 *
 * This utility helps ensure consistency across different configuration sources
 * and provides runtime validation of the Program ID being used.
 */

// Expected Program ID that should be used throughout the application
const EXPECTED_PROGRAM_ID = 'DwEq4NgXQJsJCo1UoxpFXFUAKk4w2LpFqgX18dLvvmrp';

export interface ProgramIdValidationResult {
  isValid: boolean;
  currentProgramId: string;
  expectedProgramId: string;
  source: string;
  warnings: string[];
}

/**
 * Validate that the current Program ID matches the expected one
 */
export function validateProgramId(): ProgramIdValidationResult {
  const warnings: string[] = [];
  const currentProgramId = PROGRAM_ID.toString();

  const result: ProgramIdValidationResult = {
    isValid: currentProgramId === EXPECTED_PROGRAM_ID,
    currentProgramId,
    expectedProgramId: EXPECTED_PROGRAM_ID,
    source: 'config/program.ts',
    warnings,
  };

  // Check environment variable if available
  if (process.env.REACT_APP_PROGRAM_ID) {
    const envProgramId = process.env.REACT_APP_PROGRAM_ID;
    if (envProgramId !== EXPECTED_PROGRAM_ID) {
      warnings.push(`Environment variable REACT_APP_PROGRAM_ID (${envProgramId}) does not match expected Program ID (${EXPECTED_PROGRAM_ID})`);
    }
    if (envProgramId !== currentProgramId) {
      warnings.push(`Environment variable REACT_APP_PROGRAM_ID (${envProgramId}) does not match config/program.ts (${currentProgramId})`);
    }
  }

  if (!result.isValid) {
    warnings.push(`Current Program ID (${currentProgramId}) does not match expected Program ID (${EXPECTED_PROGRAM_ID})`);
  }

  return result;
}

/**
 * Log Program ID validation results to console
 */
export function logProgramIdValidation(): void {
  const validation = validateProgramId();

  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ Program ID validation passed:', validation.currentProgramId);
  } else {
    console.warn('⚠️ Program ID validation issues detected:');
    console.warn('Current Program ID:', validation.currentProgramId);
    console.warn('Expected Program ID:', validation.expectedProgramId);

    if (validation.warnings.length > 0) {
      console.warn('Warnings:');
      validation.warnings.forEach((warning, index) => {
        console.warn(`  ${index + 1}. ${warning}`);
      });
    }

    if (!validation.isValid) {
      console.error('❌ Program ID mismatch detected! This may cause issues with blockchain interactions.');
    }
  }
}

/**
 * Verify that a PublicKey matches the expected Program ID
 */
export function verifyProgramIdMatch(publicKey: PublicKey): boolean {
  return publicKey.toString() === EXPECTED_PROGRAM_ID;
}

/**
 * Get the expected Program ID as a PublicKey
 */
export function getExpectedProgramId(): PublicKey {
  return new PublicKey(EXPECTED_PROGRAM_ID);
}

/**
 * Runtime assertion to ensure Program ID consistency
 * Throws an error if Program ID validation fails
 */
export function assertProgramIdConsistency(): void {
  const validation = validateProgramId();

  if (!validation.isValid) {
    throw new Error(`Program ID validation failed: Current (${validation.currentProgramId}) !== Expected (${validation.expectedProgramId})`);
  }

  if (validation.warnings.length > 0) {
    console.warn('Program ID validation warnings detected:', validation.warnings);
  }
}
