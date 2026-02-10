# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VaultWatch is a crypto project transparency platform that records project commitments (roadmaps, tokenomics, etc.) in a tamper-proof manner using DataHaven decentralized storage. The platform enables investors to track "promises vs. achievements" through immutable on-chain records.

**Current Status**: MVP complete, tested on DataHaven testnet, with full SDK integration, security features (Merkle verification + ownership verification), and all core functionality operational.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript (strict mode), React 19
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Blockchain**: DataHaven testnet (Chain ID: 55931), wagmi v2, viem, RainbowKit
- **Storage**: StorageHub SDK (@storagehub-sdk/core, @storagehub-sdk/msp-client)
- **State**: Zustand
- **API Layer**: Polkadot.js API for Substrate interactions

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# No test suite currently configured
```

## Core Architecture Patterns

### DataHaven Integration Architecture

**Critical**: All DataHaven SDK operations MUST go through `src/lib/datahaven/client.ts`. Never call SDK methods directly from components.

```
Components → useDataHaven hook → client.ts → StorageHub SDK
```

**WASM Initialization Requirement**: `initWasm()` from `@storagehub-sdk/core` must be called before any SDK operations. This is automatically handled in `src/app/providers.tsx` on app startup.

### Two-Stage Upload Pattern

VaultWatch uses a unique two-stage upload to permanently store transaction hashes within commitment data:

1. **First Upload**: Upload JSON → get txHash, fileKey, blockNumber from on-chain storage request
2. **Second Upload**: Re-upload same file path with txHash embedded → txHash becomes part of permanent data
3. **Deduplication on Read**: When loading files, select latest by `uploadedAt` timestamp for files with same name

This pattern is implemented in `useDataHaven.uploadFile()` for commitments.

### Security Verification Layers

**1. Data Integrity Verification (Merkle Proofs)**
- Location: `src/lib/datahaven/client.ts` - `verifyDataIntegrity()`
- Automatic verification on download via `downloadJsonFile()` with `verify: true`
- Compares calculated fingerprint vs on-chain fingerprint from `fileSystem.storageRequests(fileKey)`
- Uses `verification-cache.ts` to cache results (1 hour expiration)
- UI: `VerificationBadge` component shows status asynchronously

**2. On-chain Ownership Verification**
- Location: `src/lib/datahaven/client.ts` - `verifyBucketOwnership()`
- Called before ALL write operations (add commitment, update status)
- Queries `providers.buckets(bucketId)` to verify `userId` matches connected wallet
- Prevents unauthorized modifications even if metadata is tampered with

### Client Initialization Flow

The DataHaven client requires specific initialization order:

```typescript
1. initWasm()                        // WASM initialization (once at app start)
2. initPolkadotApi()                 // Substrate layer connection
3. initPublicClient(chain)           // EVM layer read operations
4. initStorageHubClient(chain, wallet) // On-chain operations (buckets, storage requests)
5. initMspClient(address)            // Off-chain storage operations
6. authenticateWithSIWE(walletClient) // Required before file uploads
```

This is managed in `useDataHaven` hook - components should never initialize clients directly.

### Storage Request Lifecycle

Understanding the lifecycle is critical for debugging:

```
1. issueStorageRequest() → Creates on-chain storage request
2. uploadFile() → Uploads data to MSP
3. MSP confirms → Sets msp.confirmed = true in storageRequests
4. BSP replication → bspsConfirmed increments until bspsRequired met
5. StorageRequestFulfilled → Storage request removed from chain (success indicator)
```

Use `verifyFileStorage()` and `waitForStorageRequestFulfilled()` to check lifecycle status.

## Key Architectural Decisions

### Bucket = Project Mapping

- Each project gets exactly one DataHaven bucket
- Bucket naming: `vaultwatch-{uuid}`
- Bucket ID is deterministically derived via `deriveBucketId(address, bucketName)`
- **Important**: Bucket creation requires 100 MOCK deposit (locked as Reserved Balance)

### File Structure Convention

```
bucket-root/
├── metadata.json           # Project metadata (name, description, owner, bucketId)
└── commitments/
    ├── {uuid1}.json       # Individual commitment files
    ├── {uuid2}.json
    └── ...
