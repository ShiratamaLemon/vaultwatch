# VaultWatch アーキテクチャ設計

## 概要

VaultWatchは、クリプトプロジェクトの透明性を検証可能な形で記録するプラットフォームです。
本ドキュメントでは、システム全体のアーキテクチャと各コンポーネントの責務を定義します。

## システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         クライアント                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Next.js Application                    │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │   │
│  │  │   Pages   │  │Components │  │   State (Zustand) │   │   │
│  │  │ (App Router)│  │ (React)  │  │                   │   │   │
│  │  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘   │   │
│  │        │              │                  │              │   │
│  │        └──────────────┼──────────────────┘              │   │
│  │                       │                                  │   │
│  │  ┌────────────────────┴────────────────────────────┐    │   │
│  │  │                 Custom Hooks                     │    │   │
│  │  │  useProject / useCommitment / useDataHaven      │    │   │
│  │  └────────────────────┬────────────────────────────┘    │   │
│  │                       │                                  │   │
│  │  ┌────────────────────┴────────────────────────────┐    │   │
│  │  │              Library Layer (lib/)               │    │   │
│  │  │  ┌─────────────────┐  ┌─────────────────────┐  │    │   │
│  │  │  │ DataHaven SDK   │  │   wagmi/viem        │  │    │   │
│  │  │  │ Wrapper         │  │   Configuration     │  │    │   │
│  │  │  │ - Verification  │  │   - WalletConnect   │  │    │   │
│  │  │  │ - Ownership     │  │   - Project ID      │  │    │   │
│  │  │  └────────┬────────┘  └──────────┬──────────┘  │    │   │
│  │  └───────────┼──────────────────────┼─────────────┘    │   │
│  └──────────────┼──────────────────────┼──────────────────┘   │
└─────────────────┼──────────────────────┼──────────────────────┘
                  │                      │
                  ▼                      ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│      DataHaven Network      │  │      Wallet Provider        │
│  ┌───────────────────────┐  │  │  (MetaMask, WalletConnect)  │
│  │   MSP (Storage)       │  │  │                             │
│  │   - File Upload       │  │  │  - Sign Transactions        │
│  │   - File Download     │  │  │  - SIWE Authentication      │
│  │   - Bucket Management │  │  │                             │
│  └───────────────────────┘  │  └─────────────────────────────┘
│  ┌───────────────────────┐  │
│  │   DataHaven Chain     │  │
│  │   - Merkle Root       │  │
│  │   - Storage Requests  │  │
│  │   - Fingerprints      │  │
│  │   - Bucket Registry   │  │
│  │   - Ownership Info    │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

## レイヤー構成

### 1. Presentation Layer（プレゼンテーション層）

**責務**: ユーザーインターフェースの表示とユーザー操作の受け付け

| ディレクトリ | 内容 |
|-------------|------|
| `src/app/` | Next.js App Router ページ |
| `src/components/` | 再利用可能なUIコンポーネント |

**主要コンポーネント**:
- `Header` - ナビゲーション、ウォレット接続
- `ProjectCard` - プロジェクト表示カード
- `ProjectTimeline` - コミットメントのタイムライン表示
- `CommitmentForm` - コミットメント登録フォーム

### 2. Application Layer（アプリケーション層）

**責務**: ビジネスロジックの実行、状態管理

| ディレクトリ | 内容 |
|-------------|------|
| `src/hooks/` | カスタムフック |
| `src/stores/` | Zustand ストア |

**主要フック**:
- `useProject` - プロジェクトCRUD操作
- `useCommitment` - コミットメントCRUD操作
- `useDataHaven` - DataHaven SDK操作のラッパー

**ストア**:
- `projectStore` - プロジェクト一覧、選択状態
- `uiStore` - UI状態（モーダル、ローディング等）

### 3. Infrastructure Layer（インフラストラクチャ層）

**責務**: 外部サービスとの通信

| ディレクトリ | 内容 |
|-------------|------|
| `src/lib/datahaven/` | DataHaven SDK ラッパー |
| `src/lib/wagmi/` | wagmi/viem 設定 |

## データフロー

### プロジェクト登録フロー

```
1. ユーザーがフォームに入力
   │
   ▼
2. フォームバリデーション（クライアント）
   │
   ▼
3. ウォレットで署名（SIWE認証）
   │
   ▼
4. DataHavenにバケット作成
   │
   ▼
5. プロジェクトメタデータをJSON化
   │
   ▼
6. DataHavenにファイルとしてアップロード
   │
   ▼
7. Merkleルートを取得・保存
   │
   ▼
8. ローカルインデックスを更新
   │
   ▼
9. UI更新（成功表示）
```

### コミットメント追加フロー

```
1. ユーザーがコミットメント情報を入力
   │
   ▼
2. フォームバリデーション
   │
   ▼
3. オンチェーン所有権検証（2026-01-27追加）
   │
   ├─ verifyBucketOwnership(bucketId, address)
   │
   ▼
4. コミットメントデータをJSON化
   │
   ▼
5. DataHavenにファイルとしてアップロード（1回目）
   │
   ├─ txHash, fileKey, blockNumberを取得
   │
   ▼
6. txHashを含めて再アップロード（2回目）
   │
   ├─ 永続的にtxHashが保存される
   │
   ▼
7. プロジェクトのバケットトライを更新
   │
   ▼
8. 新しいMerkleルートを取得
   │
   ▼
9. ローカルインデックスを更新
   │
   ▼
10. タイムライン表示を更新
```

### データ整合性検証フロー（Merkle検証）

