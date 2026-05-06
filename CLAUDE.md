# stock_frontend

## プロジェクト概要

`stock_backend`（Go/Gin）のフロントエンド。株価チャートの表示・ウォッチリスト管理・企業ロゴ分析を行う。

## 技術スタック

| 用途 | ライブラリ |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| APIクライアント | openapi-fetch |
| 型生成 | openapi-typescript |
| チャート | TradingView Lightweight Charts |
| スタイル | Tailwind CSS v4 |
| データ取得 | SWR |
| ドラッグ&ドロップ | @dnd-kit/core, @dnd-kit/sortable |
| UIコンポーネント | @base-ui/react, shadcn/ui |
| テスト | Vitest, @testing-library/react |

## ディレクトリ構成

```
.
├── app/                        # ページ・レイアウト（App Router）
├── components/                 # UIコンポーネント（View層）
│   ├── auth/                   # ログイン・サインアップ
│   ├── chart/                  # ローソク足・テクニカル指標
│   ├── layout/                 # Sidebar/Topbar/BottomNav 等のシェル
│   ├── logo/                   # ロゴ検出・企業分析
│   ├── providers/              # ThemeProvider 等のコンテキスト
│   ├── ui/                     # shadcn/ui ベースの汎用プリミティブ
│   └── watchlist/              # ウォッチリストパネル・並び替え
├── hooks/                      # カスタムフック（ViewModelに近い役割）
│   ├── useCandles.ts           # ローソク足データ取得
│   ├── useSymbols.ts           # 銘柄一覧取得
│   └── useWatchlist.ts         # ウォッチリスト操作
├── lib/
│   ├── api.ts                  # APIクライアント（openapi-fetch）
│   ├── auth.ts                 # 認証ヘルパー
│   ├── indicators.ts           # テクニカル指標の計算ロジック
│   ├── utils.ts                # `cn()` などの汎用ユーティリティ
│   └── generated/
│       └── schema.ts           # 自動生成の型定義（直接編集禁止）
└── openapi/
    └── openapi.yaml            # バックエンドAPI仕様（schema.ts の生成元）
```

※ ルート直下にフラットに配置している（`src/` 配下ではない）。インポートエイリアスは `@/*` → `./*`。

## アーキテクチャ方針

### コンポーネント戦略

- **Server Component をデフォルト**とし、インタラクションが必要な場合のみ `"use client"` を付与する
- ローソク足チャート・ウォッチリストは操作が多いため Client Component

| 機能 | 方式 |
|---|---|
| 銘柄一覧 | Server Component（SSR）|
| ローソク足チャート | Client Component |
| ウォッチリスト | Client Component |
| ロゴ検出・企業分析 | Client Component |

### 状態管理

- **選択中の銘柄・期間** → URL の searchParams で管理（ブックマーク・共有に対応）
- **サーバーデータ** → SWR（キャッシュ・ローディング・エラー管理）
- **認証トークン** → HttpOnly Cookie（`auth_token`）でサーバーが管理
- グローバル状態管理ライブラリ（Zustand等）は必要になったタイミングで追加する

### 層の役割

```
コンポーネント (components/)
    ↓ hooks を呼ぶ
カスタムフック (hooks/)
    ↓ api.ts を呼ぶ
APIクライアント (lib/api.ts)
    ↓
Go バックエンド
```

## API

- `NEXT_PUBLIC_API_BASE_URL` 環境変数でベースURLを管理
- 認証: Cookie 認証（`auth_token` HttpOnly Cookie）+ CSRF トークン（`csrf_token` Cookie）
- 状態変更リクエスト（POST/PUT/DELETE）は `X-CSRF-Token` ヘッダーが必要
- 型定義は `schema.ts` から自動生成されるため、補完・型エラーが有効

### 主要エンドポイント

| エンドポイント | 認証 | 用途 |
|---|---|---|
| `GET /healthz` | 不要 | ヘルスチェック |
| `POST /v1/signup` | 不要 | ユーザー登録 |
| `POST /v1/login` | 不要 | ログイン（Cookie発行） |
| `DELETE /v1/logout` | 不要 | ログアウト（Cookie削除） |
| `GET /v1/candles/{code}` | Cookie | ローソク足データ取得 |
| `GET /v1/symbols` | Cookie | アクティブ銘柄一覧 |
| `GET /v1/watchlist` | Cookie | ウォッチリスト取得 |
| `POST /v1/watchlist` | Cookie + CSRF | ウォッチリスト追加 |
| `DELETE /v1/watchlist/{code}` | Cookie + CSRF | ウォッチリスト削除 |
| `PUT /v1/watchlist/order` | Cookie + CSRF | ウォッチリスト並び替え |
| `POST /v1/logo/detect` | Cookie + CSRF | 画像からロゴ検出 |
| `POST /v1/logo/analyze` | Cookie + CSRF | 企業分析サマリー生成 |

## デザイン方針

- テーマ: ライト、ミニマル（WealthNavi・Linear を参考）
- テキスト: `#0f172a`
- 上昇・プラス: `#16a34a`
- 下落・マイナス: `#dc2626`

## コーディング規約

- API呼び出しは必ず `lib/api.ts` 経由で行う
- `lib/generated/` 以下は直接編集しない
- ロジックはカスタムフックに切り出し、コンポーネントは表示に専念させる
- 環境変数は `.env.local` で管理し、`.env.example` をリポジトリに含める

## よく使うコマンド

```bash
npm run dev           # 開発サーバー起動
npm run build         # 本番ビルド
npm run lint          # ESLint 実行
npm run test          # テスト実行（Vitest）
npm run test:watch    # テストウォッチモード
npm run generate:api  # openapi.yaml から schema.ts を再生成
```

## 型定義の再生成

バックエンドの `openapi.yaml` を更新したら以下を実行：

```bash
npm run generate:api
# = openapi-typescript openapi/openapi.yaml -o lib/generated/schema.ts
```

## コミット・PR作成の言語ルール

コミットメッセージおよびプルリクエストのタイトル・説明はすべて**日本語**で記述してください。

- コミット前のコードレビューは `/code-check` スキル（`.claude/skills/code-check/SKILL.md`）を参照

## Git ブランチ操作のルール

ブランチを切る・切り替える際は `git checkout` ではなく `git switch` を使用してください。

- 新しいブランチを作成して切り替える: `git switch -c <branch-name>`
- 既存のブランチに切り替える: `git switch <branch-name>`