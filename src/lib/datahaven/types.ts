/**
 * DataHaven SDK related types
 */

/**
 * DataHaven client configuration
 */
export interface DataHavenConfig {
  rpcUrl: string;
  wssUrl: string;
  mspUrl: string;
  chainId: number;
}

/**
 * Bucket information
 */
export interface BucketInfo {
  bucketId: string;
  name: string;
  ownerAddress: string;
  root: string;
  createdAt: number;
  fileCount?: number;
  sizeBytes?: number;
  isPublic?: boolean;
  valuePropId?: string;
}

/**
 * File information from MSP
 */
export interface FileInfo {
  fileKey: string;
  fingerprint: string;
  bucketId: string;
  location: string;
  size: number;
  isPublic: boolean;
  uploadedAt: Date;
  status: FileStatus;
  blockHash?: string;
  txHash?: string;
}

/**
 * File status
 */
export type FileStatus =
  | 'pending'
  | 'inProgress'
  | 'ready'
  | 'revoked'
  | 'rejected'
  | 'expired';

/**
 * File upload result
 */
export interface FileUploadResult {
  fileKey: string;
  merkleRoot: string;
  txHash: string;
  /** Block number containing the transaction (for Substrate explorer links) */
  blockNumber?: number;
  size: number;
}

/**
 * Bucket creation result
 */
export interface BucketCreationResult {
  bucketId: string;
  txHash: string;
  /** Block number containing the transaction (for Substrate explorer links) */
  blockNumber?: number;
}

/**
 * File download result
 */
export interface FileDownloadResult<T = unknown> {
  data: T;
  merkleRoot: string;
  verified: boolean;
}

/**
 * Upload receipt from MSP
 */
export interface UploadReceipt {
  status: 'upload_successful' | 'upload_failed';
  fileKey: string;
  bucketId: string;
  fingerprint: string;
  location: string;
}

/**
 * Download result from MSP
 */
export interface DownloadResponse {
  status: number;
  stream: ReadableStream<Uint8Array>;
  contentType: string | null;
}

/**
 * Verification result
 */
export interface VerificationResult {
  verified: boolean;
  onChainFingerprint?: string;
  calculatedFingerprint?: string;
  reason?: string;
  error?: unknown;
}

/**
 * Data integrity verification status
 */
export type VerificationStatus =
  | 'verified'      // Data integrity confirmed
  | 'unverified'    // Verification not performed
  | 'failed'        // Verification failed (mismatch)
  | 'pending'       // Verification in progress
  | 'unavailable';  // Cannot verify (missing on-chain data)

/**
 * Extended download result with verification
 */
export interface VerifiedDownloadResult<T = unknown> {
  data: T;
  verification: {
    status: VerificationStatus;
    onChainFingerprint?: string;
    calculatedFingerprint?: string;
    reason?: string;
    verifiedAt?: number;
  };
}

/**
 * MSP health status
 */
export interface MspHealthStatus {
  isHealthy: boolean;
  storage: boolean;
  database: boolean;
  rpc: boolean;
}

/**
 * Value proposition (pricing plan)
 */
export interface ValueProposition {
  id: string;
  name: string;
  pricePerGbPerBlock: string;
  maxFileSize: number;
}

/**
 * Storage request data from chain
 */
export interface StorageRequestData {
  requestedAt: string;
  expiresAt: string;
  owner: string;
  bucketId: string;
  location: string;
  fingerprint: string;
  size_: string;
  msp: [string, boolean];
  userPeerIds: string[];
  bspsRequired: string;
  bspsConfirmed: string;
  bspsVolunteered: string;
  depositPaid: string;
}

/**
 * DataHaven error class
 */
export class DataHavenError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'DataHavenError';
  }
}

/**
 * Bucket creation error
 */
export class BucketCreationError extends DataHavenError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'BUCKET_CREATION_FAILED', originalError);
  }
}

/**
 * File upload error
 */
export class FileUploadError extends DataHavenError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'FILE_UPLOAD_FAILED', originalError);
  }
}

/**
 * Verification error
 */
export class VerificationError extends DataHavenError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'VERIFICATION_FAILED', originalError);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends DataHavenError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'AUTH_FAILED', originalError);
  }
}

/**
 * Storage wrapper format for DataHaven
 */
export interface StorageWrapper<T> {
  version: string;
  type: 'project' | 'commitment' | 'index';
  data: T;
  signature?: string;
  timestamp: number;
}

/**
 * DataHaven client state
 */
export interface DataHavenClientState {
  wasmInitialized: boolean;
  authenticated: boolean;
  address?: string;
  buckets: BucketInfo[];
  files: FileInfo[];
}

/**
 * Initialize options
 */
export interface DataHavenInitOptions {
  autoConnect?: boolean;
  network?: 'testnet' | 'devnet';
}
