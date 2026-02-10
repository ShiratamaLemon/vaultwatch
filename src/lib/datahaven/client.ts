/**
 * DataHaven Client Module
 *
 * This module provides integration with DataHaven's StorageHub SDK
 * based on the official documentation.
 *
 * Key flows:
 * 1. initWasm() must be called before any SDK operations
 * 2. SIWE authentication for MSP operations
 * 3. Bucket creation: deriveBucketId → createBucket
 * 4. File upload: FileManager → issueStorageRequest → uploadFile
 * 5. File download: downloadFile → verify
 */

import { StorageHubClient, FileManager, ReplicationLevel, initWasm, type HttpClientConfig } from '@storagehub-sdk/core';
import {
  MspClient,
  type InfoResponse,
  type UserInfo,
  type DownloadResult,
  type Bucket,
  type FileTree,
  type FileListResponse,
} from '@storagehub-sdk/msp-client';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { types } from '@storagehub/types-bundle';
import '@storagehub/api-augment';
import { TypeRegistry } from '@polkadot/types';
import type { AccountId20, H256 } from '@polkadot/types/interfaces';
import type { WalletClient, PublicClient, Chain } from 'viem';
import { createPublicClient, http } from 'viem';

import type {
  DataHavenConfig,
  BucketInfo,
  FileUploadResult,
  MspHealthStatus,
  ValueProposition,
  StorageWrapper,
  VerificationResult,
  VerificationStatus,
  VerifiedDownloadResult,
} from './types';
import { DataHavenError, BucketCreationError, FileUploadError, VerificationError, VAULTWATCH_APP_ID } from './types';

// =============================================================================
// Configuration
// =============================================================================

export const NETWORKS = {
  devnet: {
    id: 181222,
    name: 'DataHaven Local Devnet',
    rpcUrl: 'http://127.0.0.1:9666',
    wsUrl: 'wss://127.0.0.1:9666',
    mspUrl: 'http://127.0.0.1:8080/',
    nativeCurrency: { name: 'StorageHub', symbol: 'SH', decimals: 18 },
  },
  testnet: {
    id: 55931,
    name: 'DataHaven Testnet',
    rpcUrl: 'https://services.datahaven-testnet.network/testnet',
    wsUrl: 'wss://services.datahaven-testnet.network/testnet',
    mspUrl: 'https://deo-dh-backend.testnet.datahaven-infra.network/',
    nativeCurrency: { name: 'Mock', symbol: 'MOCK', decimals: 18 },
  },
};

export const defaultConfig: DataHavenConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_DATAHAVEN_RPC_URL || NETWORKS.testnet.rpcUrl,
  wssUrl: process.env.NEXT_PUBLIC_DATAHAVEN_WSS_URL || NETWORKS.testnet.wsUrl,
  mspUrl: process.env.NEXT_PUBLIC_MSP_URL || NETWORKS.testnet.mspUrl,
  chainId: Number(process.env.NEXT_PUBLIC_DATAHAVEN_CHAIN_ID) || NETWORKS.testnet.id,
};

// Filesystem precompile contract address
const FILESYSTEM_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000404' as `0x${string}`;

// =============================================================================
// Client State
// =============================================================================

let wasmInitialized = false;
let sessionToken: string | undefined = undefined;
let mspClientInstance: MspClient | null = null;
let polkadotApiInstance: ApiPromise | null = null;
let storageHubClientInstance: StorageHubClient | null = null;
let publicClientInstance: PublicClient | null = null;
let currentAddress: string | undefined = undefined;
let readOnlyInitialized = false;

// =============================================================================
// WASM Initialization (REQUIRED before any SDK operations)
// =============================================================================

/**
 * Initialize WASM - MUST be called before any StorageHub SDK operations
 */
export const initializeWasm = async (): Promise<void> => {
  if (wasmInitialized) {
    return;
  }

  try {
    await initWasm();
    wasmInitialized = true;
    console.log('DataHaven WASM initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WASM:', error);
    throw new DataHavenError('WASM initialization failed', 'WASM_INIT_FAILED', error);
  }
};

/**
 * Check if WASM is initialized
 */
export const isWasmInitialized = (): boolean => wasmInitialized;

// =============================================================================
// Client Initialization
// =============================================================================

/**
 * Session provider for MSP client authentication
 */
const sessionProvider = async () =>
  sessionToken && currentAddress
    ? ({ token: sessionToken, user: { address: currentAddress } } as const)
    : undefined;

/**
 * Initialize Polkadot API for Substrate interactions
 */
export const initPolkadotApi = async (): Promise<ApiPromise> => {
  if (polkadotApiInstance) {
    return polkadotApiInstance;
  }

  try {
    const provider = new WsProvider(defaultConfig.wssUrl);
    polkadotApiInstance = await ApiPromise.create({
      provider,
      typesBundle: types,
      noInitWarn: true,
    });
    console.log('Polkadot API initialized');
    return polkadotApiInstance;
  } catch (error) {
    console.error('Failed to initialize Polkadot API:', error);
    throw new DataHavenError('Polkadot API initialization failed', 'API_INIT_FAILED', error);
  }
};

/**
 * Initialize public client for reading chain data
 */
export const initPublicClient = (chain: Chain): PublicClient => {
  if (publicClientInstance) {
    return publicClientInstance;
  }

  publicClientInstance = createPublicClient({
    chain,
    transport: http(defaultConfig.rpcUrl),
  });

  return publicClientInstance;
};

/**
 * Initialize StorageHub client for on-chain operations
 */
export const initStorageHubClient = (
  chain: Chain,
  walletClient: WalletClient
): StorageHubClient => {
  if (storageHubClientInstance) {
    return storageHubClientInstance;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storageHubClientInstance = new StorageHubClient({
    rpcUrl: defaultConfig.rpcUrl,
    chain,
    walletClient: walletClient as any,
    filesystemContractAddress: FILESYSTEM_CONTRACT_ADDRESS,
  });

  console.log('StorageHub client initialized');
  return storageHubClientInstance;
};

/**
 * Initialize MSP client for off-chain storage operations
 */
export const initMspClient = async (address?: string): Promise<MspClient> => {
  if (mspClientInstance && (!address || currentAddress === address)) {
    return mspClientInstance;
  }

  try {
    if (address) currentAddress = address;
    const httpCfg: HttpClientConfig = { baseUrl: defaultConfig.mspUrl };
    mspClientInstance = await MspClient.connect(httpCfg, sessionProvider);
    console.log('MSP client initialized');
    return mspClientInstance;
  } catch (error) {
    console.error('Failed to initialize MSP client:', error);
    throw new DataHavenError('MSP client initialization failed', 'MSP_INIT_FAILED', error);
  }
};

// =============================================================================
// MSP Info & Health
// =============================================================================

/**
 * Get MSP info including ID and multiaddresses
 */
export const getMspInfo = async (): Promise<InfoResponse> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }
  const info = await mspClientInstance.info.getInfo();
  console.log(`MSP ID: ${info.mspId}`);
  return info;
};

/**
 * Check MSP health status
 */
