/**
 * Verification result cache for DataHaven files
 * 
 * This cache stores verification results keyed by fileKey + fingerprint
 * to ensure that file modifications are detected even if fileKey remains the same.
 */

interface VerificationCacheEntry {
  fileKey: string;
  fingerprint: string;  // Fingerprint at verification time
  verified: boolean;
  onChainFingerprint?: string;
  calculatedFingerprint?: string;
  reason?: string;
  verifiedAt: number;
  expiresAt: number;    // Expiry time (1 hour default)
}

const CACHE_KEY_PREFIX = 'vaultwatch:verification:';
const CACHE_EXPIRY_MS = 3600000; // 1 hour

/**
 * Get cached verification result if fingerprint matches and cache is valid
 * 
 * @param fileKey - The file key
 * @param currentFingerprint - Current fingerprint of the file
 * @returns Cached verification result or null if cache miss or fingerprint mismatch
 */
export const getVerificationCache = (
  fileKey: string,
  currentFingerprint: string
): VerificationCacheEntry | null => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${fileKey}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: VerificationCacheEntry = JSON.parse(cached);
    
    // Check if fingerprint matches and cache is still valid
    if (
      entry.fingerprint === currentFingerprint &&
      entry.expiresAt > Date.now()
    ) {
      return entry;
    }
    
    // Fingerprint mismatch or expired - remove cache
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.warn('Failed to read verification cache:', error);
    return null;
  }
};

/**
 * Set verification result in cache
 * 
 * @param fileKey - The file key
 * @param fingerprint - Fingerprint of the verified file
 * @param verified - Whether verification passed
 * @param onChainFingerprint - Optional on-chain fingerprint
 * @param calculatedFingerprint - Optional calculated fingerprint
 * @param reason - Optional reason for verification result
 */
export const setVerificationCache = (
  fileKey: string,
  fingerprint: string,
  verified: boolean,
  onChainFingerprint?: string,
  calculatedFingerprint?: string,
  reason?: string
): void => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${fileKey}`;
    const entry: VerificationCacheEntry = {
      fileKey,
      fingerprint,
      verified,
      onChainFingerprint,
      calculatedFingerprint,
      reason,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + CACHE_EXPIRY_MS,
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to cache verification result:', error);
    // Ignore storage quota errors
  }
};

/**
 * Clear verification cache for a specific file
 */
export const clearVerificationCache = (fileKey: string): void => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${fileKey}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Failed to clear verification cache:', error);
  }
};

/**
 * Clear all verification caches
 */
export const clearAllVerificationCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear all verification cache:', error);
  }
};

/**
 * Clean expired cache entries
 */
export const cleanExpiredCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const entry: VerificationCacheEntry = JSON.parse(
            localStorage.getItem(key) || '{}'
          );
          if (entry.expiresAt && entry.expiresAt < now) {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to clean expired cache:', error);
  }
};
