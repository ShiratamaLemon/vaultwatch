'use client';

/**
 * Custom hook for DataHaven SDK operations
 *
 * This hook provides a high-level interface to interact with DataHaven
 * including bucket management, file operations, and authentication.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useDataHavenContext } from '@/app/providers';
import { datahavenTestnet } from '@/lib/wagmi/config';
import type {
  BucketInfo,
  FileUploadResult,
  MspHealthStatus,
  VerificationResult,
  VerificationStatus,
  VerifiedDownloadResult,
} from '@/lib/datahaven/types';
import type {
  StorageCostEstimate,
  FileStorageVerification,
  Bucket,
  FileTree,
  DownloadOptions,
} from '@/lib/datahaven/client';
import type { Project, Commitment, CommitmentStatus, ProjectIndexEntry } from '@/types';
import { useProjectStore } from '@/stores/projectStore';

interface StatusUpdateResult {
  success: boolean;
  fileKey?: string;
  txHash?: string;
  blockNumber?: number;
}

/**
 * Download result with verification info
 */
interface DownloadResult<T> {
  data: T | null;
  verification: {
    status: VerificationStatus;
    reason?: string;
  };
}

interface UseDataHavenReturn {
  // State
  isInitialized: boolean;
  isReadOnlyReady: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  mspHealth: MspHealthStatus | null;

  // Initialization
  initialize: () => Promise<void>;

  // Authentication
  authenticate: () => Promise<boolean>;

  // Bucket operations
  createBucket: (name: string) => Promise<{ bucketId: string; txHash: string; blockNumber?: number } | null>;
  getBucket: (bucketId: string) => Promise<BucketInfo | null>;

  // File operations
  uploadFile: <T>(
    bucketId: string,
    fileName: string,
    data: T,
    type: 'project' | 'commitment' | 'index'
  ) => Promise<FileUploadResult | null>;
  
  /**
   * Download file with verification (recommended)
   * @param fileKey - File key to download
   * @param options - Download options including verification settings
   * @returns Downloaded data with verification status
   */
  downloadFileVerified: <T>(
    fileKey: string,
    options?: DownloadOptions
  ) => Promise<DownloadResult<T>>;
  
  /**
   * Download file (legacy, no verification info returned)
   * @deprecated Use downloadFileVerified instead
   */
  downloadFile: <T>(fileKey: string) => Promise<T | null>;
  
  /**
   * Verify data integrity against on-chain fingerprint
   */
  verifyDataIntegrity: (
    fileKey: string,
    data: Uint8Array | Blob,
    expectedFingerprint?: string
  ) => Promise<VerificationResult>;
  
  verifyFileStorage: (fileKey: string, bucketId?: string) => Promise<FileStorageVerification | null>;

  // Cost estimation
  estimateCost: (fileSizeBytes: number, replicas?: number, durationDays?: number) => Promise<StorageCostEstimate | null>;
  getCostEstimateString: (fileSizeBytes: number, replicas?: number, durationDays?: number) => Promise<string>;

  // Health check
  checkHealth: () => Promise<MspHealthStatus>;

  // Data retrieval from MSP (off-chain storage)
  listUserBuckets: () => Promise<Bucket[]>;
  listVaultWatchProjects: () => Promise<Array<{ bucket: Bucket; project: Project | null }>>;
  loadProject: (bucketId: string) => Promise<Project | null>;
  loadCommitments: (bucketId: string) => Promise<Commitment[]>;
  getBucketFiles: (bucketId: string, path?: string) => Promise<FileTree[]>;
  
  // Data retrieval with verification
  loadProjectWithVerification: (
    bucketId: string
  ) => Promise<{ data: Project | null; verification: VerificationResult }>;
  loadCommitmentsWithVerification: (
    bucketId: string
  ) => Promise<Array<{ data: Commitment; verification: VerificationResult; fileKey: string }>>;

  // Ownership verification (on-chain)
  verifyBucketOwnership: (
    bucketId: string
  ) => Promise<{ isOwner: boolean; reason?: string }>;

