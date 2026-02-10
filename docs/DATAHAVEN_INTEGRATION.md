# DataHaven SDK 連携ガイド

## 概要

本ドキュメントでは、VaultWatchにおけるDataHaven SDKの統合方法を解説します。

## ✅ SDKステータス

**StorageHub SDKは公開済みです！** 以下のパッケージがnpmで利用可能：

| パッケージ | バージョン | 説明 |
|-----------|----------|------|
| `@storagehub-sdk/core` | 0.4.3 | コア機能、チェーン連携、FileManager |
| `@storagehub-sdk/msp-client` | 0.4.3 | MSPとの通信、認証、ファイル操作 |
| `@storagehub/types-bundle` | 0.2.9 | Substrate型定義 |
| `@storagehub/api-augment` | 0.2.14 | Polkadot API拡張 |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VaultWatch                                   │
│                                                                      │
│  ┌──────────────────┐    ┌─────────────────────────────────────┐    │
│  │   wagmi/viem     │    │         StorageHub SDK               │    │
│  │   RainbowKit     │───▶│   @storagehub-sdk/core              │    │
│  │                  │    │   @storagehub-sdk/msp-client        │    │
│  └──────────────────┘    │   @polkadot/api                     │    │
│                          └───────────────┬─────────────────────┘    │
│                                          │                           │
└──────────────────────────────────────────┼───────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DataHaven Network                               │
│                                                                      │
│  ┌─────────────────────┐         ┌─────────────────────────────┐    │
│  │        MSP          │         │     DataHaven Chain         │    │
│  │   (Off-chain)       │         │     (On-chain)              │    │
│  │                     │         │                             │    │
│  │  - File Storage     │         │  - Bucket Registry          │    │
│  │  - SIWE Auth        │         │  - Storage Requests         │    │
│  │  - Upload/Download  │         │  - Merkle Roots             │    │
│  │  - Health Status    │         │  - Payment Streams          │    │
│  └─────────────────────┘         └─────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 主要コンセプト

| コンセプト | 説明 |
|-----------|------|
| **Bucket** | ファイルを格納するコンテナ。1プロジェクト = 1バケット |
| **File** | バケット内のデータ。JSON形式でメタデータを保存 |
| **FileKey** | `computeFileKey(owner, bucketId, fileName)` で決定論的に生成 |
| **Fingerprint** | ファイルのMerkleルート。データ整合性の検証に使用 |
| **MSP** | Main Storage Provider。データを保管・配信するプロバイダー |
| **BSP** | Backup Storage Provider。レプリケーションを担当 |
| **Value Proposition** | MSPの料金プラン |
| **Storage Request** | ストレージ要求のオンチェーン登録 |

## セットアップ

### 1. パッケージインストール

```bash
# コアSDKとMSPクライアント
pnpm add @storagehub-sdk/core @storagehub-sdk/msp-client

# Polkadot/Substrate連携用
pnpm add @storagehub/types-bundle @polkadot/api @polkadot/types @storagehub/api-augment

# viemはwagmiと共にインストール済み
```

### 2. 環境変数

```env
NEXT_PUBLIC_DATAHAVEN_RPC_URL=https://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_DATAHAVEN_WSS_URL=wss://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_MSP_URL=https://deo-dh-backend.testnet.datahaven-infra.network/
NEXT_PUBLIC_DATAHAVEN_CHAIN_ID=55931
```

### 3. WASM初期化（必須）

**重要**: `@storagehub-sdk/core` の機能を使用する前に、必ず `initWasm()` を呼び出す必要があります。

```typescript
import { initWasm } from '@storagehub-sdk/core';

// アプリ起動時に一度だけ呼び出す
await initWasm();
```

VaultWatchでは `providers.tsx` で自動的に初期化されます：

```typescript
// src/app/providers.tsx
useEffect(() => {
  const initWasm = async () => {
    const { initializeWasm } = await import('@/lib/datahaven/client');
    await initializeWasm();
  };
  initWasm();
}, []);
```

## 完全なストレージフロー

### フロー概要

