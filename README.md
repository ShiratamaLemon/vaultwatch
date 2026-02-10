# VaultWatch

**Crypto Projects' Promises, Permanently Recorded**

VaultWatch records crypto project commitments (roadmaps, tokenomics, team promises) on [DataHaven](https://datahaven.xyz) decentralized storage. Investors can track "promises vs. achievements" through immutable, cryptographically verifiable on-chain records.

## Core Idea

Projects register promises. DataHaven stores them tamper-proof. Anyone can verify.

```
Register Project  -->  Add Commitments  -->  Update Status  -->  Verify Integrity
   (bucket)          (2-stage upload)      (on-chain proof)    (Merkle fingerprint)
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Two-Stage Upload** | Upload JSON, get txHash, re-upload with txHash embedded. On-chain and off-chain data are cryptographically bound. |
| **Merkle Verification** | Downloaded data fingerprint is compared against on-chain fingerprint to detect tampering. |
| **Verification Deep Dive** | Click any verification badge to see fingerprint comparison, storage replication status, and explorer links. |
| **Transparency Score** | A-F grade calculated from fulfillment rate (50%), deadline adherence (25%), and evidence quality (25%). |
| **On-chain Ownership** | Bucket ownership verified on-chain before every write operation. |
| **Read-Only Browsing** | Browse all projects without connecting a wallet. |
| **Live Stats** | Home page shows live project and commitment counts. |

## Two-Stage Upload Pattern

VaultWatch's most distinctive technical design. Solves the on-chain/off-chain data consistency problem:

```
1st Upload:  JSON data  --->  issueStorageRequest()  --->  txHash, fileKey, blockNumber
2nd Upload:  JSON + txHash embedded  --->  same file path  --->  txHash permanently stored in data
Loading:     List files from MSP  --->  deduplicate by name (latest uploadedAt wins)
```

**Why?** Without this, the txHash of a storage transaction cannot be included in the stored data itself. This pattern ensures the on-chain proof and off-chain content reference each other.

## Verification Deep Dive

Clicking a verification badge opens a modal with three sections:

**Data Integrity** — Compares the Merkle fingerprint calculated from downloaded bytes against the on-chain fingerprint stored in `storageRequests`. If they match, the data is provably untampered.

**Storage Status** — Queries the chain in real-time: MSP confirmed? Storage request fulfilled? BSP replication progress?

**On-chain Links** — Direct links to DHScan (EVM tx), Basic Explorer, and Statescan (Substrate block).

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS 4, shadcn/ui |
| Wallet | RainbowKit, wagmi v2, viem |
| Storage | DataHaven SDK (`@storagehub-sdk/core`, `@storagehub-sdk/msp-client`) |
| Chain API | Polkadot.js API (Substrate layer queries) |
| State | Zustand |

## Architecture

```
Components
    |
    v
useDataHaven hook  (single entry point for all SDK operations)
    |
    v
client.ts  (initialization, upload, download, verification)
    |
    +---> StorageHub SDK  (on-chain: buckets, storage requests)
    +---> MSP Client      (off-chain: file upload/download)
    +---> Polkadot API    (substrate queries: fingerprints, ownership)
```

**Rules:**
- All SDK operations go through `client.ts`. Components never call SDK directly.
- WASM must be initialized before any SDK operation (`providers.tsx` handles this).
- MSP backend syncs asynchronously. Always use wait functions after writes.

### Data Structure

```
bucket (vaultwatch-{uuid})/
  metadata.json              # Project metadata
  commitments/
    {commitment-uuid}.json   # Individual commitments
```

All files are wrapped in `StorageWrapper<T>` with version, type, data, and timestamp.

## Setup

### Prerequisites

- Node.js v22+
- pnpm
- MetaMask or WalletConnect-compatible wallet

### Install & Run

```bash
pnpm install
cp .env.example .env.local   # then edit
pnpm dev                     # http://localhost:3000
```

### Environment Variables

```
NEXT_PUBLIC_DATAHAVEN_RPC_URL=https://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_DATAHAVEN_WSS_URL=wss://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_MSP_URL=https://deo-dh-backend.testnet.datahaven-infra.network/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id   # optional
```

## Project Structure

```
src/
  app/                    # Pages (App Router)
    projects/             # Project list & detail (with verification modal)
    register/             # Project registration
    dashboard/            # Owner dashboard & commitment management
  components/
    ui/                   # shadcn/ui + verification-badge, verification-detail-modal
    project/              # ProjectCard, ProjectForm, TransparencyScoreBadge
    commitment/           # CommitmentTimeline, StatusUpdateModal
    layout/               # Header, Footer, Container
    home/                 # HomeStats
  lib/
    datahaven/            # client.ts, explorer.ts, types.ts, verification-cache.ts
    wagmi/                # Chain & wallet config
    transparency-score.ts # Score calculation
  hooks/                  # useDataHaven (main SDK hook)
  stores/                 # Zustand (projectStore, uiStore)
  types/                  # TypeScript type definitions
```

## DataHaven Testnet

| Item | Value |
|------|-------|
| Chain ID | 55931 |
| RPC | `https://services.datahaven-testnet.network/testnet` |
| WSS | `wss://services.datahaven-testnet.network/testnet` |
| Faucet | https://faucet.datahaven-testnet.network/ (once per 24h) |
| DHScan | https://testnet.dhscan.io/ (EVM transactions) |
| Statescan | https://datahaven-testnet.statescan.io/ (Substrate, search by block number) |

**Note:** Bucket creation requires 100 MOCK deposit (locked as Reserved Balance).

## Security

- **Merkle Verification**: Every download is verified against on-chain fingerprints. Cached for 1 hour.
- **Ownership Verification**: On-chain `providers.buckets(bucketId).userId` check before all writes.
- **SIWE Authentication**: Required before uploads. Session in memory only (never localStorage).
- **No `dangerouslySetInnerHTML`**: React's default escaping throughout.

## Documentation

- [Architecture Design](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [Feature Specifications](docs/FEATURES.md)
- [DataHaven Integration Guide](docs/DATAHAVEN_INTEGRATION.md)
- [Security Audit Report](docs/SECURITY_AUDIT_INTEGRATED.md)

## License

MIT License - See [LICENSE](LICENSE) for details.
