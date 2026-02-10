# 🏛️ VaultWatch

**Crypto Projects' Promises, Permanently Recorded**

VaultWatch is a platform that records crypto project transparency in a verifiable way. It leverages DataHaven decentralized storage to store project "promises" in a tamper-proof manner.

## 🔑 Key Innovation: Two-Stage Upload for Data Integrity

VaultWatch implements a unique two-stage upload pattern to ensure cryptographic linkage between on-chain and off-chain data:

1. First upload → get transaction hash and file key
2. Second upload → embed the hash into the data itself
3. Result: On-chain and off-chain data are cryptographically bound at hash level

This design prevents tampering and enables Merkle proof verification of data integrity.

**Design rationale:** I identified the risk of on-chain/off-chain inconsistency when using decentralized storage, and designed this pattern to address it.

## 📊 Development Status

| Status | Description |
|--------|-------------|
| ✅ MVP Complete | Core features completed and tested on testnet |
| ✅ SDK Integration Complete | Implementation using official StorageHub SDK |
| ✅ UI Implementation Complete | All pages and components implemented |
| ✅ Testnet Verification Complete | Project registration, commitments, and status updates working correctly |
| ✅ Security Features Implemented | Merkle verification and on-chain ownership verification (2026-01-27) |

## 🎯 Concept

- **Projects** register their promises (roadmaps, tokenomics, etc.)
- Data is stored on **DataHaven** with tamper-proof timestamps
- **Investors** track "promises vs. achievements" and evaluate reliability

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 Wallet Connection | RainbowKit (MetaMask, WalletConnect support) |
| 📝 Project Registration | Save to DataHaven, create buckets |
| 📜 Commitment Recording | Register promises, 2-stage upload for permanent txHash storage |
| 🔄 Status Updates | In Progress / Completed / Delayed / Cancelled |
| 📊 Timeline Display | Chronological display with deduplication |
| 🔗 On-chain Links | TX links to DHScan, File Key copy functionality |
| ✅ Data Verification | Tamper detection via Merkle proofs |
| 🛡️ Ownership Verification | On-chain ownership verification before write operations |

## 🛠️ Tech Stack

| Category | Technology |
|---------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Wallet** | RainbowKit, wagmi v2, viem |
| **Storage** | DataHaven SDK (@storagehub-sdk/core, @storagehub-sdk/msp-client) |
| **State** | Zustand |

## 🏗️ Architecture

### Two-Stage Upload Mechanism

A method adopted to permanently store commitment txHashes:

```
1. First Upload
   ├─ Send JSON data to MSP
   ├─ Record on chain via issueStorageRequest()
   └─ Obtain txHash, fileKey, blockNumber

2. Second Upload
   ├─ Recreate JSON including obtained txHash, etc.
   ├─ Re-upload to the same path
   └─ txHash is permanently stored

3. Data Loading
   ├─ Get file list from MSP
   ├─ Select latest by uploadedAt for files with same name (deduplication)
   └─ Display commitments with txHash
```

## 🚀 Setup

### Prerequisites

- Node.js v22 or higher
- pnpm (recommended)
- MetaMask or WalletConnect-compatible wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/ShiratamaLemon/vaultwatch.git
cd vaultwatch

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local

# Start the development server
pnpm dev
```

### Environment Variables

Set the following in `.env.local`:

```
NEXT_PUBLIC_DATAHAVEN_RPC_URL=https://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_DATAHAVEN_WSS_URL=wss://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_MSP_URL=https://deo-dh-backend.testnet.datahaven-infra.network/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

**Note**: Get your WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/) (free). The app will work with injected wallets (like MetaMask) without it, but WalletConnect features require it.

### Usage

1. **Connect Wallet**: Click "Connect Wallet" in the top right
2. **Register Project**: Enter project information from "Register Project" (requires 100 MOCK deposit)
3. **Add Commitment**: Register roadmaps, etc. from Dashboard → "Add Commitment"
4. **Update Status**: Click status badge in timeline to update progress
5. **Verify**: Check on-chain data via DHScan links
6. **Data Integrity**: View verification badges showing Merkle proof verification status

## 📁 Directory Structure

```
src/
├── app/              # Pages (App Router)
│   ├── projects/     # Project list & details
│   ├── register/     # Project registration
│   └── dashboard/    # Dashboard
├── components/       # UI Components
│   ├── ui/           # shadcn/ui
│   ├── layout/       # Header, Footer, Container
│   ├── project/      # ProjectCard, ProjectForm, ProjectList
│   └── commitment/   # CommitmentCard, CommitmentForm, StatusUpdateModal
├── lib/              # Utilities, SDK Integration
│   ├── datahaven/    # DataHaven SDK (client, explorer, types, verification-cache)
│   └── wagmi/        # wagmi configuration
├── hooks/            # Custom Hooks (useDataHaven)
├── stores/           # State Management (Zustand)
└── types/            # TypeScript Type Definitions
```

## 📖 Documentation

- [Architecture Design](docs/ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [Feature Specifications](docs/FEATURES.md)
- [DataHaven Integration Guide](docs/DATAHAVEN_INTEGRATION.md)
- [Current Status](docs/CURRENT_STATUS.md)
- [Security Audit Report](docs/SECURITY_AUDIT_INTEGRATED.md)

## 🌐 DataHaven Testnet Information

| Item | Value |
|------|-------|
| Chain ID | 55931 |
| RPC URL | https://services.datahaven-testnet.network/testnet |
| WSS URL | wss://services.datahaven-testnet.network/testnet |
| MSP URL | https://deo-dh-backend.testnet.datahaven-infra.network/ |

### Block Explorers

| Explorer | URL | Purpose |
|----------|-----|---------|
| DHScan | https://testnet.dhscan.io/ | EVM transaction verification (main) |
| Basic Explorer | https://datahaven-explorer.netlify.app/ | Simple EVM verification |
| Statescan | https://datahaven-testnet.statescan.io/#/ | Substrate layer (search by block number) |

### Important: Testnet Usage

- **Faucet**: https://faucet.datahaven-testnet.network/ (once per 24 hours)
- **Bucket Creation**: Requires 100 MOCK deposit (locked as Reserved Balance)

## 🔒 Security Features

### Data Integrity Verification (Merkle Verification)

- Automatic verification of downloaded data against on-chain fingerprints
- Visual verification badges showing verification status
- Asynchronous verification for optimal UX (data displayed immediately, verification in background)
- Verification result caching to avoid redundant checks

### On-chain Ownership Verification

- Ownership verification before write operations (commitment addition, status updates)
- Prevents unauthorized modifications even if metadata is tampered with
- Minimal UX impact (verification only on write operations)

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - See [LICENSE](LICENSE) for details