```
1. initWasm()           ← WASM初期化（必須）
2. MSP Health Check     ← MSP稼働状況確認
3. SIWE Authentication  ← ウォレット認証
4. Create Bucket        ← バケット作成
5. Wait for Backend     ← インデクサー同期待ち
6. Issue Storage Request ← オンチェーン登録
7. Upload File          ← MSPへアップロード
8. Wait for Confirmation ← MSP確認待ち
9. Download File        ← ファイル取得
```

### 1. クライアント初期化

```typescript
import { StorageHubClient, initWasm } from '@storagehub-sdk/core';
import { MspClient, HttpClientConfig } from '@storagehub-sdk/msp-client';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { types } from '@storagehub/types-bundle';
import '@storagehub/api-augment';

// WASM初期化
await initWasm();

// Polkadot API
const provider = new WsProvider('wss://services.datahaven-testnet.network/testnet');
const polkadotApi = await ApiPromise.create({
  provider,
  typesBundle: types,
  noInitWarn: true,
});

// StorageHub Client
const storageHubClient = new StorageHubClient({
  rpcUrl: 'https://services.datahaven-testnet.network/testnet',
  chain: datahavenTestnet,
  walletClient: walletClient,
  filesystemContractAddress: '0x0000000000000000000000000000000000000404',
});

// MSP Client
const httpCfg: HttpClientConfig = { 
  baseUrl: 'https://deo-dh-backend.testnet.datahaven-infra.network/' 
};
const mspClient = await MspClient.connect(httpCfg, sessionProvider);
```

### 2. SIWE認証

ファイルアップロードの前に認証が必要です：

```typescript
const authenticateUser = async () => {
  const domain = 'vaultwatch.app';
  const uri = 'https://vaultwatch.app';
  
  const siweSession = await mspClient.auth.SIWE(walletClient, domain, uri);
  sessionToken = siweSession.token;
  
  const profile = await mspClient.auth.getProfile();
  return profile;
};
```

### 3. バケット作成

```typescript
const createBucket = async (bucketName: string) => {
  // MSP情報取得
  const { mspId } = await mspClient.info.getInfo();
  
  // Value Proposition取得
  const valueProps = await mspClient.info.getValuePropositions();
  const valuePropId = valueProps[0].id;
  
  // バケットID導出（決定論的）
  const bucketId = await storageHubClient.deriveBucketId(address, bucketName);
  
  // バケット作成トランザクション
  const txHash = await storageHubClient.createBucket(
    mspId,
    bucketName,
    false, // isPrivate
    valuePropId
  );
  
  // トランザクション確認
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  return { bucketId, txHash };
};
```

### 4. バケット同期待ち

オンチェーンでバケットが作成されても、MSPバックエンドが認識するまで時間がかかります：

```typescript
const waitForBackendBucketReady = async (bucketId: string) => {
  const maxAttempts = 10;
  const delayMs = 2000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const bucket = await mspClient.buckets.getBucket(bucketId);
      if (bucket) {
        console.log('Bucket found in MSP backend');
        return;
      }
    } catch (error) {
      if (error.status === 404) {
        console.log('Bucket not found yet, waiting...');
      } else {
        throw error;
      }
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('Bucket not ready after waiting');
};
```

### 5. ファイルアップロード

```typescript
import { FileManager, ReplicationLevel } from '@storagehub-sdk/core';
import { TypeRegistry } from '@polkadot/types';

const uploadFile = async (bucketId: string, fileName: string, data: object) => {
  // FileManager作成
  const jsonString = JSON.stringify(data);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const fileManager = new FileManager({
    size: blob.size,
    stream: () => blob.stream(),
  });
  
  // Fingerprint取得
  const fingerprint = await fileManager.getFingerprint();
  
  // MSP情報取得
  const { mspId, multiaddresses } = await mspClient.info.getInfo();
  const peerIds = multiaddresses.map(addr => addr.split('/p2p/').pop()).filter(Boolean);
  
  // Storage Request発行（オンチェーン）
  const txHash = await storageHubClient.issueStorageRequest(
    bucketId,
    fileName,
    fingerprint.toHex(),
    BigInt(blob.size),
    mspId,
    peerIds,
    ReplicationLevel.Custom,
    1 // replicas
  );
  
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  // FileKey計算
  const registry = new TypeRegistry();
  const owner = registry.createType('AccountId20', address);
  const bucketIdH256 = registry.createType('H256', bucketId);
  const fileKey = await fileManager.computeFileKey(owner, bucketIdH256, fileName);
  
  // MSPへアップロード
  const uploadReceipt = await mspClient.files.uploadFile(
    bucketId,
    fileKey.toHex(),
    await fileManager.getFileBlob(),
    address,
    fileName
  );
  
  return { fileKey: fileKey.toHex(), uploadReceipt };
};
```

