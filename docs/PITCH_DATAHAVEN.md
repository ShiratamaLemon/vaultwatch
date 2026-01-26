# VaultWatch: Crypto Transparency Platform

## Built on DataHaven | Hackathon Submission 2026

---

<!-- SLIDE 1: TITLE -->
## Title

**VaultWatch** — Holding Crypto Projects Accountable

*Immutable records. Verifiable promises. Restored trust.*

**Built on**: DataHaven Decentralized Storage  
**Status**: MVP Complete, Testnet Verified  
**Date**: January 2026

---

<!-- SLIDE 2: THE PROBLEM -->
## The Problem: Trust Crisis in Crypto

### The Reality

| Issue | Impact |
|-------|--------|
| **Broken Promises** | 78% of roadmap items are never delivered |
| **Deleted Evidence** | Teams delete tweets and announcements after failing |
| **No Accountability** | Projects pivot without consequence |
| **Investor Losses** | Billions lost to "soft rugs" and abandoned projects |

### Why Current Solutions Fail

| Approach | Problem |
|----------|---------|
| Screenshots | Can be faked, easily manipulated |
| Archive.org | Incomplete, no crypto integration |
| Trust | Centralized, corruptible |
| Memory | "We never said that" |

**The crypto industry needs verifiable, permanent records.**

---

<!-- SLIDE 3: OUR SOLUTION -->
## The Solution: VaultWatch

### One-Line Pitch

> "VaultWatch is GitHub for crypto promises — every commitment is recorded, timestamped, and impossible to delete."

### Core Concept

```
PROJECT                    VAULTWATCH                 DATAHAVEN
   │                           │                          │
   │  "Mainnet Q2 2026"        │                          │
   ├──────────────────────────▶│                          │
   │                           │  Store + Hash + Sign     │
   │                           ├─────────────────────────▶│
   │                           │                          │
   │                           │  ◀─ Merkle Root + TX ────┤
   │                           │                          │
   │                           │                          │
INVESTOR                       │                          │
   │  "Did they promise this?" │                          │
   ├──────────────────────────▶│                          │
   │                           │  Verify Proof            │
   │                           ├─────────────────────────▶│
   │  ◀── "Yes, Jan 25 2026,   │                          │
   │       unmodified" ────────┤                          │
```

### Value Proposition

| For Projects | For Investors |
|--------------|---------------|
| Build credibility | Verify before investing |
| Differentiate from scams | Track promises vs reality |
| Public accountability | Historical evidence |

---

<!-- SLIDE 4: ARCHITECTURE -->
## Architecture: How It Works

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│     "We will launch mainnet in Q2 2026"                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      JSON CONVERSION                             │
│  {                                                               │
│    "title": "Mainnet Launch",                                    │
│    "description": "We will launch mainnet in Q2 2026",          │
│    "type": "roadmap",                                            │
│    "status": "pending",                                          │
│    "createdAt": 1737849600000                                    │
│  }                                                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│      MSP (Off-chain)      │   │    BLOCKCHAIN (On-chain)       │
│  ─────────────────────    │   │  ───────────────────────────   │
│  • Full JSON file         │   │  • File fingerprint (hash)     │
│  • Searchable             │   │  • Bucket ID                   │
│  • Fast retrieval         │   │  • File key                    │
│  • Cost efficient         │   │  • TX hash + Block number      │
└───────────────────────────┘   └───────────────────────────────┘
```

### Why This Design?

| Aspect | Implementation | Benefit |
|--------|----------------|---------|
| **Cost** | Data off-chain, proof on-chain | Affordable at scale |
| **Speed** | MSP for reads, chain for writes | Fast user experience |
| **Verification** | Hash comparison | Tamper-proof |
| **Permanence** | Blockchain anchor | Cannot be deleted |

---

<!-- SLIDE 5: SECURITY & TRANSPARENCY -->
## Security & Transparency Design

### Intentional Transparency

VaultWatch data is **NOT encrypted** — by design.

| Why? | |
|------|---|
| **Purpose** | Public accountability requires public data |
| **Verification** | Anyone can independently verify |
| **Trust** | No "trust us" — verify yourself |

### What's Recorded On-Chain

When you view a transaction on [DHScan](https://testnet.dhscan.io/), you see:

```
Raw Input (decoded):
├─ Function: issueStorageRequest
├─ bucketId: 0xb542f2af...
├─ fileName: "commitments/23ff9a2e-7b12-41f1-aab9-ca5b97b791d5.json"
├─ fingerprint: 0x6eff490a... (SHA256-like hash of content)
├─ fileSize: 850 bytes
└─ mspId: Storage provider identifier
```

**Note**: The actual JSON content is stored on MSP, not on-chain. The chain only stores the fingerprint (hash) for verification.

### Tamper Detection Flow

```
1. ORIGINAL UPLOAD
   JSON data → Hash calculation → fingerprint stored on-chain
   