  // Commitment status update
  updateCommitmentStatus: (
    bucketId: string,
    commitment: Commitment,
    newStatus: CommitmentStatus,
    reason: string
  ) => Promise<StatusUpdateResult>;
}

export const useDataHaven = (): UseDataHavenReturn => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { wasmInitialized, wasmError } = useDataHavenContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isReadOnlyReady, setIsReadOnlyReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(wasmError);
  const [mspHealth, setMspHealth] = useState<MspHealthStatus | null>(null);

  /**
   * Initialize DataHaven clients
   */
  const initialize = useCallback(async () => {
    if (!wasmInitialized || !address || !walletClient || !publicClient) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const {
        initPolkadotApi,
        initStorageHubClient,
        initMspClient,
        initPublicClient,
        checkMspHealth,
      } = await import('@/lib/datahaven/client');

      // Initialize all clients
      await initPolkadotApi();
      initStorageHubClient(datahavenTestnet, walletClient);
      initPublicClient(datahavenTestnet);
      await initMspClient(address);

      // Check MSP health
      const health = await checkMspHealth();
      setMspHealth(health);

      setIsInitialized(true);
      setIsReadOnlyReady(true);
      console.log('✅ DataHaven clients initialized');
    } catch (err) {
      console.error('Failed to initialize DataHaven:', err);
      setError(err instanceof Error ? err : new Error('Initialization failed'));
    } finally {
      setIsLoading(false);
    }
  }, [wasmInitialized, address, walletClient, publicClient]);

  /**
   * Initialize read-only clients (no wallet required)
   * Enables browsing projects without connecting a wallet.
   */
  const initReadOnly = useCallback(async () => {
    if (!wasmInitialized || isReadOnlyReady || isLoading) return;

    try {
      const { initializeReadOnly } = await import('@/lib/datahaven/client');
      await initializeReadOnly(datahavenTestnet);
      setIsReadOnlyReady(true);
      console.log('✅ DataHaven read-only clients initialized');
    } catch (err) {
      console.error('Failed to initialize read-only mode:', err);
    }
  }, [wasmInitialized, isReadOnlyReady, isLoading]);

  /**
   * Authenticate with SIWE
   */
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!walletClient || !isInitialized) {
      setError(new Error('Wallet not connected or not initialized'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { authenticateWithSIWE } = await import('@/lib/datahaven/client');
      await authenticateWithSIWE(walletClient);
      setIsAuthenticated(true);
      console.log('✅ SIWE authentication successful');
      return true;
    } catch (err) {
      console.error('SIWE authentication failed:', err);
      setError(err instanceof Error ? err : new Error('Authentication failed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, isInitialized]);

  /**
   * Create a new bucket
   * 
   * Success is determined by the on-chain transaction confirmation.
   * Backend sync happens asynchronously and doesn't block the UI.
   */
  const createBucket = useCallback(
    async (name: string): Promise<{ bucketId: string; txHash: string; blockNumber?: number } | null> => {
      if (!address || !isInitialized) {
        setError(new Error('Not initialized'));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { createBucket: createBucketFn, isAuthenticated: checkAuth } = await import('@/lib/datahaven/client');

        // Check SDK-level session state (not React state)
        if (!checkAuth()) {
          const authSuccess = await authenticate();
          if (!authSuccess) {
            setIsLoading(false);
            return null;
          }
        }

        // Create bucket on-chain - this is the definitive success criteria
        const result = await createBucketFn(name, address);

        console.log('✅ Bucket created on-chain:', result.bucketId);
        console.log('📋 TX Hash:', result.txHash);
        if (result.blockNumber) {
          console.log('📦 Block Number:', result.blockNumber);
        }

        // Note: Backend sync happens asynchronously on MSP side
        // The bucket is already permanently recorded on-chain
        return result;
      } catch (err) {
        console.error('Failed to create bucket:', err);
        setError(err instanceof Error ? err : new Error('Bucket creation failed'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [address, isInitialized, authenticate]
  );

  /**
   * Get bucket info
   */
  const getBucket = useCallback(
    async (bucketId: string): Promise<BucketInfo | null> => {
      if (!isReadOnlyReady && !isInitialized) {
        return null;
      }

      try {
        const { getBucket: getBucketFn } = await import('@/lib/datahaven/client');
        return await getBucketFn(bucketId);
      } catch (err) {
        console.error('Failed to get bucket:', err);
        return null;
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Upload a file
   * 
   * Success is determined by:
   * 1. On-chain storage request transaction confirmed
   * 2. File uploaded to MSP successfully
   * 
   * MSP on-chain confirmation and backend indexing happen asynchronously
   * and don't block the UI. The data is already permanently recorded.
   */
  const uploadFile = useCallback(
    async <T>(
      bucketId: string,
      fileName: string,
      data: T,
      type: 'project' | 'commitment' | 'index'
    ): Promise<FileUploadResult | null> => {
      if (!address || !isInitialized) {
        setError(new Error('Not initialized'));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { uploadJsonFile, isAuthenticated: checkAuth } = await import('@/lib/datahaven/client');

        // Check SDK-level session state (not React state)
        // This avoids re-authentication when session is already valid from createBucket
        if (!checkAuth()) {
          const authSuccess = await authenticate();
          if (!authSuccess) {
            setIsLoading(false);
            return null;
          }
        }

        // Upload file - includes on-chain TX and MSP upload
        // This is the definitive success criteria
        const result = await uploadJsonFile(bucketId, fileName, data, type, address);

        console.log('✅ File uploaded successfully');
        console.log('📋 TX Hash:', result.txHash);
        console.log('🔑 File Key:', result.fileKey);
        if (result.blockNumber) {
          console.log('📦 Block Number:', result.blockNumber);
        }

        // Note: MSP on-chain confirmation and backend indexing happen asynchronously
        // The file is already permanently recorded on-chain and stored on MSP
        return result;
      } catch (err) {
        console.error('Failed to upload file:', err);
        setError(err instanceof Error ? err : new Error('Upload failed'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [address, isInitialized, authenticate]
  );

  /**
   * Download file from DataHaven with verification
   * This is the recommended method for downloading files
   */
  const downloadFileVerified = useCallback(
    async <T>(
      fileKey: string,
      options: DownloadOptions = {}
    ): Promise<DownloadResult<T>> => {
      if (!isReadOnlyReady && !isInitialized) {
        setError(new Error('Not initialized'));
        return {
          data: null,
          verification: {
            status: 'unavailable',
            reason: 'DataHaven not initialized',
          },
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        const { downloadJsonFile } = await import('@/lib/datahaven/client');
        const result = await downloadJsonFile<T>(fileKey, options);

        return {
          data: result.data,
          verification: {
            status: result.verification.status,
            reason: result.verification.reason,
          },
        };
      } catch (err) {
        console.error('Failed to download file:', err);
        setError(err instanceof Error ? err : new Error('Download failed'));
        return {
          data: null,
          verification: {
            status: 'failed',
            reason: err instanceof Error ? err.message : 'Download failed',
          },
        };
      } finally {
        setIsLoading(false);
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Download file from DataHaven (legacy, without verification info)
   * @deprecated Use downloadFileVerified instead
   */
  const downloadFile = useCallback(
    async <T>(fileKey: string): Promise<T | null> => {
      if (!isReadOnlyReady && !isInitialized) {
        setError(new Error('Not initialized'));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { downloadJsonFile } = await import('@/lib/datahaven/client');
        const result = await downloadJsonFile<T>(fileKey, { verify: true });

        // Log verification status but don't block
        if (result.verification.status === 'failed') {
          console.warn(`⚠️ Data integrity verification failed: ${result.verification.reason}`);
        }

        return result.data;
      } catch (err) {
        console.error('Failed to download file:', err);
        setError(err instanceof Error ? err : new Error('Download failed'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Verify data integrity against on-chain fingerprint
   */
  const verifyDataIntegrity = useCallback(
    async (
      fileKey: string,
      data: Uint8Array | Blob,
      expectedFingerprint?: string
    ): Promise<VerificationResult> => {
      if (!isReadOnlyReady && !isInitialized) {
        return {
          verified: false,
          reason: 'DataHaven not initialized',
        };
      }

      try {
        const { verifyDataIntegrity: verifyFn } = await import('@/lib/datahaven/client');
        return await verifyFn(fileKey, data, expectedFingerprint);
      } catch (err) {
        console.error('Failed to verify data integrity:', err);
        return {
          verified: false,
          reason: err instanceof Error ? err.message : 'Verification failed',
          error: err,
        };
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Verify file storage status
   * Checks if file is securely stored (MSP confirmed + StorageRequestFulfilled)
   */
  const verifyFileStorage = useCallback(
    async (fileKey: string, bucketId?: string): Promise<FileStorageVerification | null> => {
      if (!isReadOnlyReady && !isInitialized) {
        setError(new Error('Not initialized'));
        return null;
      }

      try {
        const { verifyFileStorage: verifyFn } = await import('@/lib/datahaven/client');
        return await verifyFn(fileKey, bucketId);
      } catch (err) {
        console.error('Failed to verify file storage:', err);
        setError(err instanceof Error ? err : new Error('Verification failed'));
        return null;
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Estimate storage cost
   * Formula: cost = pricePerGbPerBlock × (GB stored) × (replicas) × (blocks)
   */
  const estimateCost = useCallback(
    async (
      fileSizeBytes: number,
      replicas: number = 1,
      durationDays: number = 30
    ): Promise<StorageCostEstimate | null> => {
      if (!isInitialized) {
        return null;
      }

      try {
        const { estimateStorageCost } = await import('@/lib/datahaven/client');
        return await estimateStorageCost(fileSizeBytes, replicas, durationDays);
      } catch (err) {
        console.error('Failed to estimate cost:', err);
        return null;
      }
    },
    [isInitialized]
  );

  /**
   * Get human-readable cost estimate string
   */
  const getCostEstimateString = useCallback(
    async (
      fileSizeBytes: number,
      replicas: number = 1,
      durationDays: number = 30
    ): Promise<string> => {
      try {
        const { getStorageCostEstimateString } = await import('@/lib/datahaven/client');
        return await getStorageCostEstimateString(fileSizeBytes, replicas, durationDays);
      } catch {
        return 'Unable to estimate cost';
      }
    },
    []
  );

  /**
   * Check MSP health
   */
  const checkHealth = useCallback(async (): Promise<MspHealthStatus> => {
    try {
      const { checkMspHealth } = await import('@/lib/datahaven/client');
      const health = await checkMspHealth();
      setMspHealth(health);
      return health;
    } catch {
      const unhealthy: MspHealthStatus = {
        isHealthy: false,
        storage: false,
        database: false,
        rpc: false,
      };
      setMspHealth(unhealthy);
      return unhealthy;
    }
  }, []);

  // =========================================================================
  // Data Retrieval from MSP (Off-chain Storage)
  // =========================================================================

  /**
   * List all buckets for the authenticated user
   */
  const listUserBuckets = useCallback(async (): Promise<Bucket[]> => {
    if (!isInitialized) {
      setError(new Error('Not initialized'));
      return [];
    }

    try {
      const { listUserBuckets: listBucketsFn, isAuthenticated: checkAuth } = await import('@/lib/datahaven/client');

      // Ensure authenticated
      if (!checkAuth()) {
        const authSuccess = await authenticate();
        if (!authSuccess) {
          return [];
        }
      }

      return await listBucketsFn();
    } catch (err) {
      console.error('Failed to list buckets:', err);
      setError(err instanceof Error ? err : new Error('Failed to list buckets'));
      return [];
    }
  }, [isInitialized, authenticate]);

  /**
   * List all VaultWatch projects from MSP
   * Returns buckets with their parsed project metadata
   */
  const listVaultWatchProjects = useCallback(async (): Promise<Array<{ bucket: Bucket; project: Project | null }>> => {
    // Full initialization: use authenticated flow (MSP bucket listing)
    if (isInitialized) {
      setIsLoading(true);
      setError(null);

      try {
        const {
          listVaultWatchBuckets,
          loadProjectFromBucket,
          isAuthenticated: checkAuth
        } = await import('@/lib/datahaven/client');

        // Ensure authenticated
        if (!checkAuth()) {
          const authSuccess = await authenticate();
          if (!authSuccess) {
            setIsLoading(false);
            return [];
          }
        }

        // Get all VaultWatch buckets
        const buckets = await listVaultWatchBuckets();

        // Load project metadata for each bucket
        const results: Array<{ bucket: Bucket; project: Project | null }> = [];
        for (const bucket of buckets) {
          const project = await loadProjectFromBucket<Project>(bucket.bucketId);
          results.push({ bucket, project });
        }

        // Cache to project store for read-only fallback
        const indexEntries: ProjectIndexEntry[] = results
          .filter(({ project }) => project !== null)
          .map(({ bucket, project }) => ({
            id: project!.id,
            name: project!.name,
            category: project!.category,
            status: project!.status,
            ownerAddress: project!.ownerAddress,
            bucketId: bucket.bucketId,
            commitmentCount: bucket.fileCount > 1 ? bucket.fileCount - 1 : 0,
            lastUpdated: project!.updatedAt,
          }));
        useProjectStore.getState().setProjects(indexEntries);
        useProjectStore.getState().setSyncedAt(Date.now());

        console.log(`✅ Loaded ${results.length} VaultWatch projects from MSP`);
        return results;
      } catch (err) {
        console.error('Failed to list VaultWatch projects:', err);
        setError(err instanceof Error ? err : new Error('Failed to list projects'));
        return [];
      } finally {
        setIsLoading(false);
      }
    }

    // Read-only mode: load from seed bucket IDs + cache
    if (isReadOnlyReady) {
      // Collect known bucket IDs from seed env var + cache
      const seedIds = (process.env.NEXT_PUBLIC_SEED_BUCKET_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const cachedIds = useProjectStore.getState().projects.map((p) => p.bucketId);
      const allIds = [...new Set([...seedIds, ...cachedIds])];

      if (allIds.length === 0) return [];

      setIsLoading(true);
      setError(null);

      try {
        const { loadProjectFromBucket } = await import('@/lib/datahaven/client');

        const results: Array<{ bucket: Bucket; project: Project | null }> = [];
        // Load in parallel
        const loaded = await Promise.all(
          allIds.map(async (bucketId) => {
            const project = await loadProjectFromBucket<Project>(bucketId);
            return { bucketId, project };
          })
        );

        for (const { bucketId, project } of loaded) {
          results.push({
            bucket: {
              bucketId: bucketId as `0x${string}`,
              name: project ? `vaultwatch-${project.id}` : '',
              root: '0x' as `0x${string}`,
              isPublic: true,
              sizeBytes: 0,
              valuePropId: '',
              fileCount: 0,
            },
            project,
          });
        }

        // Update cache with loaded data
        const indexEntries: ProjectIndexEntry[] = results
          .filter(({ project }) => project !== null)
          .map(({ bucket, project }) => ({
            id: project!.id,
            name: project!.name,
            category: project!.category,
            status: project!.status,
            ownerAddress: project!.ownerAddress,
            bucketId: bucket.bucketId,
            commitmentCount: 0,
            lastUpdated: project!.updatedAt,
          }));
        useProjectStore.getState().setProjects(indexEntries);
        useProjectStore.getState().setSyncedAt(Date.now());

        console.log(`✅ Loaded ${results.length} VaultWatch projects (read-only, seed+cache)`);
        return results;
      } catch (err) {
        console.error('Failed to load projects in read-only mode:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    }

    return [];
  }, [isInitialized, isReadOnlyReady, authenticate]);

  /**
   * Load a single project from a bucket
   */
  const loadProject = useCallback(async (bucketId: string): Promise<Project | null> => {
    if (!isReadOnlyReady && !isInitialized) {
      setError(new Error('Not initialized'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { loadProjectFromBucket } = await import('@/lib/datahaven/client');
      const project = await loadProjectFromBucket<Project>(bucketId);
      return project;
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err instanceof Error ? err : new Error('Failed to load project'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isReadOnlyReady, isInitialized]);

  /**
   * Load all commitments from a bucket
   */
  const loadCommitments = useCallback(async (bucketId: string): Promise<Commitment[]> => {
    if (!isReadOnlyReady && !isInitialized) {
      setError(new Error('Not initialized'));
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const { loadCommitmentsFromBucket } = await import('@/lib/datahaven/client');
      const commitments = await loadCommitmentsFromBucket<Commitment>(bucketId);
      return commitments;
    } catch (err) {
      console.error('Failed to load commitments:', err);
      setError(err instanceof Error ? err : new Error('Failed to load commitments'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isReadOnlyReady, isInitialized]);

  /**
   * Get files in a bucket
   */
  const getBucketFiles = useCallback(async (bucketId: string, path?: string): Promise<FileTree[]> => {
    if (!isReadOnlyReady && !isInitialized) {
      return [];
    }

    try {
      const { getBucketFiles: getBucketFilesFn } = await import('@/lib/datahaven/client');
      const response = await getBucketFilesFn(bucketId, path);
      return response.files;
    } catch (err) {
      console.error('Failed to get bucket files:', err);
      return [];
    }
  }, [isReadOnlyReady, isInitialized]);

  /**
   * Load project with verification
   */
  const loadProjectWithVerification = useCallback(
    async (bucketId: string): Promise<{ data: Project | null; verification: VerificationResult }> => {
      if (!isReadOnlyReady && !isInitialized) {
        return {
          data: null,
          verification: { verified: false, reason: 'Not initialized' },
        };
      }

      try {
        const { loadProjectFromBucketWithVerification } = await import('@/lib/datahaven/client');
        return await loadProjectFromBucketWithVerification<Project>(bucketId);
      } catch (err) {
        console.error('Failed to load project with verification:', err);
        return {
          data: null,
          verification: {
            verified: false,
            reason: err instanceof Error ? err.message : 'Unknown error',
            error: err,
          },
        };
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Load commitments with verification
   */
  const loadCommitmentsWithVerification = useCallback(
    async (
      bucketId: string
    ): Promise<Array<{ data: Commitment; verification: VerificationResult; fileKey: string }>> => {
      if (!isReadOnlyReady && !isInitialized) {
        return [];
      }

      try {
        const { loadCommitmentsFromBucketWithVerification } = await import('@/lib/datahaven/client');
        return await loadCommitmentsFromBucketWithVerification<Commitment>(bucketId);
      } catch (err) {
        console.error('Failed to load commitments with verification:', err);
        setError(err instanceof Error ? err : new Error('Failed to load commitments'));
        return [];
      }
    },
    [isReadOnlyReady, isInitialized]
  );

  /**
   * Verify bucket ownership on-chain
   * Provides secure, tamper-proof ownership verification
   */
  const verifyBucketOwnership = useCallback(
    async (bucketId: string): Promise<{ isOwner: boolean; reason?: string }> => {
      if (!isInitialized) {
        return { isOwner: false, reason: 'Not initialized' };
      }

      if (!address) {
        return { isOwner: false, reason: 'Wallet not connected' };
      }

      try {
        const { verifyBucketOwnership: verifyOwnership } = await import('@/lib/datahaven/client');
        return await verifyOwnership(bucketId, address);
      } catch (err) {
        console.error('Failed to verify bucket ownership:', err);
        return { 
          isOwner: false, 
          reason: err instanceof Error ? err.message : 'Verification failed' 
        };
      }
    },
    [isInitialized, address]
  );

  /**
   * Update commitment status
   * 
   * Creates a new status update record in DataHaven.
   * The original commitment is preserved; status updates are stored as separate files.
   * 
   * Note: Includes on-chain ownership verification before write operation.
   */
  const updateCommitmentStatus = useCallback(
    async (
      bucketId: string,
      commitment: Commitment,
      newStatus: CommitmentStatus,
      reason: string
    ): Promise<StatusUpdateResult> => {
      if (!address || !isInitialized) {
        setError(new Error('Not initialized'));
        return { success: false };
      }

      setIsLoading(true);
      setError(null);

      try {
        const { 
          uploadJsonFile, 
          isAuthenticated: checkAuth,
          verifyBucketOwnership: verifyOwnership,
        } = await import('@/lib/datahaven/client');

        // On-chain ownership verification before write operation
        const ownershipCheck = await verifyOwnership(bucketId, address);
        if (!ownershipCheck.isOwner) {
          console.warn('On-chain ownership verification failed:', ownershipCheck.reason);
          setError(new Error(`Access denied: ${ownershipCheck.reason || 'You are not the owner of this bucket'}`));
          setIsLoading(false);
          return { success: false };
        }
        console.log('✅ On-chain ownership verified');

        // Check SDK-level session state
        if (!checkAuth()) {
          const authSuccess = await authenticate();
          if (!authSuccess) {
            setIsLoading(false);
            return { success: false };
          }
        }

        const now = Date.now();

        // Create updated commitment with new status (without txHash initially)
        const updatedCommitment: Commitment = {
          ...commitment,
          status: newStatus,
          statusReason: reason || undefined,
          statusUpdatedAt: now,
          statusUpdatedBy: address,
          updatedAt: now,
          // Keep track of previous status for history
          previousStatus: commitment.status,
          previousFileKey: commitment.fileKey,
        };

        // First upload to get txHash and fileKey
        const firstResult = await uploadJsonFile(
          bucketId,
          `commitments/${commitment.id}.json`,
          updatedCommitment,
          'commitment',
          address
        );

        console.log('📋 First upload TX Hash:', firstResult.txHash);
        console.log('🔑 First upload File Key:', firstResult.fileKey);

        // Second upload: Include txHash and fileKey in the commitment data
        // This ensures the txHash is permanently stored in the commitment
        const commitmentWithTxHash: Commitment = {
          ...updatedCommitment,
          txHash: firstResult.txHash,
          fileKey: firstResult.fileKey,
          blockNumber: firstResult.blockNumber,
        };

        const finalResult = await uploadJsonFile(
          bucketId,
          `commitments/${commitment.id}.json`,
          commitmentWithTxHash,
          'commitment',
          address
        );

        console.log('✅ Commitment status updated with txHash');
        console.log('📋 Final TX Hash:', finalResult.txHash);
        console.log('🔑 Final File Key:', finalResult.fileKey);

        return {
          success: true,
          fileKey: finalResult.fileKey,
          txHash: finalResult.txHash,
          blockNumber: finalResult.blockNumber,
        };
      } catch (err) {
        console.error('Failed to update commitment status:', err);
        setError(err instanceof Error ? err : new Error('Status update failed'));
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [address, isInitialized, authenticate]
  );

  // Auto-initialize read-only when WASM is ready (no wallet needed)
  useEffect(() => {
    if (wasmInitialized && !isReadOnlyReady && !isLoading) {
      initReadOnly();
    }
  }, [wasmInitialized, isReadOnlyReady, isLoading, initReadOnly]);

  // Auto-initialize full mode when wallet connects
  useEffect(() => {
    if (isConnected && wasmInitialized && !isInitialized && !isLoading) {
      initialize();
    }
  }, [isConnected, wasmInitialized, isInitialized, isLoading, initialize]);

  // Cleanup on disconnect (keep read-only mode active)
  useEffect(() => {
    if (!isConnected) {
      setIsInitialized(false);
      setIsAuthenticated(false);
      setMspHealth(null);
    }
  }, [isConnected]);

  return {
    isInitialized,
    isReadOnlyReady,
    isAuthenticated,
    isLoading,
    error,
    mspHealth,
    initialize,
    authenticate,
    createBucket,
    getBucket,
    uploadFile,
    downloadFile,
    downloadFileVerified,
    verifyDataIntegrity,
    verifyFileStorage,
    estimateCost,
    getCostEstimateString,
    checkHealth,
    // Data retrieval from MSP
    listUserBuckets,
    listVaultWatchProjects,
    loadProject,
    loadCommitments,
    getBucketFiles,
    // Data retrieval with verification
    loadProjectWithVerification,
    loadCommitmentsWithVerification,
    // Ownership verification (on-chain)
    verifyBucketOwnership,
    // Commitment status update
    updateCommitmentStatus,
  };
};

export default useDataHaven;