### 6. MSP確認待ち

アップロード後、MSPがオンチェーンで確認するまで待機：

```typescript
const waitForMSPConfirmOnChain = async (fileKey: string) => {
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    const req = await polkadotApi.query.fileSystem.storageRequests(fileKey);
    if (req.isNone) {
      throw new Error('Storage request no longer exists');
    }
    
    const data = req.unwrap();
    const mspTuple = data.msp.isSome ? data.msp.unwrap() : null;
    const mspConfirmed = mspTuple ? mspTuple[1].isTrue : false;
    
    if (mspConfirmed) {
      console.log('Storage request confirmed by MSP');
      return;
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('MSP confirmation timeout');
};
```

### 7. ファイルダウンロード

```typescript
const downloadFile = async (fileKey: string) => {
  const response = await mspClient.files.downloadFile(fileKey);
  
  if (response.status !== 200) {
    throw new Error(`Download failed: ${response.status}`);
  }
  
  // ストリームを読み取り
  const reader = response.stream.getReader();
  const chunks = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const blob = new Blob(chunks);
  const text = await blob.text();
  return JSON.parse(text);
};
```

### 8. StorageRequestFulfilled イベント検証

ファイルがDataHavenネットワーク全体に伝播されたことを確認します。FAQによると、`StorageRequestFulfilled`イベントがオンチェーンで発生することで、ファイルの安全性を検証できます。

```typescript
import { 
  waitForStorageRequestFulfilled, 
  verifyFileStorage 
} from '@/lib/datahaven/client';

// 方法1: StorageRequestFulfilledを待機
const verification = await waitForStorageRequestFulfilled(fileKey);
console.log(verification.isSecure);  // true = 安全に保存済み

// 方法2: 現在のストレージ状態を確認
const status = await verifyFileStorage(fileKey, bucketId);
console.log(status);
// {
//   isSecure: true,
//   mspConfirmed: true,
//   storageRequestFulfilled: true,
//   fileKey: "0x...",
//   message: "File is securely stored in the DataHaven network."
// }
```

**仕組み:**
1. Storage Requestがオンチェーンに存在する場合 → まだ処理中
2. Storage Requestが存在しない場合 → Fulfilledされた（安全に保存済み）

### 9. 料金見積もり

DataHaven FAQの計算式に基づいてストレージコストを見積もります：

```
cost = pricePerGbPerBlock × (GB stored) × (number of replicas) × (number of blocks)
```

```typescript
import { 
  estimateStorageCost, 
  getStorageCostEstimateString 
} from '@/lib/datahaven/client';

// 詳細な見積もりを取得
const estimate = await estimateStorageCost(
  fileSizeBytes,   // ファイルサイズ（バイト）
  replicas,        // レプリカ数（デフォルト: 1）
  durationDays     // 保存期間（デフォルト: 30日）
);

console.log(estimate);
// {
//   totalCost: 123456789n,           // bigint
//   totalCostFormatted: "0.000123",  // 人間が読める形式
//   pricePerGbPerBlock: 1000n,
//   fileSizeGb: 0.001,
//   replicas: 1,
//   durationBlocks: 432000,
//   durationDays: 30
// }

// 簡単な文字列形式
const costString = await getStorageCostEstimateString(1024 * 1024, 1, 30);
// → "~0.000001 MOCK for 30 days"
```

**ブロック時間:**
- DataHavenは約6秒/ブロック
- 1日 ≈ 14,400ブロック
- 30日 ≈ 432,000ブロック

## VaultWatch カスタムフック

VaultWatchでは、上記のすべてのフローを `useDataHaven` フックにカプセル化しています：

