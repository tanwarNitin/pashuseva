import "server-only";
import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { serverEnv } from "@/lib/env";

const scryptAsync = promisify(scrypt);

// Scrypt parameters (following OWASP recommendations)
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // CPU/memory cost factor (N)
const SCRYPT_BLOCK_SIZE = 8; // Block size (r)
const SCRYPT_PARALLELIZATION = 1; // Parallelization factor (p)

/**
 * Apply HMAC-SHA256 with pepper to PIN before scrypt
 * This binds the pepper cryptographically rather than simple concatenation
 */
function pepperedPin(pin: string): Buffer {
  return createHmac("sha256", serverEnv.PIN_PEPPER).update(pin).digest();
}

/**
 * Hash a PIN with scrypt
 * Uses a random salt plus server-held pepper via HMAC
 *
 * Format: salt:hash
 * Both salt and hash are hex-encoded
 */
export async function hashPIN(pin: string): Promise<string> {
  // Generate random salt (16 bytes)
  const salt = randomBytes(16);

  // HMAC PIN with pepper before scrypt
  const peppered = pepperedPin(pin);

  // Hash with scrypt - using callback style to support N, r, p options
  const hash = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      peppered,
      salt,
      SCRYPT_KEYLEN,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
      },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      }
    );
  });

  // Return salt:hash (both hex-encoded)
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a PIN against a stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPIN(
  pin: string,
  storedHash: string
): Promise<boolean> {
  try {
    // Parse stored hash
    const [saltHex, hashHex] = storedHash.split(":");

    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, "hex");
    const expectedHash = Buffer.from(hashHex, "hex");

    // HMAC PIN with pepper before scrypt
    const peppered = pepperedPin(pin);

    const actualHash = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        peppered,
        salt,
        SCRYPT_KEYLEN,
        {
          N: SCRYPT_COST,
          r: SCRYPT_BLOCK_SIZE,
          p: SCRYPT_PARALLELIZATION,
        },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });

    // Constant-time comparison
    return (
      expectedHash.length === actualHash.length &&
      timingSafeEqual(expectedHash, actualHash)
    );
  } catch {
    return false;
  }
}

/**
 * Validate PIN format
 * Must be exactly 4 digits, kept as string to preserve leading zeros
 */
export function validatePINFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
