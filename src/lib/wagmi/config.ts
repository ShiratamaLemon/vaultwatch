import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { type Chain } from 'viem';

// DataHaven Testnet Chain Definition
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

// RainbowKit + wagmi configuration
export const config = getDefaultConfig({
  appName: 'VaultWatch',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [datahavenTestnet],
  transports: {
    [datahavenTestnet.id]: http('https://services.datahaven-testnet.network/testnet'),
  },
  ssr: true,
});