```typescript
import { useDataHaven } from '@/hooks/useDataHaven';

const MyComponent = () => {
  const {
    isInitialized,
    isAuthenticated,
    isLoading,
    error,
    mspHealth,
    authenticate,
    createBucket,
    uploadFile,
    downloadFile,
    verifyFileStorage,    // NEW: ストレージ検証
    estimateCost,         // NEW: 料金見積もり
    getCostEstimateString, // NEW: 料金文字列
    checkHealth,
  } = useDataHaven();
  
  // ウォレット接続時に自動初期化
  // 必要に応じて authenticate() を呼び出し
  // createBucket(), uploadFile(), downloadFile() を使用
  
  // ファイルの安全性を検証
  const verification = await verifyFileStorage(fileKey, bucketId);
  if (verification?.isSecure) {
    console.log('✅ ファイルは安全に保存されています');
  }
  
  // アップロード前に料金を見積もる
  const cost = await getCostEstimateString(fileSize, 1, 30);
  console.log(`推定コスト: ${cost}`);
};
```

## エラーハンドリング

```typescript
import { 
  DataHavenError, 
  BucketCreationError, 
  FileUploadError 
} from '@/lib/datahaven/types';

try {
  await uploadFile(bucketId, fileName, data, 'commitment', address);
} catch (error) {
  if (error instanceof FileUploadError) {
    // ファイルアップロードエラー
    toast.error('ファイルのアップロードに失敗しました');
  } else if (error instanceof BucketCreationError) {
    // バケット作成エラー
    toast.error('バケットの作成に失敗しました');
  } else if (error instanceof DataHavenError) {
    // その他のDataHavenエラー
    toast.error(`エラー: ${error.message}`);
  }
}
```

## テストネット情報

| 項目 | 値 |
|------|-----|
| Chain ID | 55931 |
| Native Token | MOCK |
| RPC URL | https://services.datahaven-testnet.network/testnet |
| WSS URL | wss://services.datahaven-testnet.network/testnet |
| MSP URL | https://deo-dh-backend.testnet.datahaven-infra.network/ |
| Filesystem Contract | 0x0000000000000000000000000000000000000404 |
| File Size Limit | 5 MB |
| **Bucket Deposit** | **100 MOCK** |

### 🚨 Bucket Deposit（重要）

新しいバケットを作成するには **100 MOCK のデポジット** が必要です。

- デポジットは Substrate の **Reserved Balance** としてロックされます
- トランザクションに使用できるのは **Free Balance** のみ
- バケットを削除するとデポジットは返還されます（未確認）

**確認方法:**
```typescript
// Substrate側の残高確認
const account = await polkadotApi.query.system.account(address);
const { free, reserved } = account.data;
console.log(`Free: ${free}, Reserved: ${reserved}`);

// Bucket Deposit定数の確認
const deposit = polkadotApi.consts.providers.bucketDeposit;
console.log(`Required: ${deposit}`);
```

### Block Explorers

トランザクションやストレージリクエストの確認に利用できるエクスプローラー：

| エクスプローラー | URL | 対応層 | 検索方法 |
|----------------|-----|--------|---------|
| **DHScan** | https://testnet.dhscan.io/ | EVM層 | TXハッシュ (`0x...`) |
| **Basic Explorer** | https://datahaven-explorer.netlify.app/ | EVM層 | TXハッシュ (`0x...`) |
| **Statescan** | https://datahaven-testnet.statescan.io/#/ | Substrate層 | ブロック番号 |

**重要: Statescan について**

Statescan は Substrate層 のエクスプローラーです。DataHaven は EVM と Substrate の両方を持つため：

- **EVM トランザクションハッシュ** (`0x...`) → DHScan, Basic Explorer で検索
- **Substrate Extrinsics** → Statescan でブロック番号から検索

VaultWatchでは、トランザクション成功モーダルで各エクスプローラーへのリンクを提供しています。
Statescanはブロック番号でリンクするため、「Block View」と表示されます。

**使用例:**
- バケット作成トランザクションの確認 → DHScan
- StorageRequestFulfilledイベントの検索 → Statescan（ブロック番号）
- ファイルキーのオンチェーン状態確認 → DHScan

## データ整合性検証（Merkle検証）

### 概要

