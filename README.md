# Stock View Frontend (Next.js / App Router)

## 概要

**株式データ表示・ウォッチリスト管理フロントエンド**
Next.js（App Router）と TypeScript で構築し、`stock_backend`（Go / net/http + chi）と連携します。
株価チャートの表示・ウォッチリスト管理・企業ロゴ分析機能を提供します。

## 主な機能

- **ユーザー認証**

  - メールアドレス/パスワードによるサインアップ・ログイン・ログアウト
  - Cookie 認証（HttpOnly `auth_token`）+ Double Submit CSRF パターン
  - セッション切れの自動検知とダイアログ通知

- **株価チャート**

  - TradingView Lightweight Charts によるローソク足チャート
  - 時間足・取得件数の切り替え（URL の searchParams で管理）
  - ローディング・空状態のスケルトン表示

- **ウォッチリスト**

  - 銘柄の追加・削除
  - @dnd-kit によるドラッグ&ドロップ並び替え
  - SWR によるキャッシュとリアルタイム反映

- **企業ロゴ分析**

  - 画像のドラッグ&ドロップアップロードからロゴを検出
  - 検出した企業の AI 分析サマリーを表示（Gemini API）

- **テーマ切り替え**
  - ライト / ダーク モードの切り替え（next-themes）

---

## 技術スタック

| カテゴリ           | ライブラリ / ツール                        |
| ------------------ | ------------------------------------------ |
| フレームワーク     | Next.js 16（App Router）                   |
| 言語               | TypeScript                                 |
| スタイル           | Tailwind CSS v4                            |
| API クライアント   | openapi-fetch                              |
| 型生成             | openapi-typescript                         |
| データ取得         | SWR                                        |
| チャート           | TradingView Lightweight Charts             |
| ドラッグ&ドロップ  | @dnd-kit/core, @dnd-kit/sortable           |
| UI コンポーネント  | @base-ui/react, shadcn/ui, lucide-react    |
| テーマ             | next-themes                                |
| テスト             | Vitest, @testing-library/react             |

## ディレクトリ構成

```text
.
├── app/                              # ページ・レイアウト（App Router）
│   ├── layout.tsx                    # ルートレイアウト（フォント・テーマ・Tooltip）
│   ├── page.tsx                      # ダッシュボード（チャート表示）
│   ├── login/
│   │   └── page.tsx                  # ログインページ
│   └── signup/
│       └── page.tsx                  # サインアップページ
│
├── components/                       # UIコンポーネント（表示専任）
│   ├── auth/
│   │   ├── AuthPageShell.tsx         # 認証ページ共通レイアウト
│   │   ├── LoginForm.tsx             # ログインフォーム
│   │   └── SignupForm.tsx            # サインアップフォーム
│   ├── chart/
│   │   ├── CandlestickChart.tsx      # ローソク足チャート本体
│   │   ├── ChartContainer.tsx        # チャートのデータ取得・状態管理
│   │   ├── ChartEmpty.tsx            # データなし状態
│   │   ├── ChartSkeleton.tsx         # ローディングスケルトン
│   │   └── ChartToolbar.tsx          # 時間足・件数の切り替えUI
│   ├── layout/
│   │   ├── DashboardLayout.tsx       # ダッシュボード全体レイアウト
│   │   ├── Sidebar.tsx               # サイドバー（ウォッチリスト・ロゴ検索）
│   │   ├── Topbar.tsx                # トップバー（銘柄選択・テーマ切り替え）
│   │   ├── BottomNav.tsx             # モバイル用ボトムナビ
│   │   └── SessionExpiredDialog.tsx  # セッション切れダイアログ
│   ├── logo/
│   │   ├── LogoDropzone.tsx          # 画像ドラッグ&ドロップUI
│   │   ├── LogoDetectResults.tsx     # ロゴ検出結果リスト
│   │   ├── LogoSearchSheet.tsx       # ロゴ検索シート（モバイル）
│   │   └── CompanyAnalysisCard.tsx   # 企業分析サマリーカード
│   ├── watchlist/
│   │   ├── WatchlistPanel.tsx        # ウォッチリスト全体パネル
│   │   ├── WatchlistItem.tsx         # ウォッチリスト1件（ドラッグ対応）
│   │   ├── WatchlistAddButton.tsx    # 銘柄追加ボタン
│   │   └── WatchlistEmpty.tsx        # 空状態
│   ├── providers/
│   │   └── ThemeProvider.tsx         # next-themes プロバイダー
│   └── ui/                           # shadcn/ui 汎用コンポーネント群
│       ├── ThemeToggle.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── command.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── input-group.tsx
│       ├── popover.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── textarea.tsx
│       └── tooltip.tsx
│
├── hooks/                            # カスタムフック（ロジック・データ取得）
│   ├── useCandles.ts                 # ローソク足データ取得（SWR）
│   ├── useSymbols.ts                 # 銘柄一覧取得（SWR、app/page.tsx が渡す SSR 初期データでハイドレート）
│   ├── useWatchlist.ts               # ウォッチリスト操作（取得・追加・削除・並び替え）
│   ├── useSelectedSymbol.ts          # 選択中の銘柄（URL searchParams）
│   ├── useLogin.ts                   # ログイン処理
│   ├── useLogout.ts                  # ログアウト処理
│   ├── useSignup.ts                  # サインアップ処理
│   ├── useSessionExpiry.ts           # セッション切れ検知
│   ├── useLogoDetect.ts              # ロゴ検出処理
│   ├── useLogoAnalyze.ts             # 企業分析処理
│   └── __tests__/                    # フックのユニットテスト（Vitest）
│
├── lib/
│   ├── api.ts                        # API クライアント（openapi-fetch・CSRF ミドルウェア、ブラウザ専用）
│   ├── api.server.ts                 # Server Component 用 API 呼び出し（cookies() から Cookie ヘッダーを付与）
│   ├── auth.ts                       # CSRF トークン取得・JWT 検証ユーティリティ
│   ├── utils.ts                      # 汎用ユーティリティ（cn 等）
│   └── generated/
│       └── schema.ts                 # 自動生成の型定義（直接編集禁止）
│
├── openapi/
│   └── openapi.yaml                  # バックエンド API スキーマ（OpenAPI 3.0.3）
│
├── .env.example                      # 環境変数テンプレート
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── vitest.setup.ts
```