export const checkMspHealth = async (): Promise<MspHealthStatus> => {
  if (!mspClientInstance) {
    return { isHealthy: false, storage: false, database: false, rpc: false };
  }

  try {
    const health = await mspClientInstance.info.getHealth();
    console.log('MSP Health Status:', health);

    // Type guard for health response
    const healthData = health as {
      storage?: boolean;
      database?: boolean;
      rpc?: boolean;
      components?: {
        storage?: { status: string };
        postgres?: { status: string };
        rpc?: { status: string };
      };
    };

    // Handle different response formats
    const storageOk = healthData.storage ?? healthData.components?.storage?.status === 'healthy';
    const databaseOk = healthData.database ?? healthData.components?.postgres?.status === 'healthy';
    const rpcOk = healthData.rpc ?? healthData.components?.rpc?.status === 'healthy';

    return {
      isHealthy: Boolean(storageOk && databaseOk && rpcOk),
      storage: Boolean(storageOk),
      database: Boolean(databaseOk),
      rpc: Boolean(rpcOk),
    };
  } catch (error) {
    console.error('Failed to check MSP health:', error);
    return { isHealthy: false, storage: false, database: false, rpc: false };
  }
};

/**
 * Get available value propositions (pricing plans) from MSP
 */
export const getValuePropositions = async (): Promise<ValueProposition[]> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  try {
    const valueProps = await mspClientInstance.info.getValuePropositions();
    if (!Array.isArray(valueProps) || valueProps.length === 0) {
      throw new Error('No value propositions available from MSP');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return valueProps.map((vp: any) => ({
      id: vp.id,
      name: vp.name || 'Default Plan',
      pricePerGbPerBlock: vp.pricePerGbPerBlock?.toString() || '0',
      maxFileSize: vp.maxFileSize || 5 * 1024 * 1024, // 5MB default
    }));
  } catch (error) {
    console.error('Failed to get value propositions:', error);
    throw new DataHavenError('Failed to get value propositions', 'VALUE_PROPS_FAILED', error);
  }
};

// =============================================================================
// Cost Estimation
// =============================================================================

/**
 * Storage cost estimation parameters
 */
export interface StorageCostEstimate {
  /** Total cost in smallest unit */
  totalCost: bigint;
  /** Cost formatted as string with decimals */
  totalCostFormatted: string;
  /** Price per GB per block */
  pricePerGbPerBlock: bigint;
  /** File size in GB */
  fileSizeGb: number;
  /** Number of replicas */
  replicas: number;
  /** Duration in blocks */
  durationBlocks: number;
  /** Estimated duration in days */
  durationDays: number;
}

/**
 * Estimate storage cost based on FAQ formula:
 * cost = pricePerGbPerBlock × (GB stored) × (number of replicas) × (number of blocks)
 *
 * @param fileSizeBytes - File size in bytes
 * @param replicas - Number of replicas (default: 1)
 * @param durationDays - Storage duration in days (default: 30)
 * @param valuePropId - Optional specific value proposition ID
 */
export const estimateStorageCost = async (
  fileSizeBytes: number,
  replicas: number = 1,
  durationDays: number = 30,
  valuePropId?: string
): Promise<StorageCostEstimate> => {
  // Get value propositions
  const valueProps = await getValuePropositions();
  
  // Find the specified value prop or use the first one
  const valueProp = valuePropId
    ? valueProps.find((vp) => vp.id === valuePropId) || valueProps[0]
    : valueProps[0];

  if (!valueProp) {
    throw new DataHavenError('No value propositions available', 'NO_VALUE_PROPS');
  }

  // Parse price (assuming it's in smallest unit)
  const pricePerGbPerBlock = BigInt(valueProp.pricePerGbPerBlock || '0');

  // Convert file size to GB
  const fileSizeGb = fileSizeBytes / (1024 * 1024 * 1024);

  // Calculate blocks (assuming 6-second block time)
  // ~14,400 blocks per day, ~432,000 blocks per month
  const blocksPerDay = 14400;
  const durationBlocks = durationDays * blocksPerDay;

  // Calculate total cost
  // cost = pricePerGbPerBlock × (GB stored) × (replicas) × (blocks)
  // We need to handle decimals carefully, so multiply first then divide
  const fileSizeScaled = BigInt(Math.ceil(fileSizeBytes)); // Keep in bytes for precision
  const bytesPerGb = BigInt(1024 * 1024 * 1024);
  
  const totalCost = (pricePerGbPerBlock * fileSizeScaled * BigInt(replicas) * BigInt(durationBlocks)) / bytesPerGb;

  // Format cost (assuming 18 decimals like MOCK/HAVE token)
  const decimals = 18;
  const totalCostStr = totalCost.toString().padStart(decimals + 1, '0');
  const integerPart = totalCostStr.slice(0, -decimals) || '0';
  const decimalPart = totalCostStr.slice(-decimals).slice(0, 6); // Show 6 decimal places
  const totalCostFormatted = `${integerPart}.${decimalPart}`;

  return {
    totalCost,
    totalCostFormatted,
    pricePerGbPerBlock,
    fileSizeGb,
    replicas,
    durationBlocks,
    durationDays,
  };
};

/**
 * Get human-readable cost estimate string
 */
export const getStorageCostEstimateString = async (
  fileSizeBytes: number,
  replicas: number = 1,
  durationDays: number = 30
): Promise<string> => {
  try {
    const estimate = await estimateStorageCost(fileSizeBytes, replicas, durationDays);
    const tokenSymbol = defaultConfig.chainId === 55931 ? 'MOCK' : 'HAVE';
    return `~${estimate.totalCostFormatted} ${tokenSymbol} for ${durationDays} days`;
  } catch {
    return 'Unable to estimate cost';
  }
};

// =============================================================================
// Read-Only Initialization (no wallet required)
// =============================================================================

/**
 * Initialize clients for read-only operations (no wallet required).
 * Sets up PolkadotApi + PublicClient + MspClient without authentication.
 */
export const initializeReadOnly = async (chain: Chain): Promise<void> => {
  if (readOnlyInitialized) return;

  try {
    await initPolkadotApi();
    initPublicClient(chain);
    await initMspClient();
    readOnlyInitialized = true;
    console.log('DataHaven read-only clients initialized');
  } catch (error) {
    console.error('Failed to initialize read-only clients:', error);
    throw new DataHavenError('Read-only initialization failed', 'READONLY_INIT_FAILED', error);
  }
};

/**
 * Check if read-only clients are initialized
 */
export const isReadOnlyInitialized = (): boolean => readOnlyInitialized;

// =============================================================================
// SIWE Authentication
// =============================================================================

/**
 * Authenticate user with SIWE (Sign-In with Ethereum)
 * Required before file uploads
 */
