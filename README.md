# 🏛️ VaultWatch

**Crypto Projects' Promises, Permanently Recorded**

VaultWatchは、クリプトプロジェクトの透明性を検証可能な形で記録するプラットフォームです。
DataHaven分散型ストレージを活用し、プロジェクトの「約束」を改ざん不可能な形で保存します。

## 📊 開発ステータス

| 状態 | 説明 |
|------|------|
| ✅ MVP完成 | コア機能が完成し、テストネットで動作確認済み |
| ✅ SDK統合完了 | 公式StorageHub SDKを使用した実装完了 |
| ✅ UI実装完了 | すべてのページ・コンポーネント実装済み |
| ✅ テストネット動作確認完了 | プロジェクト登録・コミットメント・ステータス更新が正常動作 |

## 🎯 コンセプト

- **プロジェクト**が自らの約束（ロードマップ、トークノミクス等）を登録
- **DataHaven**に保存され、改ざん不可能なタイムスタンプが付与
- **投資家**は「約束 vs 実績」を追跡し、信頼性を評価

## ✨ 主な機能

| 機能 | 説明 |
|------|------|
| 🔐 ウォレット接続 | RainbowKit（MetaMask, WalletConnect対応） |
| 📝 プロジェクト登録 | DataHavenへの保存、バケット作成 |
| 📜 コミットメント記録 | 約束の登録、2段階アップロードでtxHash永続化 |
| 🔄 ステータス更新 | In Progress / Completed / Delayed / Cancelled |
| 📊 タイムライン表示 | 時系列表示、重複排除 |
| 🔗 オンチェーンリンク | DHScanへのTXリンク、File Keyコピー機能 |
| ✅ データ検証 | Merkle証明による改ざん検知 |

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Frontend** | Next.js 14 (App Router), TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Wallet** | RainbowKit, wagmi v2, viem |
| **Storage** | DataHaven SDK (@storagehub-sdk/core, @storagehub-sdk/msp-client) |
| **State** | Zustand |

## 🏗️ アーキテクチャ

### 2段階アップロードの仕組み

コミットメントのtxHashを永続化するために採用した方式：

```
1. 最初のアップロード
   ├─ JSONデータをMSPに送信
   ├─ issueStorageRequest()でチェーンに記録
   └─ txHash, fileKey, blockNumberを取得

2. 2回目のアップロード
   ├─ 取得したtxHash等を含めてJSONを再作成
   ├─ 同じパスに再アップロード
   └─ 永続的にtxHashが保存される

3. データ読み込み時
   ├─ MSPからファイルリストを取得
   ├─ 同名ファイルはuploadedAtで最新を選択（重複排除）
   └─ txHashが含まれたコミットメントを表示
```

## 🚀 セットアップ

### 前提条件

- Node.js v22以上
- pnpm（推奨）
- MetaMask または WalletConnect対応ウォレット

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/ShiratamaLemon/vaultwatch.git
cd vaultwatch

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集

# 開発サーバーを起動
pnpm dev
```

### 環境変数

`.env.local` に以下を設定：

```
NEXT_PUBLIC_DATAHAVEN_RPC_URL=https://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_DATAHAVEN_WSS_URL=wss://services.datahaven-testnet.network/testnet
NEXT_PUBLIC_MSP_URL=https://deo-dh-backend.testnet.datahaven-infra.network/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### 使い方

1. **ウォレット接続**: 画面右上の「Connect Wallet」をクリック
2. **プロジェクト登録**: 「Register Project」からプロジェクト情報を入力（100 MOCKのデポジットが必要）
3. **コミットメント追加**: ダッシュボードから「Add Commitment」でロードマップ等を登録
4. **ステータス更新**: タイムラインのステータスバッジをクリックして進捗を更新
5. **検証**: DHScanリンクからオンチェーンデータを確認

## 📁 ディレクトリ構造

```
src/
├── app/              # ページ（App Router）
│   ├── projects/     # プロジェクト一覧・詳細
│   ├── register/     # プロジェクト登録
│   └── dashboard/    # ダッシュボード
├── components/       # UIコンポーネント
│   ├── ui/           # shadcn/ui
│   ├── layout/       # Header, Footer, Container
│   ├── project/      # ProjectCard, ProjectForm, ProjectList
│   └── commitment/   # CommitmentCard, CommitmentForm, StatusUpdateModal
├── lib/              # ユーティリティ、SDK連携
│   ├── datahaven/    # DataHaven SDK（client, explorer, types）
│   └── wagmi/        # wagmi設定
├── hooks/            # カスタムフック（useDataHaven）
├── stores/           # 状態管理（Zustand）
└── types/            # TypeScript型定義
```

## 📖 ドキュメント

- [アーキテクチャ設計](docs/ARCHITECTURE.md)
- [データモデル](docs/DATA_MODEL.md)
- [機能仕様](docs/FEATURES.md)
- [DataHaven連携ガイド](docs/DATAHAVEN_INTEGRATION.md)
- [現在のステータス](docs/CURRENT_STATUS.md)

## 🌐 DataHaven テストネット情報

| 項目 | 値 |
|------|-----|
| Chain ID | 55931 |
| RPC URL | https://services.datahaven-testnet.network/testnet |
| WSS URL | wss://services.datahaven-testnet.network/testnet |
| MSP URL | https://deo-dh-backend.testnet.datahaven-infra.network/ |

### Block Explorers

| エクスプローラー | URL | 用途 |
|----------------|-----|------|
| DHScan | https://testnet.dhscan.io/ | EVMトランザクション確認（メイン） |
| Basic Explorer | https://datahaven-explorer.netlify.app/ | シンプルなEVM確認 |
| Statescan | https://datahaven-testnet.statescan.io/#/ | Substrate層（ブロック番号で検索） |

### 重要: テストネット利用

- **Faucet**: https://faucet.datahaven-testnet.network/ （24時間に1回）
- **バケット作成**: 100 MOCKのデポジットが必要（Reserved Balanceとしてロック）

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照