2. LATER VERIFICATION
   Fetch JSON from MSP → Recalculate hash → Compare with on-chain fingerprint
   
   ✅ Match = Data unchanged
   ❌ Mismatch = TAMPERING DETECTED
```

### SIWE Authentication

| Operation | Auth Required | Scope |
|-----------|---------------|-------|
| View projects | No | Public data |
| View project details | Yes (SIWE) | Read from MSP |
| Create commitment | Yes (SIWE) | Write to own bucket only |
| Update status | Yes (SIWE) | Modify own data only |

---

<!-- SLIDE 6: TECHNICAL IMPLEMENTATION -->
## Technical Implementation

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | RainbowKit, wagmi v2, viem |
| Auth | SIWE (Sign-In with Ethereum) |
| Storage | DataHaven SDK (`@storagehub-sdk/core`, `@storagehub-sdk/msp-client`) |
| State | Zustand |

### DataHaven SDK Integration

```typescript
// 1. Create bucket (100 MOCK deposit)
const { bucketId, txHash } = await createBucket(projectName, ownerAddress);

// 2. Upload commitment (2-phase for txHash persistence)
const firstResult = await uploadJsonFile(bucketId, fileName, data);
const finalResult = await uploadJsonFile(bucketId, fileName, {
  ...data,
  txHash: firstResult.txHash,  // Store TX reference in data
  fileKey: firstResult.fileKey
});

// 3. Verify integrity
const storedData = await downloadFile(fileKey);
const recalculatedHash = computeFingerprint(storedData);
const isValid = recalculatedHash === onChainFingerprint;
```

### Data Structure

```
Bucket: vaultwatch-{projectName}-{walletAddress}
├── metadata.json           // Project info
└── commitments/
    ├── {uuid-1}.json       // Commitment with txHash
    ├── {uuid-2}.json
    └── ...
```

### 2-Phase Upload Pattern

We implemented a special pattern to permanently store transaction hashes:

```
Phase 1: Upload data → Get txHash
Phase 2: Upload data + txHash → Permanent record with self-reference
```

This ensures every commitment includes its own blockchain proof.

---

<!-- SLIDE 7: KEY FEATURES -->
## Key Features (Implemented & Tested)

### Project Management

| Feature | Status | Description |
|---------|--------|-------------|
| Project Registration | ✅ Working | Create bucket, store metadata |
| Project Listing | ✅ Working | Browse all registered projects |
| Project Details | ✅ Working | View full info + commitments |
| Owner Detection | ✅ Working | Wallet address comparison |

### Commitment Management

| Feature | Status | Description |
|---------|--------|-------------|
| Create Commitment | ✅ Working | 2-phase upload with txHash |
| Timeline View | ✅ Working | Chronological display |
| Status Update | ✅ Working | Pending → Completed/Delayed/etc |
| On-chain Links | ✅ Working | Direct link to DHScan TX |

### Verification

| Feature | Status | Description |
|---------|--------|-------------|
| Verified Badge | ✅ Working | Shows data is on DataHaven |
| TX Hash Display | ✅ Working | Click to view on explorer |
| File Key Copy | ✅ Working | One-click copy for verification |

---

<!-- SLIDE 8: DEMO -->
## Live Demo

### Testnet Information

| Item | Value |
|------|-------|
| Network | DataHaven Testnet |
| Chain ID | 55931 |
| Explorer | https://testnet.dhscan.io/ |
| Faucet | https://faucet.datahaven-testnet.network/ |

### User Journey

```
1. CONNECT WALLET
   └─ RainbowKit modal → MetaMask/WalletConnect

2. REGISTER PROJECT
   └─ Fill form → Sign 3 transactions → Bucket created

3. ADD COMMITMENT
   └─ Enter promise → Sign 2 transactions → Stored on DataHaven

4. VIEW & VERIFY
   └─ See timeline → Click TX link → Verify on DHScan

5. UPDATE STATUS
   └─ Owner can mark as Completed/Delayed → New TX recorded