VaultWatchでは、DataHavenに保存されたデータの整合性をオンチェーンフィンガープリントと比較して検証します。これにより、データが改ざんされていないことを保証します。

### 検証フロー

```typescript
// 1. ファイルをダウンロード
const result = await downloadJsonFile<Project>(
  fileKey,
  { verify: true } // 検証を有効化
);

// 2. 検証結果を確認
if (result.verification.status === 'verified') {
  console.log('✅ データ整合性が確認されました');
} else {
  console.warn('⚠️ 検証失敗:', result.verification.reason);
}
```

### 実装詳細

**フィンガープリント計算**:
```typescript
// FileManagerを使用してSHA256ベースのフィンガープリントを計算
const fingerprint = await calculateFingerprint(blob);
```

**オンチェーンフィンガープリント取得**:
```typescript
// Polkadot APIでストレージリクエストからフィンガープリントを取得
const storageRequest = await polkadotApiInstance.query.fileSystem.storageRequests(fileKey);
const onChainFingerprint = storageRequest.unwrap().fingerprint.toString();
```

**比較・検証**:
```typescript
const isMatch = calculatedFingerprint === onChainFingerprint;
```

### UI統合

検証結果は `VerificationBadge` コンポーネントで視覚的に表示されます：

```typescript
import { VerificationBadge } from '@/components/ui/verification-badge';

<VerificationBadge 
  status={verificationStatus}
  size="sm"
  showLabel={false}
/>
```

**検証ステータス**:
- `verified` - 検証成功（緑色のチェックマーク）
- `pending` - 検証中（黄色のスピナー）
- `failed` - 検証失敗（赤色の警告）
- `unverified` - 検証未実行（グレー）
- `unavailable` - 検証不能（グレーの疑問符）

### パフォーマンス最適化

**非同期検証**:
- データは即座に表示され、検証はバックグラウンドで実行
- UIUXへの影響を最小限に抑制

**キャッシュ機能**:
- 検証結果は `localStorage` にキャッシュ
- ファイルキーとフィンガープリントの組み合わせでキャッシュキーを生成
- 有効期限: 1時間

```typescript
// キャッシュの使用
import { getVerificationCache, setVerificationCache } from '@/lib/datahaven/verification-cache';

const cached = getVerificationCache(fileKey, fingerprint);
if (cached && cached.expiresAt > Date.now()) {
  return cached.verified;
}
```

## オンチェーン所有権検証

### 概要

書き込み操作（コミットメント追加、ステータス更新）前に、オンチェーンでバケットの所有者を検証します。これにより、メタデータの改ざんがあっても書き込み操作をブロックできます。

### 実装

```typescript
// オンチェーンでバケット所有者を確認
const ownershipCheck = await verifyBucketOwnership(bucketId, address);
if (!ownershipCheck.isOwner) {
  throw new Error(`Access denied: ${ownershipCheck.reason}`);
}
```

**検証タイミング**:
- ✅ コミットメント追加時（`CommitmentForm.tsx`）
- ✅ ステータス更新時（`updateCommitmentStatus()`）

**検証方法**:
```typescript
// Polkadot APIでバケット情報を取得
const bucket = await polkadotApiInstance.query.providers.buckets(bucketId);
const bucketData = bucket.unwrap().toHuman();
const onChainOwner = bucketData.userId.toLowerCase();
const isOwner = onChainOwner === address.toLowerCase();
```

### UIUXへの影響

- **閲覧操作**: 影響なし（誰でも閲覧可能）
- **書き込み操作**: 最小限の影響（どのみちトランザクション待ちがあるため）

## 参考リンク

- [DataHaven 公式ドキュメント](https://docs.datahaven.xyz/)
- [DataHaven 公式サイト](https://datahaven.xyz/)
- [StorageHub SDK - Get Started](https://docs.datahaven.xyz/build/storagehub-sdk/get-started)
- [StorageHub SDK - Create a Bucket](https://docs.datahaven.xyz/build/storagehub-sdk/create-bucket)
- [StorageHub SDK - Upload a File](https://docs.datahaven.xyz/build/storagehub-sdk/upload-file)
- [StorageHub SDK - Retrieve Your Data](https://docs.datahaven.xyz/build/storagehub-sdk/retrieve-data)