## 認証設計

### Cookie 認証 + Double Submit CSRF パターン

- **ログイン時**: バックエンドが `auth_token`（HttpOnly）と `csrf_token` の 2 つの Cookie を発行
- **認証済みリクエスト**: `credentials: "include"` で Cookie を自動送信
- **状態変更（POST / PUT / DELETE）**: `csrf_token` Cookie を読み取り `X-CSRF-Token` ヘッダーに付与
- **セッション切れ（401）**: `SESSION_EXPIRED_EVENT` カスタムイベントを発火し、ダイアログで通知

```
lib/api.ts（Client Component から使用）
  → credentials: "include"（全リクエスト、ブラウザが Cookie を自動送信）
  → X-CSRF-Token ヘッダー付与（POST / PUT / DELETE）
  → 401 検知 → SESSION_EXPIRED_EVENT 発火
```

**Server Component からの認証付きフェッチ**: `credentials: "include"` はブラウザ専用のオプションであり、Server Component（Node ランタイム）では Cookie が自動送信されない。銘柄一覧（`app/page.tsx`）は `lib/api.server.ts` の `fetchSymbolsServer()` が `next/headers` の `cookies()` から `auth_token` を明示的に読み取り、`Cookie` ヘッダーとして付与して `/v1/symbols` を取得する。取得結果は SWR の `SWRConfig` の `fallback` としてクライアントへ渡され、`useSymbols()` はマウント時点で即座にこのデータでハイドレートされる（初回ローディング状態を経由しない）。取得に失敗した場合は空配列を返し、クライアント側の再検証・セッション切れフローに委ねる。

### ルーティングガード（proxy.ts）

- `proxy.ts`（リポジトリルート）が全ページリクエストで `auth_token` Cookie の存在と exp（期限）を検査する
- `auth_token` は HttpOnly Cookie だが、proxy はサーバー側で実行されるため `request.cookies` から読み取れる

| 条件                                  | 挙動                 |
| ------------------------------------- | -------------------- |
| 未認証 × 保護ページ                   | `/login` へリダイレクト |
| 認証済み × `/login` `/signup`         | `/` へリダイレクト      |
| それ以外                              | 素通し                |

公開パスは `PUBLIC_PATHS`（`/login`, `/signup`）で列挙し、それ以外のパスはデフォルトで保護対象として扱う。

> **注意**: proxy の JWT チェックは署名検証を行わない UX 目的のルーティング制御であり、真の認可はバックエンド API が JWT 署名を検証して担う。proxy を通過しても API は 401 を返し得る。

役割分担: 初回遷移時のガードは `proxy.ts`、セッション滞在中の失効検知は `useSessionExpiry`（60 秒ポーリング + 401 イベント）が担う。

### 状態管理

| 状態               | 管理方法                                  |
| ------------------ | ----------------------------------------- |
| 選択中の銘柄・期間 | URL の searchParams（ブックマーク対応）   |
| サーバーデータ     | SWR（キャッシュ・ローディング・エラー）   |
| 認証トークン       | HttpOnly Cookie（サーバー管理）           |
| テーマ             | next-themes（localStorage）              |

## 層の役割

```
コンポーネント (components/)
    ↓ hooks を呼ぶ
カスタムフック (hooks/)
    ↓ lib/api.ts を呼ぶ（Client Component）
API クライアント (lib/api.ts)
    ↓
Go バックエンド (stock_backend)
```

例外: 銘柄一覧は `app/page.tsx`（Server Component）が `lib/api.server.ts` を直接呼んで初期データを取得し、SWR の `fallback` として `useSymbols()` に渡す（上記「Server Component からの認証付きフェッチ」参照）。

## セットアップ

### 前提条件

- Node.js 20 以上
- `stock_backend` が起動済みであること（デフォルト: `http://localhost:8080`）

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/UCHIDAnobuhiro/stock-frontend.git
cd stock-frontend

# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して NEXT_PUBLIC_API_BASE_URL を設定

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く。

## コマンド

```bash
npm run dev           # 開発サーバー起動
npm run build         # 本番ビルド
npm run start         # 本番サーバー起動
npm run lint          # ESLint 実行
npm run test          # テスト実行（Vitest）
npm run test:watch    # テストウォッチモード
npm run generate:api  # openapi.yaml から schema.ts を再生成
```

## 型定義の再生成

バックエンドの `openapi/openapi.yaml` を更新したら以下を実行：

```bash
npm run generate:api
# = openapi-typescript openapi/openapi.yaml -o lib/generated/schema.ts
```

生成先: `lib/generated/schema.ts`（直接編集禁止）
