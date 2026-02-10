/**
 * Commitment type categories
 */
export type CommitmentType =
  | 'roadmap'
  | 'tokenomics'
  | 'partnership'
  | 'team'
  | 'funding'
  | 'product'
  | 'governance'
  | 'other';

/**
 * Commitment status types
 */
export type CommitmentStatus =
  | 'pending'
  | 'completed'
  | 'delayed'
  | 'cancelled'
  | 'modified';

/**
 * Commitment entity
 */
export interface Commitment {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Associated project ID */
  projectId: string;

  /** Commitment type */
  type: CommitmentType;

  /** Title (max 100 chars) */
  title: string;

  /** Detailed description (max 2000 chars) */
  description: string;

  /** Target date (Unix timestamp ms, optional) */
  targetDate?: number;

  /** Evidence URL (link to official announcement) */
  evidenceUrl?: string;

  /** Evidence snapshot (optional, stored in DataHaven) */
  evidenceSnapshot?: string;

  /** Current status */
  status: CommitmentStatus;

  /** Status change reason (for delayed, cancelled, modified) */
  statusReason?: string;

  /** Status last updated timestamp (Unix ms) */
  statusUpdatedAt?: number;

  /** Status last updated by (wallet address) */
  statusUpdatedBy?: string;

  /** Previous status (for history tracking) */
  previousStatus?: CommitmentStatus;

  /** Previous file key (for history tracking) */
  previousFileKey?: string;

  /** DataHaven file key (optional until uploaded) */
  fileKey?: string;

  /** Transaction hash for on-chain verification */
  txHash?: string;

  /** Block number where the transaction was confirmed */
  blockNumber?: number;

  /** Merkle root for verification (optional until uploaded) */
  merkleRoot?: string;

  /** Creator's wallet address */
  createdBy: string;

  /** Creation timestamp (Unix ms) */
  createdAt: number;

  /** Last update timestamp (Unix ms) */
  updatedAt: number;
}

/**
 * Commitment form data (for creation)
 */
export interface CommitmentFormData {
  type: CommitmentType;
  title: string;
  description: string;
  targetDate?: number;
  evidenceUrl?: string;
}

/**
 * Type display labels
 */
export const COMMITMENT_TYPE_LABELS: Record<CommitmentType, string> = {
  roadmap: 'Roadmap',
  tokenomics: 'Tokenomics',
  partnership: 'Partnership',
  team: 'Team',
  funding: 'Funding',
  product: 'Product',
  governance: 'Governance',
  other: 'Other',
};

/**
 * Status display labels
 */
export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
  modified: 'Modified',
};

/**
 * Status colors for UI
 */
export const COMMITMENT_STATUS_COLORS: Record<CommitmentType, string> = {
  roadmap: 'bg-blue-500',
  tokenomics: 'bg-green-500',
  partnership: 'bg-purple-500',
  team: 'bg-orange-500',
  funding: 'bg-yellow-500',
  product: 'bg-cyan-500',
  governance: 'bg-pink-500',
  other: 'bg-gray-500',
};
