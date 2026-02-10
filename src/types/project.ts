/**
 * Project category types
 */
export type ProjectCategory =
  | 'defi'
  | 'nft'
  | 'gaming'
  | 'infrastructure'
  | 'dao'
  | 'social'
  | 'other';

/**
 * Project status types
 */
export type ProjectStatus = 'active' | 'inactive' | 'archived';

/**
 * Project entity
 */
export interface Project {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Project name */
  name: string;

  /** Project description (max 500 chars) */
  description: string;

  /** Category */
  category: ProjectCategory;

  /** Status */
  status: ProjectStatus;

  /** Official website URL */
  website: string;

  /** Twitter/X URL */
  twitter?: string;

  /** Discord URL */
  discord?: string;

  /** GitHub URL */
  github?: string;

  /** Logo image URL or DataHaven file key */
  logoUrl?: string;

  /** Owner's wallet address (checksummed) */
  ownerAddress: string;

  /** DataHaven bucket ID */
  bucketId: string;

  /** Project metadata file key in DataHaven */
  fileKey: string;

  /** Merkle root for verification */
  merkleRoot: string;

  /** Creation timestamp (Unix ms) */
  createdAt: number;

  /** Last update timestamp (Unix ms) */
  updatedAt: number;
}

/**
 * Project form data (for creation/editing)
 */
export interface ProjectFormData {
  name: string;
  description: string;
  category: ProjectCategory;
  website: string;
  twitter?: string;
  discord?: string;
  github?: string;
  logoUrl?: string;
}

/**
 * Project index entry (for listing)
 */
export interface ProjectIndexEntry {
  id: string;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  ownerAddress: string;
  bucketId: string;
  commitmentCount: number;
  lastUpdated: number;
  transparencyScore?: number;
}

/**
 * Project index (full)
 */
export interface ProjectIndex {
  version: number;
  projects: ProjectIndexEntry[];
  lastSyncedAt: number;
}

/**
 * Category display labels
 */
export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  defi: 'DeFi',
  nft: 'NFT',
  gaming: 'Gaming',
  infrastructure: 'Infrastructure',
  dao: 'DAO',
  social: 'Social',
  other: 'Other',
};

/**
 * Status display labels
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};