export const authenticateWithSIWE = async (
  walletClient: WalletClient,
  domain?: string,
  uri?: string
): Promise<{ token: string; profile: UserInfo }> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  try {
    console.log('Authenticating user with MSP via SIWE...');

    // In development, domain and uri can be arbitrary placeholders
    // In production, they must match your actual frontend origin
    const authDomain = domain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    const authUri = uri || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const siweSession = await mspClientInstance.auth.SIWE(
      walletClient as any,
      authDomain,
      authUri
    );

    sessionToken = (siweSession as { token: string }).token;
    console.log('SIWE authentication successful');

    const profile: UserInfo = await mspClientInstance.auth.getProfile();
    console.log('Authenticated user profile:', profile);

    return { token: sessionToken, profile };
  } catch (error) {
    console.error('SIWE authentication failed:', error);
    throw new DataHavenError('Authentication failed', 'AUTH_FAILED', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!sessionToken;
};

// =============================================================================
// Bucket Operations
// =============================================================================

/**
 * Derive deterministic bucket ID from address and name
 */
export const deriveBucketId = async (
  ownerAddress: string,
  bucketName: string
): Promise<string> => {
  if (!storageHubClientInstance) {
    throw new DataHavenError('StorageHub client not initialized', 'NOT_INITIALIZED');
  }

  const bucketId = await storageHubClientInstance.deriveBucketId(
    ownerAddress as `0x${string}`,
    bucketName
  );
  console.log(`Derived bucket ID: ${bucketId}`);
  return bucketId as string;
};

/**
 * Create a new bucket on DataHaven
 */
export const createBucket = async (
  bucketName: string,
  ownerAddress: string,
  isPrivate: boolean = false
): Promise<{ bucketId: string; txHash: string; blockNumber?: number }> => {
  if (!storageHubClientInstance || !publicClientInstance || !polkadotApiInstance) {
    throw new DataHavenError('Clients not initialized', 'NOT_INITIALIZED');
  }

  try {
    // Get MSP info
    const { mspId } = await getMspInfo();

    // Get value proposition
    const valueProps = await getValuePropositions();
    const valuePropId = valueProps[0].id as `0x${string}`;

    // Derive bucket ID
    const bucketId = await deriveBucketId(ownerAddress, bucketName);

    // Check that bucket doesn't exist yet
    const bucketBeforeCreation = await polkadotApiInstance.query.providers.buckets(bucketId);
    if (!bucketBeforeCreation.isEmpty) {
      console.log('Bucket already exists, returning existing bucket ID');
      return { bucketId, txHash: '' };
    }

    // Create bucket on chain
    const txHash = await storageHubClientInstance.createBucket(
      mspId as `0x${string}`,
      bucketName,
      isPrivate,
      valuePropId
    );

    console.log('createBucket() txHash:', txHash);
    if (!txHash) {
      throw new Error('createBucket() did not return a transaction hash');
    }

    // Wait for transaction receipt
    const txReceipt = await publicClientInstance.waitForTransactionReceipt({
      hash: txHash,
    });

    if (txReceipt.status !== 'success') {
      throw new Error(`Bucket creation failed: ${txHash}`);
    }

    // Extract block number for Substrate explorer links
    const blockNumber = txReceipt.blockNumber ? Number(txReceipt.blockNumber) : undefined;

    console.log(`Bucket created successfully: ${bucketId} at block ${blockNumber}`);
    return { bucketId, txHash, blockNumber };
  } catch (error) {
    console.error('Failed to create bucket:', error);
    throw new BucketCreationError('Failed to create bucket', error);
  }
};

/**
 * Verify bucket creation on chain
 */
export const verifyBucketCreation = async (bucketId: string): Promise<BucketInfo | null> => {
  if (!polkadotApiInstance) {
    throw new DataHavenError('Polkadot API not initialized', 'NOT_INITIALIZED');
  }

  try {
    const bucket = await polkadotApiInstance.query.providers.buckets(bucketId);
    if (bucket.isEmpty) {
      return null;
    }

    const bucketData = bucket.unwrap().toHuman() as {
      root: string;
      userId: string;
      mspId: string;
      private: boolean;
      size_: string;
      valuePropId: string;
    };

    return {
      bucketId,
      name: '',
      ownerAddress: bucketData.userId,
      root: bucketData.root,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to verify bucket:', error);
    return null;
  }
};

/**
 * Verify bucket ownership on-chain
 * This provides a secure, tamper-proof ownership check
 * 
 * @param bucketId - The bucket ID to verify
 * @param address - The address to check ownership for
 * @returns Object with isOwner boolean and optional error reason
 */
export const verifyBucketOwnership = async (
  bucketId: string,
  address: string
): Promise<{ isOwner: boolean; reason?: string }> => {
  if (!polkadotApiInstance) {
    return { isOwner: false, reason: 'Polkadot API not initialized' };
  }

  if (!address) {
    return { isOwner: false, reason: 'Address not provided' };
  }

  try {
    const bucket = await polkadotApiInstance.query.providers.buckets(bucketId);
    
    if (bucket.isEmpty) {
      return { isOwner: false, reason: 'Bucket not found on chain' };
    }

    const bucketData = bucket.unwrap().toHuman() as {
      root: string;
      userId: string;
      mspId: string;
      private: boolean;
      size_: string;
      valuePropId: string;
    };

    // Compare addresses (case-insensitive)
    const onChainOwner = bucketData.userId.toLowerCase();
    const checkAddress = address.toLowerCase();
    const isOwner = onChainOwner === checkAddress;

    if (!isOwner) {
      return { 
        isOwner: false, 
        reason: `On-chain owner (${bucketData.userId.slice(0, 10)}...) does not match your address` 
      };
    }

    return { isOwner: true };
  } catch (error) {
    console.error('Failed to verify bucket ownership:', error);
    return { 
      isOwner: false, 
      reason: error instanceof Error ? error.message : 'Unknown verification error' 
    };
  }
};

/**
 * Wait for backend to have bucket ready
 */
export const waitForBackendBucketReady = async (
  bucketId: string,
  maxAttempts: number = 10,
  delayMs: number = 2000
): Promise<void> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Checking for bucket in MSP backend, attempt ${i + 1} of ${maxAttempts}...`);

    try {
      const bucket = await mspClientInstance.buckets.getBucket(bucketId);
      if (bucket) {
        console.log('Bucket found in MSP backend:', bucket);
        return;
      }
    } catch (error: unknown) {
      const err = error as { status?: number; body?: { error?: string } };
      if (err.status === 404 || err.body?.error === 'Not found: Record') {
        console.log('Bucket not found in MSP backend yet (404).');
      } else {
        console.error('Unexpected error while fetching bucket from MSP:', error);
        throw error;
      }
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new DataHavenError(
    `Bucket ${bucketId} not found in MSP backend after waiting`,
    'BUCKET_NOT_READY'
  );
};

/**
 * Get bucket info from MSP
 */
export const getBucket = async (bucketId: string): Promise<BucketInfo | null> => {
  if (!mspClientInstance) {
    return null;
  }

  try {
    const bucket = await mspClientInstance.buckets.getBucket(bucketId);
    if (!bucket) return null;

    return {
      bucketId: bucket.bucketId,
      name: bucket.name,
      ownerAddress: '',
      root: bucket.root,
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
};

// =============================================================================
// File Operations
// =============================================================================

/**
 * Extract peer IDs from multiaddresses
 */
const extractPeerIDs = (multiaddresses: string[]): string[] => {
  return (multiaddresses ?? [])
    .map((addr) => addr.split('/p2p/').pop())
    .filter((id): id is string => !!id);
};

/**
 * Upload a JSON file to DataHaven
 */
export const uploadJsonFile = async <T>(
  bucketId: string,
  fileName: string,
  data: T,
  type: 'project' | 'commitment' | 'index',
  ownerAddress: string
): Promise<FileUploadResult> => {
  if (!storageHubClientInstance || !mspClientInstance || !publicClientInstance) {
    throw new DataHavenError('Clients not initialized', 'NOT_INITIALIZED');
  }

  try {
    // Wrap data in storage format
    const wrapper: StorageWrapper<T> = {
      version: '1.0',
      app: VAULTWATCH_APP_ID,
      type,
      data,
      timestamp: Date.now(),
    };

    const jsonString = JSON.stringify(wrapper, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const fileSize = blob.size;

    // Create FileManager
    const fileManager = new FileManager({
      size: fileSize,
      stream: () => blob.stream() as ReadableStream<Uint8Array>,
    });

    // Get file fingerprint
    const fingerprint = await fileManager.getFingerprint();
    console.log(`Fingerprint: ${fingerprint.toHex()}`);

    // Get MSP details
    const { mspId, multiaddresses } = await getMspInfo();
    if (!multiaddresses?.length) {
      throw new Error('MSP multiaddresses are missing');
    }

    const peerIds = extractPeerIDs(multiaddresses);
    if (peerIds.length === 0) {
      throw new Error('MSP multiaddresses had no /p2p/<peerId> segment');
    }

    // Issue storage request
    const txHash = await storageHubClientInstance.issueStorageRequest(
      bucketId as `0x${string}`,
      fileName,
      fingerprint.toHex() as `0x${string}`,
      BigInt(fileSize),
      mspId as `0x${string}`,
      peerIds,
      ReplicationLevel.Custom,
      1 // replicas
    );

    console.log('issueStorageRequest() txHash:', txHash);
    if (!txHash) {
      throw new Error('issueStorageRequest() did not return a transaction hash');
    }

    // Wait for transaction receipt
    const receipt = await publicClientInstance.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status !== 'success') {
      throw new Error(`Storage request failed: ${txHash}`);
    }

    // Extract block number for Substrate explorer links
    const blockNumber = receipt.blockNumber ? Number(receipt.blockNumber) : undefined;
    console.log(`Storage request confirmed at block ${blockNumber}`);

    // Compute file key
    const registry = new TypeRegistry();
    const owner = registry.createType('AccountId20', ownerAddress) as AccountId20;
    const bucketIdH256 = registry.createType('H256', bucketId) as H256;
    const fileKey = await fileManager.computeFileKey(owner, bucketIdH256, fileName);

    console.log(`File key: ${fileKey.toHex()}`);

    // Upload file to MSP
    const uploadReceipt = await mspClientInstance.files.uploadFile(
      bucketId,
      fileKey.toHex(),
      await fileManager.getFileBlob(),
      ownerAddress,
      fileName
    );

    console.log('File upload receipt:', uploadReceipt);

    if (uploadReceipt.status !== 'upload_successful') {
      throw new Error('File upload to MSP failed');
    }

    return {
      fileKey: fileKey.toHex(),
      merkleRoot: uploadReceipt.fingerprint,
      txHash,
      blockNumber,
      size: fileSize,
    };
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw new FileUploadError('Failed to upload file', error);
  }
};

/**
 * Wait for MSP to confirm storage request on-chain
 */
export const waitForMSPConfirmOnChain = async (
  fileKey: string,
  maxAttempts: number = 10,
  delayMs: number = 2000
): Promise<void> => {
  if (!polkadotApiInstance) {
    throw new DataHavenError('Polkadot API not initialized', 'NOT_INITIALIZED');
  }

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Check storage request confirmed by MSP, attempt ${i + 1} of ${maxAttempts}...`);

    const req = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);

    if (req.isNone) {
      throw new Error(`StorageRequest for ${fileKey} no longer exists on-chain.`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = req.unwrap() as any;
    const mspTuple = data.msp?.isSome ? data.msp.unwrap() : null;
    const mspConfirmed = mspTuple ? mspTuple[1]?.isTrue : false;

    if (mspConfirmed) {
      console.log('Storage request confirmed by MSP on-chain');
      return;
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new DataHavenError(
    `FileKey ${fileKey} not confirmed by MSP after waiting`,
    'MSP_CONFIRM_TIMEOUT'
  );
};

/**
 * File storage verification result
 */
export interface FileStorageVerification {
  /** Whether the file is securely stored */
  isSecure: boolean;
  /** MSP has confirmed the storage request */
  mspConfirmed: boolean;
  /** Storage request has been fulfilled (BSP replication complete) */
  storageRequestFulfilled: boolean;
  /** File key */
  fileKey: string;
  /** Bucket ID */
  bucketId?: string;
  /** Fingerprint/Merkle root */
  fingerprint?: string;
  /** Message describing the current status */
  message: string;
}

/**
 * Wait for StorageRequestFulfilled event on-chain
 * This confirms that the file has been propagated through the DataHaven network
 * and BSP replication is complete.
 *
 * According to FAQ:
 * "Confirm your file has been propagated through the DataHaven network by verifying
 * that your fileKey has generated a StorageRequestFulfilled event on-chain."
 */
export const waitForStorageRequestFulfilled = async (
  fileKey: string,
  maxAttempts: number = 30,
  delayMs: number = 3000
): Promise<FileStorageVerification> => {
  if (!polkadotApiInstance) {
    throw new DataHavenError('Polkadot API not initialized', 'NOT_INITIALIZED');
  }

  console.log(`Waiting for StorageRequestFulfilled event for fileKey: ${fileKey}`);

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Checking storage request fulfillment, attempt ${i + 1} of ${maxAttempts}...`);

    try {
      // Check if storage request still exists
      const req = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);

      if (req.isNone) {
        // Storage request no longer exists - this means it was fulfilled!
        // When a storage request is fulfilled, it's removed from the storageRequests storage
        console.log('✅ StorageRequestFulfilled: Storage request no longer exists (fulfilled)');
        
        return {
          isSecure: true,
          mspConfirmed: true,
          storageRequestFulfilled: true,
          fileKey,
          message: 'File is securely stored in the DataHaven network. Storage request has been fulfilled.',
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = req.unwrap() as any;
      
      // Check MSP confirmation status
      const mspTuple = data.msp?.isSome ? data.msp.unwrap() : null;
      const mspConfirmed = mspTuple ? Boolean(mspTuple[1]?.isTrue) : false;

      // Check BSP confirmation status
      const bspsRequired = parseInt(data.bspsRequired?.toString() || '0');
      const bspsConfirmed = parseInt(data.bspsConfirmed?.toString() || '0');
      
      console.log(`MSP confirmed: ${mspConfirmed}, BSPs: ${bspsConfirmed}/${bspsRequired}`);

      // If all BSPs have confirmed, the request will be fulfilled soon
      if (bspsRequired > 0 && bspsConfirmed >= bspsRequired) {
        console.log('All BSPs confirmed, waiting for fulfillment...');
      }

    } catch (error) {
      console.error('Error checking storage request:', error);
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  // Timeout - return partial verification status
  console.warn('StorageRequestFulfilled timeout - checking final status');

  const req = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);
  
  if (req.isNone) {
    return {
      isSecure: true,
      mspConfirmed: true,
      storageRequestFulfilled: true,
      fileKey,
      message: 'File is securely stored in the DataHaven network.',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = req.unwrap() as any;
  const mspTuple = data.msp?.isSome ? data.msp.unwrap() : null;
  const mspConfirmed = mspTuple ? Boolean(mspTuple[1]?.isTrue) : false;

  return {
    isSecure: false,
    mspConfirmed,
    storageRequestFulfilled: false,
    fileKey,
    bucketId: data.bucketId?.toString(),
    fingerprint: data.fingerprint?.toString(),
    message: mspConfirmed
      ? 'File uploaded to MSP but network propagation is still in progress. Check back later.'
      : 'File upload in progress. MSP has not yet confirmed the storage request.',
  };
};

/**
 * Verify file storage status
 * Combines MSP confirmation and StorageRequestFulfilled checks
 */
export const verifyFileStorage = async (
  fileKey: string,
  bucketId?: string
): Promise<FileStorageVerification> => {
  if (!polkadotApiInstance) {
    throw new DataHavenError('Polkadot API not initialized', 'NOT_INITIALIZED');
  }

  try {
    const req = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);

    if (req.isNone) {
      // Storage request fulfilled - file is secure
      return {
        isSecure: true,
        mspConfirmed: true,
        storageRequestFulfilled: true,
        fileKey,
        bucketId,
        message: 'File is securely stored in the DataHaven network.',
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = req.unwrap() as any;
    const mspTuple = data.msp?.isSome ? data.msp.unwrap() : null;
    const mspConfirmed = mspTuple ? Boolean(mspTuple[1]?.isTrue) : false;
    const bspsRequired = parseInt(data.bspsRequired?.toString() || '0');
    const bspsConfirmed = parseInt(data.bspsConfirmed?.toString() || '0');

    return {
      isSecure: false,
      mspConfirmed,
      storageRequestFulfilled: false,
      fileKey,
      bucketId: data.bucketId?.toString(),
      fingerprint: data.fingerprint?.toString(),
      message: mspConfirmed
        ? `File uploaded to MSP. BSP replication: ${bspsConfirmed}/${bspsRequired}`
        : 'File upload in progress. Waiting for MSP confirmation.',
    };
  } catch (error) {
    console.error('Error verifying file storage:', error);
    return {
      isSecure: false,
      mspConfirmed: false,
      storageRequestFulfilled: false,
      fileKey,
      bucketId,
      message: 'Unable to verify file storage status.',
    };
  }
};

/**
 * Wait for backend to have file ready
 */
export const waitForBackendFileReady = async (
  bucketId: string,
  fileKey: string,
  maxAttempts: number = 15,
  delayMs: number = 2000
): Promise<void> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Checking for file in MSP backend, attempt ${i + 1} of ${maxAttempts}...`);

    try {
      const fileInfo = await mspClientInstance.files.getFileInfo(bucketId, fileKey);

      if (fileInfo.status === 'ready') {
        console.log('File found in MSP backend:', fileInfo);
        return;
      }

      if (fileInfo.status === 'revoked') {
        throw new Error('File upload was cancelled by user');
      } else if (fileInfo.status === 'rejected') {
        throw new Error('File upload was rejected by MSP');
      } else if (fileInfo.status === 'expired') {
        throw new Error('File upload request expired before MSP processed it');
      }

      console.log(`File status is "${fileInfo.status}", waiting...`);
    } catch (error: unknown) {
      const err = error as { status?: number; body?: { error?: string } };
      if (err.status === 404 || err.body?.error === 'Not found: Record') {
        console.log('File not yet indexed in MSP backend (404). Waiting...');
      } else {
        throw error;
      }
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new DataHavenError('Timed out waiting for MSP backend to mark file as ready', 'FILE_NOT_READY');
};

/**
 * Download options for JSON file
 */
export interface DownloadOptions {
  /** Whether to verify data integrity (default: true in production) */
  verify?: boolean;
  /** Expected fingerprint from upload result (for verification) */
  expectedFingerprint?: string;
  /** Whether to throw an error on verification failure (default: false) */
  throwOnVerificationFailure?: boolean;
}

/**
 * Download a JSON file from DataHaven with optional integrity verification
 * 
 * @param fileKey - The file key to download
 * @param options - Download options including verification settings
 * @returns Downloaded data with verification status
 */
export const downloadJsonFile = async <T>(
  fileKey: string,
  options: DownloadOptions = {}
): Promise<VerifiedDownloadResult<T>> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  const {
    verify = true,
    expectedFingerprint,
    throwOnVerificationFailure = false,
  } = options;

  try {
    const downloadResponse: DownloadResult = await mspClientInstance.files.downloadFile(fileKey);

    if (downloadResponse.status !== 200) {
      throw new Error(`Download failed with status: ${downloadResponse.status}`);
    }

    // Read stream into blob
    const reader = downloadResponse.stream.getReader();
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value as BlobPart);
    }

    const blob = new Blob(chunks);
    const text = await blob.text();
    const wrapper = JSON.parse(text) as StorageWrapper<T>;

    // Perform verification if requested
    let verification: VerifiedDownloadResult<T>['verification'];

    if (verify) {
      try {
        const verificationResult = await verifyDataIntegrity(
          fileKey,
          blob,
          expectedFingerprint
        );

        const status: VerificationStatus = verificationResult.verified 
          ? 'verified' 
          : 'failed';

        verification = {
          status,
          onChainFingerprint: verificationResult.onChainFingerprint,
          calculatedFingerprint: verificationResult.calculatedFingerprint,
          reason: verificationResult.reason,
          verifiedAt: Date.now(),
        };

        // Log verification result
        if (verificationResult.verified) {
          console.log(`✅ Data integrity verified for file: ${fileKey.slice(0, 16)}...`);
        } else {
          console.warn(`⚠️ Data integrity verification FAILED for file: ${fileKey.slice(0, 16)}...`);
          console.warn(`   Reason: ${verificationResult.reason}`);
          
          if (throwOnVerificationFailure) {
            throw new VerificationError(
              `Data integrity verification failed: ${verificationResult.reason}`
            );
          }
        }
      } catch (verifyError) {
        if (verifyError instanceof VerificationError) {
          throw verifyError;
        }
        
        console.warn('Verification process encountered an error:', verifyError);
        verification = {
          status: 'unavailable',
          reason: `Verification unavailable: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`,
          verifiedAt: Date.now(),
        };
      }
    } else {
      verification = {
        status: 'unverified',
        reason: 'Verification was skipped by request.',
        verifiedAt: Date.now(),
      };
    }

    return {
      data: wrapper.data,
      verification,
    };
  } catch (error) {
    if (error instanceof VerificationError) {
      throw error;
    }
    console.error('Failed to download file:', error);
    throw new DataHavenError('Failed to download file', 'DOWNLOAD_FAILED', error);
  }
};

