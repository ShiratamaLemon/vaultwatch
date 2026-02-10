'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { config } from '@/lib/wagmi/config';

import '@rainbow-me/rainbowkit/styles.css';

// =============================================================================
// DataHaven Context
// =============================================================================

interface DataHavenContextType {
  wasmInitialized: boolean;
  wasmError: Error | null;
}

const DataHavenContext = createContext<DataHavenContextType>({
  wasmInitialized: false,
  wasmError: null,
});

export const useDataHavenContext = () => useContext(DataHavenContext);

/**
 * DataHaven Provider - Initializes WASM for StorageHub SDK
 */
const DataHavenProvider = ({ children }: { children: ReactNode }) => {
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [wasmError, setWasmError] = useState<Error | null>(null);

  useEffect(() => {
    const initWasm = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { initializeWasm } = await import('@/lib/datahaven/client');
        await initializeWasm();
        setWasmInitialized(true);
        console.log('✅ DataHaven WASM initialized');
      } catch (error) {
        console.error('❌ Failed to initialize DataHaven WASM:', error);
        setWasmError(error instanceof Error ? error : new Error('WASM init failed'));
        // Still allow app to function with mock data
        setWasmInitialized(true);
      }
    };

    initWasm();
  }, []);

  return (
    <DataHavenContext.Provider value={{ wasmInitialized, wasmError }}>
      {children}
    </DataHavenContext.Provider>
  );
};

// =============================================================================
// Main Providers
// =============================================================================

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#10b981', // Emerald-500
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
        >
          <DataHavenProvider>{children}</DataHavenProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
