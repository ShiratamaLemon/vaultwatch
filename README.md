# 🏛️ VaultWatch

**Crypto Projects' Promises, Permanently Recorded**

VaultWatchは、クリプトプロジェクトの透明性を検証可能な形で記録するプラットフォームです。
DataHaven分散型ストレージを活用し、プロジェクトの「約束」を改ざん不可能な形で保存します。

## 🎯 コンセプト

- **プロジェクト**が自らの約束（ロードマップ、トークノミクス等）を登録
- **DataHaven**に保存され、改ざん不可能なタイムスタンプが付与
- **投資家**は「約束 vs 実績」を追跡し、信頼性を評価

## ✨ 主な機能

- 🔐 ウォレット接続（RainbowKit）
- 📝 プロジェクト登録・管理
- 📜 コミットメント（約束）の記録
- 📊 タイムライン表示
- ✅ Merkle証明による検証

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Frontend** | Next.js 14 (App Router), TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Wallet** | RainbowKit, wagmi v2, viem |
| **Storage** | DataHaven SDK (@storagehub-sdk/*) |
| **State** | Zustand |

## 🚀 セットアップ

### 前提条件

- Node.js v22以上
- pnpm（推奨）

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
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

## 📁 ディレクトリ構造

```
src/
├── app/          # ページ（App Router）
│   ├── projects/     # プロジェクト一覧・詳細
│   ├── register/     # プロジェクト登録
│   └── dashboard/    # ダッシュボード
├── components/   # UIコンポーネント
│   ├── ui/           # shadcn/ui
│   ├── layout/       # レイアウト
│   ├── wallet/       # ウォレット関連
│   ├── project/      # プロジェクト関連
│   └── commitment/   # コミットメント関連
├── lib/          # ユーティリティ、SDK連携
│   ├── datahaven/    # DataHaven SDK
│   └── wagmi/        # wagmi設定
├── hooks/        # カスタムフック
├── stores/       # 状態管理（Zustand）
└── types/        # 型定義
```

## 📖 ドキュメント

- [アーキテクチャ設計](docs/ARCHITECTURE.md)
- [データモデル](docs/DATA_MODEL.md)
- [機能仕様](docs/FEATURES.md)
- [DataHaven連携ガイド](docs/DATAHAVEN_INTEGRATION.md)

## 🌐 DataHaven テストネット情報

| 項目 | 値 |
|------|-----|
| Chain ID | 55931 |
| RPC URL | https://services.datahaven-testnet.network/testnet |
| WSS URL | wss://services.datahaven-testnet.network/testnet |
| MSP URL | https://deo-dh-backend.testnet.datahaven-infra.network/ |

### Block Explorers

| エクスプローラー | URL |
|----------------|-----|
| DataHaven Testnet Explorer | https://testnet.dhscan.io/ |
| Basic Explorer | https://datahaven-explorer.netlify.app/ |
| Statescan | https://datahaven-testnet.statescan.io/#/ |

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照