/**
 * Download a JSON file without verification (for backward compatibility)
 * @deprecated Use downloadJsonFile with verify: false option instead
 */
export const downloadJsonFileUnsafe = async <T>(
  fileKey: string
): Promise<{ data: T; verified: boolean }> => {
  console.warn('downloadJsonFileUnsafe is deprecated. Use downloadJsonFile with options.');
  
  const result = await downloadJsonFile<T>(fileKey, { verify: false });
  
  return {
    data: result.data,
    verified: false,
  };
};

/**
 * Request file deletion
 */
export const requestDeleteFile = async (
  bucketId: string,
  fileKey: string
): Promise<boolean> => {
  if (!storageHubClientInstance || !mspClientInstance || !publicClientInstance) {
    throw new DataHavenError('Clients not initialized', 'NOT_INITIALIZED');
  }

  try {
    // Get file info
    const fileInfo = await mspClientInstance.files.getFileInfo(bucketId, fileKey);
    console.log('File info:', fileInfo);

    // Request file deletion
    const txHash = await storageHubClientInstance.requestDeleteFile(fileInfo);
    console.log('requestDeleteFile() txHash:', txHash);

    // Wait for transaction receipt
    const receipt = await publicClientInstance.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status !== 'success') {
      throw new Error(`File deletion failed: ${txHash}`);
    }

    console.log(`File ${fileKey} deletion requested successfully`);
    return true;
  } catch (error) {
    console.error('Failed to request file deletion:', error);
    throw new DataHavenError('Failed to delete file', 'DELETE_FAILED', error);
  }
};