```

### Screenshots

| Screen | Purpose |
|--------|---------|
| Home | Landing page, value proposition |
| Projects | Browse all registered projects |
| Project Detail | Timeline with verification badges |
| Dashboard | Manage your projects (owner only) |
| Register | Create new project |

---

<!-- SLIDE 9: MARKET OPPORTUNITY -->
## Market Opportunity

### Target Users

| Segment | Pain Point | Market Size |
|---------|------------|-------------|
| **Crypto Projects** | Build trust, prove legitimacy | 10,000+ active projects |
| **Retail Investors** | Due diligence, avoid scams | 400M+ crypto holders |
| **VCs & Funds** | Portfolio accountability | 1,000+ crypto funds |
| **Researchers** | Historical analysis | Growing demand |

### Why Now?

| Trend | Opportunity |
|-------|-------------|
| Post-FTX trust crisis | Demand for transparency tools |
| Regulatory pressure | Projects need compliance records |
| DataHaven launch | First truly decentralized storage |
| Maturing market | Quality over hype |

### Future Revenue Model

| Tier | Features | Price |
|------|----------|-------|
| Free | Basic registration | $0 |
| Pro | Analytics, API, alerts | $X/month |
| Enterprise | White-label, bulk | Custom |

---

<!-- SLIDE 10: CURRENT STATUS & ROADMAP -->
## Current Status

### MVP Complete ✅

| Milestone | Status | Date |
|-----------|--------|------|
| SDK Integration | ✅ Done | Jan 2026 |
| UI/UX Implementation | ✅ Done | Jan 2026 |
| Testnet Verification | ✅ Done | Jan 2026 |
| Status Update Feature | ✅ Done | Jan 2026 |
| On-chain Links | ✅ Done | Jan 2026 |

### Verified Transactions

```
Block 1267353: Project registration
Block 1267365: Commitment creation
Block 1267397: Status update
All transactions verifiable on DHScan
```

### Future Roadmap

| Phase | Features |
|-------|----------|
| **Phase 2** | Search, transparency score, notifications |
| **Phase 3** | API, multi-chain, governance |
| **Mainnet** | Production deployment |

---

<!-- SLIDE 11: CALL TO ACTION -->
## Call to Action

### What We've Built

- **Working MVP** on DataHaven Testnet
- **Complete SDK integration** using official packages
- **Production-ready UI** with modern UX
- **Open-source codebase** for community contribution

### What We're Looking For

| Ask | Purpose |
|-----|---------|
| **Feedback** | Improve product and integration |
| **Recognition** | Hackathon prize consideration |
| **Partnership** | Joint marketing, case study |
| **Funding** | Accelerate mainnet deployment |

### Why VaultWatch Matters for DataHaven

| Benefit | Impact |
|---------|--------|
| **Showcase App** | Demonstrates DataHaven's unique value |
| **Developer Reference** | Real-world integration example |
| **Ecosystem Growth** | Attracts projects and investors |
| **Use Case Validation** | Proves demand for verifiable storage |

---

## Contact & Resources

### Links

| Resource | URL |
|----------|-----|
| GitHub | [Repository Link] |
| Live Demo | localhost:3000 (dev) |
| DHScan | https://testnet.dhscan.io/ |
| DataHaven Docs | https://docs.datahaven.xyz/ |

### Team

**Project**: VaultWatch  
**Hackathon**: DataHaven 2026  
**Contact**: [Your Contact Info]

---

## Appendix: Technical Details

### Repository Structure

```
vaultwatch/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   │   ├── commitment/   # CommitmentCard, Timeline, StatusModal
│   │   ├── project/      # ProjectCard, Registration
│   │   └── ui/           # shadcn/ui components
│   ├── lib/
│   │   ├── datahaven/    # SDK integration (client.ts, explorer.ts)
│   │   └── wagmi/        # Wallet configuration
│   ├── hooks/            # useDataHaven custom hook
│   ├── stores/           # Zustand state management
│   └── types/            # TypeScript definitions
└── docs/                 # Documentation
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/datahaven/client.ts` | All DataHaven SDK operations |
| `hooks/useDataHaven.ts` | React hook for SDK access |
| `types/commitment.ts` | Commitment data model with txHash |

### DataHaven Testnet Config

```typescript
export const datahavenTestnet = {
  id: 55931,
  name: 'DataHaven Testnet',
  rpcUrls: {
    default: { http: ['https://services.datahaven-testnet.network/testnet'] }
  },
  nativeCurrency: { name: 'MOCK', symbol: 'MOCK', decimals: 18 }
};
```

---

*VaultWatch: Building trust in crypto, one commitment at a time.*

*Powered by DataHaven Decentralized Storage*
