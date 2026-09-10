# Stock View Frontend

株価チャート・ウォッチリスト・企業ロゴ分析を提供する Next.js フロントエンドです。Go の `stock_backend`（net/http + chi）と連携します。

**公開 URL:** [Stock View](https://www.stockviewapp.com)

## 主な機能

- メール・パスワードと Google / GitHub OAuth による認証、セッション更新
- 日足・週足・月足のローソク足チャート、SMA・ボリンジャーバンド、足の選択・固定
- 銘柄検索、ウォッチリストの追加・削除・並び替え、価格サマリー・スパークライン
- アップロード画像のロゴ検出と企業分析サマリー
- ライト / ダークテーマとモバイル対応

## ドキュメント

| 目的 | 参照先 |
| --- | --- |
| 実装規約・デザイン方針の正本 | [AGENTS.md](AGENTS.md) |
| 責務・依存方向・認証・チャートの設計 | [アーキテクチャ](docs/architecture.md) |
| worktree・API 型同期・テスト | [開発・検証](docs/development.md) |
| Vercel・環境変数・Cookie / CORS | [デプロイ](docs/deployment.md) |
| 過去の依存更新判断 | [依存関係の更新記録](docs/dependency-updates.md) |

## 技術構成

Next.js 16（App Router）/ React / TypeScript、Tailwind CSS v4、SWR、openapi-fetch / openapi-typescript、TradingView Lightweight Charts、@dnd-kit、@base-ui/react / shadcn/ui、Vitest / Testing Library を使用します。バージョンは `package.json` と `package-lock.json` を参照してください。

## セットアップ

### 前提条件

- Node.js 24.20.0（ローカル推奨のLTS、`.nvmrc` で固定。対応範囲は `>=24.18.0 <25`）
- npm 12.0.2
- `stock_backend` が起動済みであること（デフォルト: `http://localhost:8080`）

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/UCHIDAnobuhiro/stock-frontend.git
cd stock-frontend

# Volta を使用する場合（package.json のバージョンへ自動で切り替わる）
volta install node@24.20.0 npm@12.0.2

# nvm を使用する場合
nvm use
npm install --global npm@12.0.2

# 依存パッケージのインストール
npm ci

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して NEXT_PUBLIC_API_BASE_URL を設定

# Node.js / npm・依存関係・環境変数を確認
npm run doctor

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

## よく使うコマンド

```bash
npm run doctor        # Node/npm・依存関係・環境変数を確認
npm run setup:worktree # worktree の環境準備
npm run dev           # 開発サーバー
npm run build         # 本番ビルド
npm run start         # 本番サーバー
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test          # 全テスト
npm run test:watch    # テストのウォッチ
npm run sync:api      # バックエンドの OpenAPI を同期して型生成
npm run generate:api  # 同期済み OpenAPI から型生成
npm run check:api     # OpenAPI と生成型の同期確認
npm run verify        # doctor・API型・lint・型・テスト・ビルドを直列実行
```

`NEXT_PUBLIC_API_BASE_URL` はビルド時に確定します。変更した場合は再ビルドが必要です。`openapi/openapi.yaml` と `lib/generated/schema.ts` は直接編集せず、バックエンドから同期してください。