/**
 * Delete a bucket (must be empty)
 */
export const deleteBucket = async (bucketId: string): Promise<boolean> => {
  if (!storageHubClientInstance || !publicClientInstance) {
    throw new DataHavenError('Clients not initialized', 'NOT_INITIALIZED');
  }

  try {
    const txHash = await storageHubClientInstance.deleteBucket(bucketId as `0x${string}`);
    console.log('deleteBucket() txHash:', txHash);

    if (!txHash) {
      throw new Error('deleteBucket() did not return a transaction hash');
    }

    const receipt = await publicClientInstance.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status !== 'success') {
      throw new Error(`Bucket deletion failed: ${txHash}`);
    }

    console.log(`Bucket ${bucketId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Failed to delete bucket:', error);
    throw new DataHavenError('Failed to delete bucket', 'DELETE_BUCKET_FAILED', error);
  }
};

// =============================================================================
// Data Verification
// =============================================================================

/**
 * Get the on-chain fingerprint for a file
 * The fingerprint is stored in the storageRequests pallet during upload
 */
export const getOnChainFingerprint = async (
  fileKey: string
): Promise<{ fingerprint: string | null; status: 'pending' | 'fulfilled' | 'not_found' }> => {
  if (!polkadotApiInstance) {
    throw new DataHavenError('Polkadot API not initialized', 'NOT_INITIALIZED');
  }

  try {
    const storageRequest = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);

    if (storageRequest.isNone) {
      // Storage request has been fulfilled (completed)
      // The fingerprint is no longer in storageRequests, it's been processed
      return { fingerprint: null, status: 'fulfilled' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = storageRequest.unwrap() as any;
    const fingerprint = data.fingerprint?.toString() || null;

    return { fingerprint, status: 'pending' };
  } catch (error) {
    console.error('Failed to get on-chain fingerprint:', error);
    return { fingerprint: null, status: 'not_found' };
  }
};

/**
 * Calculate fingerprint from raw data (same algorithm as upload)
 */
export const calculateFingerprint = async (data: Uint8Array | Blob): Promise<string> => {
  let blob: Blob;
  
  if (data instanceof Blob) {
    blob = data;
  } else {
    // Convert Uint8Array to ArrayBuffer explicitly for Blob constructor
    // Use slice to create a new ArrayBuffer (not SharedArrayBuffer)
    const buffer = new Uint8Array(data).buffer as ArrayBuffer;
    blob = new Blob([buffer]);
  }
  
  const fileManager = new FileManager({
    size: blob.size,
    stream: () => blob.stream() as ReadableStream<Uint8Array>,
  });

  const fingerprint = await fileManager.getFingerprint();
  return fingerprint.toHex();
};

/**
 * Verify data integrity by comparing calculated fingerprint with on-chain fingerprint
 * 
 * This function:
 * 1. Gets the on-chain fingerprint for the file
 * 2. Calculates the fingerprint of the provided data
 * 3. Compares them to detect any tampering
 * 
 * @param fileKey - The file key to verify
 * @param data - The downloaded data to verify (as Blob or Uint8Array)
 * @param expectedFingerprint - Optional: Expected fingerprint (if known from upload result)
 */
export const verifyDataIntegrity = async (
  fileKey: string,
  data: Uint8Array | Blob,
  expectedFingerprint?: string
): Promise<VerificationResult> => {
  if (!polkadotApiInstance) {
    return {
      verified: false,
      reason: 'Polkadot API not initialized. Cannot verify data integrity.',
    };
  }

  try {
    // Step 1: Calculate fingerprint of the downloaded data
    const calculatedFingerprint = await calculateFingerprint(data);
    console.log(`Calculated fingerprint: ${calculatedFingerprint}`);

    // Step 2: Get on-chain fingerprint
    const onChainResult = await getOnChainFingerprint(fileKey);
    
    // Step 3: Determine verification approach based on on-chain status
    if (onChainResult.status === 'pending') {
      // Storage request is still pending - we can verify against it
      const onChainFingerprint = onChainResult.fingerprint;
      
      if (!onChainFingerprint) {
        return {
          verified: false,
          calculatedFingerprint,
          reason: 'On-chain fingerprint not available in pending storage request.',
        };
      }

      const isMatch = calculatedFingerprint === onChainFingerprint;
      
      return {
        verified: isMatch,
        onChainFingerprint,
        calculatedFingerprint,
        reason: isMatch 
          ? 'Data integrity verified against on-chain fingerprint.'
          : 'INTEGRITY FAILURE: Downloaded data does not match on-chain fingerprint. Data may have been tampered with.',
      };
    } else if (onChainResult.status === 'fulfilled') {
      // Storage request has been fulfilled
      // Use expected fingerprint if provided (from upload result)
      if (expectedFingerprint) {
        const isMatch = calculatedFingerprint === expectedFingerprint;
        
        return {
          verified: isMatch,
          onChainFingerprint: expectedFingerprint,
          calculatedFingerprint,
          reason: isMatch
            ? 'Data integrity verified against expected fingerprint (storage request fulfilled).'
            : 'INTEGRITY FAILURE: Downloaded data does not match expected fingerprint. Data may have been tampered with.',
        };
      }

      // No expected fingerprint - we can only confirm the file exists
      // This is a less strict verification
      return {
        verified: true,
        calculatedFingerprint,
        reason: 'Storage request fulfilled. Data fingerprint calculated but no on-chain reference for comparison. Consider storing fingerprint for future verification.',
      };
    } else {
      // File not found on chain
      return {
        verified: false,
        calculatedFingerprint,
        reason: 'File not found on chain. Cannot verify data integrity.',
      };
    }
  } catch (error) {
    console.error('Data integrity verification failed:', error);
    return {
      verified: false,
      reason: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error,
    };
  }
};

/**
 * Legacy verify function for backward compatibility
 * @deprecated Use verifyDataIntegrity instead
 */
export const verifyData = async (
  bucketId: string,
  fileKey: string,
  expectedMerkleRoot: string
): Promise<{ verified: boolean; reason?: string }> => {
  console.warn('verifyData is deprecated. Use verifyDataIntegrity for proper Merkle verification.');
  
  if (!polkadotApiInstance) {
    return { verified: false, reason: 'Polkadot API not initialized' };
  }

  try {
    const bucketInfo = await polkadotApiInstance.query.providers.buckets(bucketId);
    if (bucketInfo.isEmpty) {
      return { verified: false, reason: 'Bucket not found on chain' };
    }

    const storageRequest = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);
    if (storageRequest.isNone) {
      return { verified: true, reason: 'Storage request fulfilled' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = storageRequest.unwrap() as any;
    const onChainFingerprint = data.fingerprint?.toString();
    
    if (onChainFingerprint && expectedMerkleRoot) {
      return {
        verified: onChainFingerprint === expectedMerkleRoot,
        reason: onChainFingerprint === expectedMerkleRoot 
          ? 'Fingerprint matches' 
          : 'Fingerprint mismatch',
      };
    }

    return { verified: true };
  } catch (error) {
    console.error('Verification failed:', error);
    return { verified: false, reason: 'Verification error' };
  }
};

// =============================================================================
// MSP Data Retrieval (Read Operations)
// =============================================================================

/**
 * List all buckets for the authenticated user
 * This retrieves data from MSP (off-chain storage)
 */
export const listUserBuckets = async (): Promise<Bucket[]> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  try {
    const buckets = await mspClientInstance.buckets.listBuckets();
    console.log(`Found ${buckets.length} buckets for user`);
    return buckets;
  } catch (error) {
    console.error('Failed to list buckets:', error);
    throw new DataHavenError('Failed to list user buckets', 'LIST_BUCKETS_FAILED', error);
  }
};

/**
 * List VaultWatch project buckets (filtered by naming convention)
 * VaultWatch buckets are named "vaultwatch-{uuid}"
 */
export const listVaultWatchBuckets = async (): Promise<Bucket[]> => {
  const allBuckets = await listUserBuckets();
  const vaultWatchBuckets = allBuckets.filter(bucket => 
    bucket.name.startsWith('vaultwatch-')
  );
  console.log(`Found ${vaultWatchBuckets.length} VaultWatch project buckets`);
  return vaultWatchBuckets;
};

/**
 * Get files in a bucket (from MSP)
 * @param bucketId - Bucket ID
 * @param path - Optional path within the bucket (e.g., "/commitments")
 */
export const getBucketFiles = async (
  bucketId: string,
  path?: string
): Promise<FileListResponse> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  try {
    const response = await mspClientInstance.buckets.getFiles(bucketId, { path });
    console.log(`Found ${response.files.length} items in bucket ${bucketId.slice(0, 10)}...`);
    return response;
  } catch (error) {
    console.error('Failed to get bucket files:', error);
    throw new DataHavenError('Failed to get bucket files', 'GET_FILES_FAILED', error);
  }
};

/**
 * Download and parse a JSON file from MSP
 * @param fileKey - The file key to download
 */
export const downloadAndParseJson = async <T>(fileKey: string): Promise<T> => {
  if (!mspClientInstance) {
    throw new DataHavenError('MSP client not initialized', 'NOT_INITIALIZED');
  }

  try {
    const downloadResponse: DownloadResult = await mspClientInstance.files.downloadFile(fileKey);
    
    // Read the stream into a string
    const chunks: Uint8Array[] = [];
    const reader = downloadResponse.stream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Convert Uint8Array chunks to Blob
    const blob = new Blob(chunks as unknown as BlobPart[]);
    const text = await blob.text();
    const data = JSON.parse(text) as T;
    
    return data;
  } catch (error) {
    console.error('Failed to download and parse JSON:', error);
    throw new DataHavenError('Failed to download file', 'DOWNLOAD_FAILED', error);
  }
};

/**
 * Find a file in a FileTree by name
 * Note: MSP may return root directory "/" without a type field
 */
export const findFileInTree = (
  files: FileTree[],
  fileName: string
): FileTree | null => {
  for (const item of files) {
    if (item.name === fileName && item.type === 'file') {
      return item;
    }
    // Check children if this is a folder OR if type is undefined (root directory case)
    // Use type assertion because MSP can return folders without proper type field
    if (item.type === 'folder') {
      const found = findFileInTree(item.children, fileName);
      if (found) return found;
    } else if ('children' in item && Array.isArray((item as { children?: FileTree[] }).children)) {
      // Handle root directory case where type might be missing
      const children = (item as { children: FileTree[] }).children;
      const found = findFileInTree(children, fileName);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Get all files from a folder in the FileTree
 * Note: MSP may return directories without a type field
 */
export const getFilesFromFolder = (
  files: FileTree[],
  folderName: string
): FileTree[] => {
  for (const item of files) {
    // Match folder by name
    if (item.type === 'folder' && item.name === folderName) {
      return item.children.filter((child): child is FileTree & { type: 'file' } => child.type === 'file');
    }
    // Handle root directory case where type might be missing
    if ('children' in item && item.name === folderName) {
      const children = (item as { children: FileTree[] }).children;
      return children.filter((child): child is FileTree & { type: 'file' } => child.type === 'file');
    }
    // Also search in children recursively
    if (item.type === 'folder') {
      const found = getFilesFromFolder(item.children, folderName);
      if (found.length > 0) return found;
    } else if ('children' in item && Array.isArray((item as { children?: FileTree[] }).children)) {
      const children = (item as { children: FileTree[] }).children;
      const found = getFilesFromFolder(children, folderName);
      if (found.length > 0) return found;
    }
  }
  return [];
};

/**
 * Load project metadata from a VaultWatch bucket
 * @param bucketId - The bucket ID
 */
export const loadProjectFromBucket = async <T>(bucketId: string): Promise<T | null> => {
  try {
    // Get files in the bucket root
    const fileList = await getBucketFiles(bucketId);
    
    // Find metadata.json
    const metadataFile = findFileInTree(fileList.files, 'metadata.json');
    if (!metadataFile || metadataFile.type !== 'file') {
      console.warn(`No metadata.json found in bucket ${bucketId.slice(0, 10)}...`);
      // Debug: list all file names found
      const allFileNames = fileList.files.map(f => `${f.name} (type: ${f.type})`);
      console.warn('Available files:', allFileNames);
      return null;
    }
    
    // Download and parse metadata
    const wrapper = await downloadAndParseJson<StorageWrapper<T>>(metadataFile.fileKey);
    return wrapper.data;
  } catch (error) {
    console.error(`Failed to load project from bucket ${bucketId}:`, error);
    return null;
  }
};

/**
 * Discover VaultWatch projects by scanning all on-chain buckets.
 * For each bucket, attempts to load metadata.json from MSP and checks
 * if it matches the VaultWatch format (app === "vaultwatch" or has VaultWatch-specific fields).
 *
 * @returns Array of discovered bucket IDs with their project metadata
 */
export const discoverVaultWatchBuckets = async <T>(): Promise<
  Array<{ bucketId: string; ownerAddress: string; project: T }>
> => {
  if (!polkadotApiInstance || !mspClientInstance) {
    throw new DataHavenError('Clients not initialized for discovery', 'NOT_INITIALIZED');
  }

  try {
    // Step 1: Enumerate all buckets from on-chain storage
    const allBuckets = await polkadotApiInstance.query.providers.buckets.entries();
    console.log(`Scanning ${allBuckets.length} on-chain buckets for VaultWatch projects...`);

    const results: Array<{ bucketId: string; ownerAddress: string; project: T }> = [];

    // Step 2: For each bucket, try to load metadata.json
    for (const [key, value] of allBuckets) {
      if (value.isEmpty) continue;

      const bucketId = key.args[0].toString();
      const bucketData = value.unwrap().toHuman() as {
        root: string;
        userId: string;
        mspId: string;
        private: boolean;
      };

      // Skip private buckets
      if (bucketData.private) continue;

      try {
        // Try to get files from MSP
        const fileList = await getBucketFiles(bucketId);
        const metadataFile = findFileInTree(fileList.files, 'metadata.json');
        if (!metadataFile || metadataFile.type !== 'file') continue;

        // Download and check format
        const wrapper = await downloadAndParseJson<StorageWrapper<T>>(metadataFile.fileKey);

        // Primary check: app identifier
        if (wrapper.app === VAULTWATCH_APP_ID && wrapper.type === 'project') {
          results.push({
            bucketId,
            ownerAddress: bucketData.userId,
            project: wrapper.data,
          });
          continue;
        }

        // Fallback: check for VaultWatch-specific data fields (legacy data without app field)
        if (
          wrapper.type === 'project' &&
          wrapper.version === '1.0' &&
          wrapper.data &&
          typeof wrapper.data === 'object' &&
          'ownerAddress' in wrapper.data &&
          'category' in wrapper.data &&
          'bucketId' in wrapper.data
        ) {
          results.push({
            bucketId,
            ownerAddress: bucketData.userId,
            project: wrapper.data,
          });
        }
      } catch {
        // Skip buckets that can't be read (not VaultWatch, MSP error, etc.)
        continue;
      }
    }

    console.log(`Discovered ${results.length} VaultWatch projects from ${allBuckets.length} on-chain buckets`);
    return results;
  } catch (error) {
    console.error('Failed to discover VaultWatch buckets:', error);
    throw new DataHavenError('Bucket discovery failed', 'DISCOVERY_FAILED', error);
  }
};

/**
 * Load all commitments from a VaultWatch bucket
 * @param bucketId - The bucket ID
 */
export const loadCommitmentsFromBucket = async <T>(bucketId: string): Promise<T[]> => {
  try {
    // Try to get files directly from the commitments folder path
    // MSP may not expand subfolders when listing from root
    let commitmentFiles: FileTree[] = [];
    
    try {
      const commitmentsFileList = await getBucketFiles(bucketId, '/commitments');
      
      // Extract files from the response
      commitmentFiles = commitmentsFileList.files.filter(f => f.type === 'file');
      
      // Also check inside root folder if present
      if (commitmentFiles.length === 0) {
        const rootFolder = commitmentsFileList.files.find(f => f.name === '/' || f.name === 'commitments');
        if (rootFolder && 'children' in rootFolder) {
          const children = (rootFolder as { children: FileTree[] }).children;
          commitmentFiles = children.filter((f): f is FileTree & { type: 'file' } => f.type === 'file');
        }
      }
    } catch (pathError) {
      console.log('Could not fetch commitments path directly, trying from root...');
      // Fallback: Get files from root and filter
      const fileList = await getBucketFiles(bucketId);
      commitmentFiles = getFilesFromFolder(fileList.files, 'commitments');
    }
    
    if (commitmentFiles.length === 0) {
      console.log(`No commitments found in bucket ${bucketId.slice(0, 10)}...`);
      return [];
    }
    
    // Filter to only file types with JSON extension
    const jsonFiles = commitmentFiles.filter(
      (f): f is FileTree & { type: 'file'; uploadedAt: Date; fileKey: `0x${string}` } =>
        f.type === 'file' && f.name.endsWith('.json')
    );
    
    // Deduplicate files by name, keeping only the latest version (by uploadedAt)
    const filesByName = new Map<string, typeof jsonFiles[number]>();
    for (const file of jsonFiles) {
      const existing = filesByName.get(file.name);
      if (!existing) {
        filesByName.set(file.name, file);
      } else {
        // Keep the newer file (compare uploadedAt timestamps)
        const existingTime = existing.uploadedAt ? new Date(existing.uploadedAt).getTime() : 0;
        const newTime = file.uploadedAt ? new Date(file.uploadedAt).getTime() : 0;
        if (newTime > existingTime) {
          filesByName.set(file.name, file);
        }
      }
    }
    
    const uniqueFiles = Array.from(filesByName.values());
    
    // Download and parse each commitment
    const commitments: T[] = [];
    for (const file of uniqueFiles) {
      try {
        const wrapper = await downloadAndParseJson<StorageWrapper<T>>(file.fileKey);
        commitments.push(wrapper.data);
      } catch (error) {
        console.warn(`Failed to load commitment ${file.name}:`, error);
      }
    }
    
    console.log(`Loaded ${commitments.length} commitments from bucket`);
    return commitments;
  } catch (error) {
    console.error(`Failed to load commitments from bucket ${bucketId}:`, error);
    return [];
  }
};

/**
 * Load project metadata from a VaultWatch bucket with verification
 * @param bucketId - The bucket ID
 * @returns Project data with verification result
 */
export const loadProjectFromBucketWithVerification = async <T>(
  bucketId: string
): Promise<{ data: T | null; verification: VerificationResult }> => {
  try {
    // Get files in the bucket root
    const fileList = await getBucketFiles(bucketId);
    
    // Find metadata.json
    const metadataFile = findFileInTree(fileList.files, 'metadata.json');
    if (!metadataFile || metadataFile.type !== 'file') {
      console.warn(`No metadata.json found in bucket ${bucketId.slice(0, 10)}...`);
      return {
        data: null,
        verification: {
          verified: false,
          reason: 'Metadata file not found',
        },
      };
    }
    
    // Download with verification
    // Note: downloadJsonFile already unwraps StorageWrapper and returns data directly
    const result = await downloadJsonFile<T>(
      metadataFile.fileKey,
      { verify: true }
    );
    
    return {
      data: result.data,
      verification: {
        verified: result.verification.status === 'verified',
        onChainFingerprint: result.verification.onChainFingerprint,
        calculatedFingerprint: result.verification.calculatedFingerprint,
        reason: result.verification.reason,
      },
    };
  } catch (error) {
    console.error(`Failed to load project from bucket ${bucketId}:`, error);
    return {
      data: null,
      verification: {
        verified: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        error,
      },
    };
  }
};

/**
 * Load all commitments from a VaultWatch bucket with verification
 * @param bucketId - The bucket ID
 * @returns Array of commitments with verification results
 */
export const loadCommitmentsFromBucketWithVerification = async <T>(
  bucketId: string
): Promise<Array<{ data: T; verification: VerificationResult; fileKey: string }>> => {
  try {
    // Try to get files directly from the commitments folder path
    let commitmentFiles: FileTree[] = [];
    
    try {
      const commitmentsFileList = await getBucketFiles(bucketId, '/commitments');
      commitmentFiles = commitmentsFileList.files.filter(f => f.type === 'file');
      
      if (commitmentFiles.length === 0) {
        const rootFolder = commitmentsFileList.files.find(f => f.name === '/' || f.name === 'commitments');
        if (rootFolder && 'children' in rootFolder) {
          const children = (rootFolder as { children: FileTree[] }).children;
          commitmentFiles = children.filter((f): f is FileTree & { type: 'file' } => f.type === 'file');
        }
      }
    } catch (pathError) {
      console.log('Could not fetch commitments path directly, trying from root...');
      const fileList = await getBucketFiles(bucketId);
      commitmentFiles = getFilesFromFolder(fileList.files, 'commitments');
    }
    
    if (commitmentFiles.length === 0) {
      console.log(`No commitments found in bucket ${bucketId.slice(0, 10)}...`);
      return [];
    }
    
    // Filter to only file types with JSON extension
    const jsonFiles = commitmentFiles.filter(
      (f): f is FileTree & { type: 'file'; uploadedAt: Date; fileKey: `0x${string}` } =>
        f.type === 'file' && f.name.endsWith('.json')
    );
    
    // Deduplicate files by name, keeping only the latest version
    const filesByName = new Map<string, typeof jsonFiles[number]>();
    for (const file of jsonFiles) {
      const existing = filesByName.get(file.name);
      if (!existing) {
        filesByName.set(file.name, file);
      } else {
        const existingTime = existing.uploadedAt ? new Date(existing.uploadedAt).getTime() : 0;
        const newTime = file.uploadedAt ? new Date(file.uploadedAt).getTime() : 0;
        if (newTime > existingTime) {
          filesByName.set(file.name, file);
        }
      }
    }
    
    const uniqueFiles = Array.from(filesByName.values());
    
    // Download and verify each commitment in parallel
    // Note: downloadJsonFile already unwraps StorageWrapper and returns data directly
    const results = await Promise.all(
      uniqueFiles.map(async (file) => {
        try {
          const result = await downloadJsonFile<T>(
            file.fileKey,
            { verify: true }
          );
          
          const verification: VerificationResult = {
            verified: result.verification.status === 'verified',
            onChainFingerprint: result.verification.onChainFingerprint,
            calculatedFingerprint: result.verification.calculatedFingerprint,
            reason: result.verification.reason,
          };
          
          return {
            data: result.data,
            verification,
            fileKey: file.fileKey,
          };
        } catch (error) {
          console.warn(`Failed to load commitment ${file.name}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed downloads
    const validResults: Array<{ data: T; verification: VerificationResult; fileKey: string }> = [];
    for (const r of results) {
      if (r !== null) {
        validResults.push(r);
      }
    }
    
    console.log(`Loaded ${validResults.length} commitments with verification from bucket`);
    return validResults;
  } catch (error) {
    console.error(`Failed to load commitments from bucket ${bucketId}:`, error);
    return [];
  }
};

// Re-export types for convenience
export type { Bucket, FileTree, FileListResponse };

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Cleanup function to disconnect clients
 */
export const cleanup = async (): Promise<void> => {
  if (polkadotApiInstance) {
    await polkadotApiInstance.disconnect();
    polkadotApiInstance = null;
  }

  mspClientInstance = null;
  storageHubClientInstance = null;
  publicClientInstance = null;
  sessionToken = undefined;
  currentAddress = undefined;
  readOnlyInitialized = false;
  console.log('DataHaven clients cleaned up');
};

// =============================================================================
// Utility Exports
// =============================================================================

export {
  FileManager,
  ReplicationLevel,
};