```
1. ユーザーがプロジェクト/コミットメントを閲覧
   │
   ▼
2. DataHavenからファイルを取得（MSP）
   │
   ▼
3. フィンガープリントを計算（SHA256ベース）
   │
   ▼
4. オンチェーンフィンガープリントを取得（Polkadot API）
   │
   ├─ storageRequests(fileKey) から取得
   │
   ▼
5. フィンガープリントを比較
   │
   ▼
6. 検証結果を表示（非同期）
   ├── ✅ verified: データは改ざんされていない
   ├── ⏳ pending: 検証中
   ├── ❌ failed: 改ざんの可能性あり（警告表示）
   └── ❓ unavailable: 検証不能（オフライン等）
   
7. 検証結果をキャッシュ（localStorage）
   └─ 再検証を回避（有効期限: 1時間）
```

**実装ファイル**:
- `src/lib/datahaven/client.ts` - `verifyDataIntegrity()`, `calculateFingerprint()`
- `src/lib/datahaven/verification-cache.ts` - キャッシュ機能
- `src/components/ui/verification-badge.tsx` - UIコンポーネント

### オンチェーン所有権検証フロー

```
1. ユーザーが書き込み操作を実行
   ├─ コミットメント追加
   └─ ステータス更新
   │
   ▼
2. オンチェーンでバケット所有者を確認
   │
   ├─ polkadotApi.query.providers.buckets(bucketId)
   │
   ▼
3. 所有者アドレスを取得
   │
   ├─ bucketData.userId
   │
   ▼
4. 現在のウォレットアドレスと比較
   │
   ├─ onChainOwner.toLowerCase() === address.toLowerCase()
   │
   ▼
5. 検証結果に応じた処理
   ├── ✅ isOwner: 書き込み操作を実行
   └── ❌ !isOwner: エラーを返却（Access Denied）
```

**実装ファイル**:
- `src/lib/datahaven/client.ts` - `verifyBucketOwnership()`
- `src/hooks/useDataHaven.ts` - フック経由で公開
- `src/components/commitment/CommitmentForm.tsx` - コミットメント追加前検証

## コンポーネント設計

### ページコンポーネント

| ページ | パス | 責務 |
|--------|------|------|
| Home | `/` | ランディング、サービス紹介 |
| Projects | `/projects` | プロジェクト一覧表示・検索 |
| ProjectDetail | `/projects/[id]` | プロジェクト詳細・タイムライン |
| Register | `/register` | 新規プロジェクト登録 |
| Dashboard | `/dashboard` | ユーザーのプロジェクト管理 |
| AddCommitment | `/dashboard/[id]/add` | コミットメント追加 |

### 共有コンポーネント階層

```
components/
├── ui/                    # shadcn/ui（基本UI要素）
│   ├── Button
│   ├── Card
│   ├── Input
│   ├── Dialog
│   └── ...
│
├── layout/                # レイアウトコンポーネント
│   ├── Header            # ヘッダー（ナビ、ウォレット）
│   ├── Footer            # フッター
│   └── Container         # コンテンツラッパー
│
├── wallet/                # ウォレット関連
│   └── ConnectButton     # RainbowKit接続ボタン
│
├── project/               # プロジェクト関連
│   ├── ProjectCard       # プロジェクトカード
│   ├── ProjectList       # プロジェクト一覧
│   ├── ProjectForm       # 登録/編集フォーム
│   ├── ProjectTimeline   # タイムライン表示
│   └── ProjectSearch     # 検索UI
│
└── commitment/            # コミットメント関連
    ├── CommitmentCard    # コミットメントカード
    ├── CommitmentForm    # 登録フォーム
    ├── CommitmentList    # 一覧表示
    └── CommitmentBadge   # ステータスバッジ
```

## 状態管理戦略

### グローバル状態（Zustand）

```typescript
// projectStore
interface ProjectStore {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  addProject: (project: Project) => void;
}

// uiStore
interface UIStore {
  isConnectModalOpen: boolean;
  toasts: Toast[];
  
  // Actions
  openConnectModal: () => void;
  closeConnectModal: () => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
}
```

### ローカル状態（useState）

- フォーム入力値
- モーダルの開閉状態
- 一時的なUI状態

### サーバー状態

- DataHavenからのデータ取得はカスタムフック内で管理
- キャッシュはZustandストアで管理

## セキュリティ考慮事項

### 認証
- SIWE（Sign-In with Ethereum）による認証
- JWT トークンはメモリ内で管理（ローカルストレージに保存しない）

### データ検証
- すべてのDataHavenからのデータはMerkle証明で検証
- 検証失敗時は明確な警告を表示

### 入力バリデーション
- クライアントサイドでのバリデーション（Zod使用予定）
- XSS対策（Reactのデフォルトエスケープに加え、dangerouslySetInnerHTMLは使用禁止）

## パフォーマンス最適化

### コード分割
- Next.js App Routerの自動コード分割を活用
- 動的インポートで大きなコンポーネントを遅延ロード

### キャッシュ戦略
- DataHavenデータのローカルキャッシュ（Zustand + localStorage）
- 変更検知時のみ再取得

### 画像最適化
- Next.js Imageコンポーネントを使用
- WebP形式を優先

## エラーハンドリング

### エラー分類

| 種類 | 対応 |
|------|------|
| ネットワークエラー | リトライオプションを提示 |
| DataHavenエラー | 詳細メッセージを表示、サポートリンク |
| ウォレットエラー | ウォレット接続の再試行を促す |
| バリデーションエラー | フィールド単位でエラー表示 |

### Error Boundary

- ページレベルでError Boundaryを設置
- フォールバックUIを表示
- エラー報告オプションを提供