```

### Data Wrapper Format

All files are wrapped in `StorageWrapper<T>`:

```typescript
{
  version: "1.0",
  type: "project" | "commitment" | "index",
  data: T,  // Actual payload
  timestamp: number
}
```

This is handled automatically by `uploadJsonFile()` and `downloadJsonFile()`.

### State Management Strategy

- **Zustand Stores**: `projectStore`, `uiStore` in `src/stores/`
- **Server State**: All DataHaven data fetching happens through `useDataHaven` hook
- No React Query - direct async/await pattern
- Component state via `useState` for local UI concerns only

## Critical Implementation Notes

### Polkadot API vs EVM Layer

DataHaven is a hybrid chain (Substrate + EVM):

- **On-chain operations**: Use StorageHubClient (EVM precompiles) - returns EVM tx hashes
- **Reading bucket/file metadata**: Use Polkadot API (`query.providers.buckets`, `query.fileSystem.storageRequests`)
- **Never** search Substrate explorers (Statescan) with EVM tx hashes - use block numbers instead

### MSP Backend Synchronization

The MSP backend indexes chain data asynchronously. Always wait for sync:

- After bucket creation: `waitForBackendBucketReady()` (10 attempts, 2s delay)
- After file upload: `waitForBackendFileReady()` (15 attempts, 2s delay)
- After on-chain confirmation: `waitForMSPConfirmOnChain()` (10 attempts, 2s delay)

### Error Handling Pattern

```typescript
try {
  await datahavenOperation();
} catch (error) {
  if (error instanceof BucketCreationError) {
    // Handle bucket-specific errors
  } else if (error instanceof FileUploadError) {
    // Handle upload-specific errors
  } else if (error instanceof VerificationError) {
    // Handle verification failures
  } else if (error instanceof DataHavenError) {
    // Generic DataHaven error
  }
}
```

Custom error types defined in `src/lib/datahaven/types.ts`.

### Authentication Requirements

- SIWE authentication required before ANY file upload operations
- Authentication handled via `authenticateWithSIWE()` in client.ts
- Session token stored in memory (never localStorage)
- Re-authentication needed if session expires or wallet changes

## Environment Configuration

Required in `.env.local`:

```env
NEXT_PUBLIC_DATAHAVEN_RPC_URL=https://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_DATAHAVEN_WSS_URL=wss://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_MSP_URL=https://deo-dh-backend.testnet.datahaven-infra.network/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id  # Optional for WalletConnect
```

## File Organization Conventions

- **Components**: PascalCase (e.g., `ProjectCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useDataHaven.ts`)
- **Utilities/Types**: camelCase (e.g., `types.ts`, `utils.ts`)
- **Server Components**: Default (avoid `'use client'` unless necessary)
- **Client Components**: Use `'use client'` only when needed (useState, useEffect, event handlers, wagmi hooks)

## Code Style Guidelines

- **Language**: All code, comments, and UI strings in English
- **Import Order**: React/Next → External libs → Internal modules (`@/...`) → Styles
- **Type Safety**: No `any` types - use proper TypeScript types from `src/types/`
- **DataHaven Types**: Import from `src/lib/datahaven/types.ts`
- **Component Style**: Arrow function components with interface Props pattern

## Important Files to Reference

- `docs/DATAHAVEN_INTEGRATION.md` - Complete SDK integration guide with all flows
- `docs/ARCHITECTURE.md` - System architecture and data flow diagrams
- `docs/DATA_MODEL.md` - Type definitions and data structure specifications
- `docs/FEATURES.md` - Feature specifications and requirements
- `docs/SECURITY_AUDIT_INTEGRATED.md` - Security implementation details
- `src/lib/datahaven/client.ts` - Single source of truth for all DataHaven operations
- `src/hooks/useDataHaven.ts` - Main hook for components to access DataHaven functionality

## Testing & Verification

- **Testnet**: DataHaven testnet (Chain ID: 55931)
- **Faucet**: https://faucet.datahaven-testnet.network/ (once per 24 hours)
- **Explorers**:
  - DHScan: https://testnet.dhscan.io/ (EVM transactions - use tx hash)
  - Statescan: https://datahaven-testnet.statescan.io/ (Substrate - use block number)

## Common Pitfalls to Avoid

1. **Never** call DataHaven SDK directly from components - always use `useDataHaven` hook
2. **Never** skip WASM initialization - it's required before any SDK operations
3. **Never** assume MSP backend is immediately synchronized - always use wait functions
4. **Never** mix up EVM tx hashes with Substrate block explorers (Statescan)
5. **Never** forget ownership verification before write operations
6. **Never** use `dangerouslySetInnerHTML` - React's default escaping is sufficient
7. **Never** store session tokens in localStorage - memory only for security
8. **Always** wrap DataHaven operations in try-catch with specific error types
9. **Always** use verification when downloading sensitive data
10. **Always** handle the two-stage upload pattern correctly for commitments with txHash

## Deployment Notes

- **Build Config**: See `amplify.yml` for AWS Amplify configuration
- **Node Version**: v22+ required (see `.nvmrc`)
- **Package Manager**: pnpm (see `pnpm-workspace.yaml`)
- **Production Checks**: Ensure all environment variables are set before deployment
