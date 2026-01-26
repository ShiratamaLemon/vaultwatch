# VaultWatch データモデル定義

## 概要

本ドキュメントでは、VaultWatchで使用するデータモデルを定義します。
データはDataHavenにJSON形式で保存され、Merkleルートによってオンチェーンで検証可能になります。

## エンティティ関連図

```
┌─────────────────┐       1:N       ┌─────────────────────┐
│     Project     │────────────────▶│     Commitment      │
│                 │                 │                     │
│  - id           │                 │  - id               │
│  - name         │                 │  - projectId        │
│  - ownerAddress │                 │  - type             │
│  - bucketId     │                 │  - title            │
│  - ...          │                 │  - description      │
└─────────────────┘                 │  - targetDate       │
                                    │  - status           │
                                    │  - fileKey          │
                                    │  - merkleRoot       │
                                    │  - ...              │
                                    └─────────────────────┘
```

## データモデル詳細

### Project（プロジェクト）

プロジェクトの基本情報を保持するエンティティ。

```typescript
/**
 * プロジェクトカテゴリ
 */
type ProjectCategory =
  | 'defi'           // DeFi（分散型金融）
  | 'nft'            // NFT関連
  | 'gaming'         // ゲーム・GameFi
  | 'infrastructure' // インフラ・L1/L2
  | 'dao'            // DAO関連
  | 'social'         // ソーシャル
  | 'other';         // その他

/**
 * プロジェクトステータス
 */
type ProjectStatus =
  | 'active'         // アクティブ
  | 'inactive'       // 非アクティブ
  | 'archived';      // アーカイブ済み

/**
 * プロジェクト
 */
interface Project {
  /** 一意の識別子（UUID v4） */
  id: string;
  
  /** プロジェクト名 */
  name: string;
  
  /** プロジェクト概要（500文字以内） */
  description: string;
  
  /** カテゴリ */
  category: ProjectCategory;
  
  /** ステータス */
  status: ProjectStatus;
  
  /** 公式ウェブサイトURL */
  website: string;
  
  /** Twitter/X URL */
  twitter?: string;
  
  /** Discord URL */
  discord?: string;
  
  /** GitHub URL */
  github?: string;
  
  /** ロゴ画像URL（DataHavenに保存した場合はfileKey） */
  logoUrl?: string;
  
  /** 登録者のウォレットアドレス（checksummed） */
  ownerAddress: string;
  
  /** DataHavenのバケットID */
  bucketId: string;
  
  /** プロジェクトメタデータのファイルキー */
  fileKey: string;
  
  /** Merkleルート（検証用） */
  merkleRoot: string;
  
  /** 作成日時（Unix timestamp in milliseconds） */
  createdAt: number;
  
  /** 更新日時（Unix timestamp in milliseconds） */
  updatedAt: number;
}
```

### Commitment（コミットメント）

プロジェクトが公表した約束・計画を保持するエンティティ。

```typescript
/**
 * コミットメントタイプ
 */
type CommitmentType =
  | 'roadmap'        // ロードマップ・マイルストーン
  | 'tokenomics'     // トークノミクス（配分、アンロック等）
  | 'partnership'    // パートナーシップ・提携
  | 'team'           // チーム情報（メンバー追加、変更等）
  | 'funding'        // 資金関連（調達、使途等）
  | 'product'        // プロダクト・機能リリース
  | 'governance'     // ガバナンス関連
  | 'other';         // その他

/**
 * コミットメントステータス
 */
type CommitmentStatus =
  | 'pending'        // 未達成（進行中）
  | 'completed'      // 達成済み
  | 'delayed'        // 遅延
  | 'cancelled'      // キャンセル
  | 'modified';      // 変更（新しいコミットメントで置換）

/**
 * コミットメント
 */
interface Commitment {
  /** 一意の識別子（UUID v4） */
  id: string;
  
  /** 紐づくプロジェクトID */
  projectId: string;
  
  /** コミットメントタイプ */
  type: CommitmentType;
  
  /** タイトル（100文字以内） */
  title: string;
  
  /** 詳細説明（2000文字以内） */
  description: string;
  
  /** 達成予定日（Unix timestamp in milliseconds, optional） */
  targetDate?: number;
  
  /** 証拠URL（公式発表へのリンク等） */
  evidenceUrl?: string;
  
  /** 証拠のスナップショット（オプション、DataHavenに保存） */
  evidenceSnapshot?: string;
  
  /** ステータス */
  status: CommitmentStatus;
  
  /** ステータス変更理由（delayed, cancelled, modified時） */
  statusReason?: string;
  
  /** DataHavenのファイルキー */
  fileKey: string;
  
  /** Merkleルート（検証用） */
  merkleRoot: string;
  
  /** 登録者のウォレットアドレス */
  createdBy: string;
  
  /** 作成日時（Unix timestamp in milliseconds） */
  createdAt: number;
  
  /** 更新日時（Unix timestamp in milliseconds） */
  updatedAt: number;
}
```

