import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@polkadot/api',
    '@polkadot/types',
    '@polkadot/util',
    '@polkadot/util-crypto',
    '@storagehub-sdk/core',
    '@storagehub-sdk/msp-client',
    '@storagehub/api-augment',
    '@storagehub/types-bundle',
    '@rainbow-me/rainbowkit',
    'viem',
    'wagmi',
  ],
};

export default nextConfig;
