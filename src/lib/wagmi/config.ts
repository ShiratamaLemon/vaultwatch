import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { type Chain } from 'viem';

// =============================================================================
// WalletConnect Project ID Validation
// =============================================================================

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Warn if Project ID is not configured (WalletConnect features will be limited)
if (!walletConnectProjectId || walletConnectProjectId === 'demo') {
  console.warn(
    '⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not configured.\n' +
    '   Mobile wallet connections via WalletConnect will not work.\n' +
    '   Get your free Project ID at: https://cloud.walletconnect.com/\n' +
    '   Then add it to your .env.local file.'
  );
}

// =============================================================================
// DataHaven Testnet Chain Definition
// =============================================================================

export const datahavenTestnet: Chain = {
  id: 55931,
  name: 'DataHaven Testnet',
  nativeCurrency: {
    name: 'MOCK',
    symbol: 'MOCK',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://services.datahaven-testnet.network/testnet'],
      webSocket: ['wss://services.datahaven-testnet.network/testnet'],
    },
    public: {
      http: ['https://services.datahaven-testnet.network/testnet'],
      webSocket: ['wss://services.datahaven-testnet.network/testnet'],
    },
  },
  blockExplorers: {
    default: {
      name: 'DataHaven Explorer',
      url: 'https://explorer.datahaven-testnet.network',
    },
  },
  testnet: true,
};

// =============================================================================
// RainbowKit + wagmi configuration
// =============================================================================

export const config = getDefaultConfig({
  appName: 'VaultWatch',
  // Use configured Project ID, fallback to placeholder for development
  // Note: WalletConnect features won't work without a valid Project ID
  projectId: walletConnectProjectId || 'development-placeholder',
  chains: [datahavenTestnet],
  transports: {
    [datahavenTestnet.id]: http('https://services.datahaven-testnet.network/testnet'),
  },
  ssr: true,
});
