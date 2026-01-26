/**
 * DataHaven Explorer Utilities
 *
 * Generates links to various DataHaven testnet explorers
 * for viewing transactions, accounts, and storage requests.
 *
 * Note: DataHaven has a dual-layer architecture:
 * - EVM Layer: DHScan and Basic Explorer use 0x... transaction hashes
 * - Substrate Layer: Statescan uses block-based navigation (extrinsics)
 */

export type ExplorerType = 'dhscan' | 'basic' | 'statescan';

interface ExplorerConfig {
  name: string;
  baseUrl: string;
  txPath: string;
  accountPath: string;
  blockPath: string;
  icon: string;
  /** Whether this explorer supports EVM transaction hashes */
  supportsEvmTxHash: boolean;
}

const EXPLORERS: Record<ExplorerType, ExplorerConfig> = {
  dhscan: {
    name: 'DHScan',
    baseUrl: 'https://testnet.dhscan.io',
    txPath: '/tx',
    accountPath: '/address',
    blockPath: '/block',
    icon: '🔍',
    supportsEvmTxHash: true,
  },
  basic: {
    name: 'Basic Explorer',
    baseUrl: 'https://datahaven-explorer.netlify.app',
    txPath: '/tx',
    accountPath: '/account',
    blockPath: '/block',
    icon: '📋',
    supportsEvmTxHash: true,
  },
  statescan: {
    name: 'Statescan',
    baseUrl: 'https://datahaven-testnet.statescan.io/#',
    txPath: '/extrinsics', // Substrate extrinsics (not used for EVM tx)
    accountPath: '/accounts',
    blockPath: '/blocks',
    icon: '📊',
    supportsEvmTxHash: false, // Statescan is for Substrate layer only
  },
};

/**
 * Generate a transaction link for a specific explorer
 */
export const getTransactionLink = (
  txHash: string,
  explorer: ExplorerType = 'dhscan'
): string => {
  const config = EXPLORERS[explorer];
  return `${config.baseUrl}${config.txPath}/${txHash}`;
};

/**
 * Generate an account/address link for a specific explorer
 */
export const getAccountLink = (
  address: string,
  explorer: ExplorerType = 'dhscan'
): string => {
  const config = EXPLORERS[explorer];
  return `${config.baseUrl}${config.accountPath}/${address}`;
};

/**
 * Generate a block link for a specific explorer
 */
export const getBlockLink = (
  blockNumber: number | string,
  explorer: ExplorerType = 'dhscan'
): string => {
  const config = EXPLORERS[explorer];
  return `${config.baseUrl}${config.blockPath}/${blockNumber}`;
};

/**
 * Explorer link with optional note for special cases
 */
export interface ExplorerLink {
  name: string;
  url: string;
  icon: string;
  /** Additional note (e.g., "Block View" for Statescan) */
  note?: string;
}

/**
 * Get all explorer links for a transaction
 *
 * @param txHash - EVM transaction hash (0x...)
 * @param blockNumber - Optional block number for Substrate-only explorers
 */
export const getAllTransactionLinks = (
  txHash: string,
  blockNumber?: number
): ExplorerLink[] => {
  return Object.entries(EXPLORERS).map(([key, config]) => {
    const explorerType = key as ExplorerType;

    // For Statescan (Substrate layer), use block link instead of tx hash
    if (!config.supportsEvmTxHash) {
      if (blockNumber) {
        return {
          name: config.name,
          url: getBlockLink(blockNumber, explorerType),
          icon: config.icon,
          note: 'Block View',
        };
      }
      // If no block number, still show Statescan but with a note
      return {
        name: config.name,
        url: `${config.baseUrl}`,
        icon: config.icon,
        note: 'Substrate Explorer',
      };
    }

    // For EVM-compatible explorers, use tx hash
    return {
      name: config.name,
      url: getTransactionLink(txHash, explorerType),
      icon: config.icon,
    };
  });
};

/**
 * Get all explorer links for an account
 */
export const getAllAccountLinks = (
  address: string
): Array<{ name: string; url: string; icon: string }> => {
  return Object.entries(EXPLORERS).map(([key, config]) => ({
    name: config.name,
    url: getAccountLink(address, key as ExplorerType),
    icon: config.icon,
  }));
};

/**
 * Shorten a hash or address for display
 */
export const shortenHash = (hash: string, chars: number = 6): string => {
  if (!hash) return '';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * Get explorer configuration
 */
export const getExplorerConfig = (explorer: ExplorerType): ExplorerConfig => {
  return EXPLORERS[explorer];
};

/**
 * Get all available explorers
 */
export const getAvailableExplorers = (): Array<{
  key: ExplorerType;
  config: ExplorerConfig;
}> => {
  return Object.entries(EXPLORERS).map(([key, config]) => ({
    key: key as ExplorerType,
    config,
  }));
};