### ProjectIndex（プロジェクトインデックス）

フロントエンド用のインデックスデータ。ローカルストレージまたはDataHavenに保存。

```typescript
/**
 * プロジェクトインデックスエントリ
 */
interface ProjectIndexEntry {
  /** プロジェクトID */
  id: string;
  
  /** プロジェクト名 */
  name: string;
  
  /** カテゴリ */
  category: ProjectCategory;
  
  /** ステータス */
  status: ProjectStatus;
  
  /** 登録者アドレス */
  ownerAddress: string;
  
  /** バケットID */
  bucketId: string;
  
  /** コミットメント数 */
  commitmentCount: number;
  
  /** 最終更新日時 */
  lastUpdated: number;
}

/**
 * プロジェクトインデックス（全体）
 */
interface ProjectIndex {
  /** バージョン（マイグレーション用） */
  version: number;
  
  /** プロジェクト一覧 */
  projects: ProjectIndexEntry[];
  
  /** 最終同期日時 */
  lastSyncedAt: number;
}
```

## DataHavenでの保存形式

### バケット構造

各プロジェクトは1つのDataHavenバケットを持ちます。

```
Bucket: project-{projectId}
├── metadata.json          # プロジェクトメタデータ
├── commitments/
│   ├── {commitmentId-1}.json
│   ├── {commitmentId-2}.json
│   └── ...
└── assets/                # オプション：画像等
    └── logo.png
```

### メタデータJSON形式

```json
{
  "version": "1.0",
  "type": "project",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Example Project",
    "description": "This is an example project",
    "category": "defi",
    "status": "active",
    "website": "https://example.com",
    "twitter": "https://twitter.com/example",
    "ownerAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "createdAt": 1706140800000,
    "updatedAt": 1706140800000
  },
  "signature": "0x..."
}
```

### コミットメントJSON形式

```json
{
  "version": "1.0",
  "type": "commitment",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "roadmap",
    "title": "Mainnet Launch",
    "description": "Launch mainnet in Q2 2024",
    "targetDate": 1719792000000,
    "evidenceUrl": "https://twitter.com/example/status/123456789",
    "status": "pending",
    "createdBy": "0x1234567890abcdef1234567890abcdef12345678",
    "createdAt": 1706140800000,
    "updatedAt": 1706140800000
  },
  "signature": "0x..."
}
```

## バリデーションルール

### Project

| フィールド | ルール |
|-----------|--------|
| name | 必須、3-100文字、英数字・記号・スペース |
| description | 必須、10-500文字 |
| category | 必須、定義済みの値のみ |
| website | 必須、有効なURL形式 |
| twitter | 任意、有効なTwitter URL形式 |
| ownerAddress | 必須、有効なEthereumアドレス形式 |

### Commitment

| フィールド | ルール |
|-----------|--------|
| title | 必須、5-100文字 |
| description | 必須、20-2000文字 |
| type | 必須、定義済みの値のみ |
| targetDate | 任意、未来の日付（pending時） |
| evidenceUrl | 任意、有効なURL形式 |
| status | 必須、定義済みの値のみ |

## インデックス戦略

### ローカルインデックス

- ブラウザのlocalStorageに保存
- プロジェクト一覧の高速表示に使用
- DataHavenとの同期はバックグラウンドで実行

### 同期ロジック

```
1. アプリ起動時
   │
   ├── ローカルインデックスが存在する場合
   │   └── ローカルインデックスを即時表示
   │
   └── バックグラウンドでDataHavenと同期
       ├── 新規プロジェクトを追加
       ├── 更新されたプロジェクトを反映
       └── ローカルインデックスを更新

2. プロジェクト登録/更新時
   ├── DataHavenに保存
   ├── ローカルインデックスを即時更新
   └── UI更新
```

## マイグレーション

データモデルのバージョンアップ時は、以下の手順でマイグレーションを実施：

1. 新バージョンのスキーマを定義
2. マイグレーション関数を実装
3. 旧データ読み込み時に自動マイグレーション
4. DataHaven上のデータは新形式で再保存

```typescript
// マイグレーション例
function migrateProjectV1ToV2(v1Data: ProjectV1): ProjectV2 {
  return {
    ...v1Data,
    // 新フィールドのデフォルト値
    status: 'active',
    version: 2,
  };
}
```
