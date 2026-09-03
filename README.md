# Stock View Frontend (Next.js / App Router)

**公開URL:** [https://www.stockviewapp.com](https://www.stockviewapp.com)

## 概要

**株式データ表示・ウォッチリスト管理フロントエンド**
Next.js（App Router）と TypeScript で構築し、`stock_backend`（Go / net/http + chi）と連携します。
株価チャートの表示・ウォッチリスト管理・企業ロゴ分析機能を提供します。

## 主な機能

- **ユーザー認証**

  - メールアドレス/パスワードによるサインアップ・ログイン・ログアウト
  - Google / GitHub OAuth ログイン
  - Cookie 認証（HttpOnly `auth_token`・`refresh_token`）+ Double Submit CSRF パターン
  - アクセストークン期限切れ時の自動更新とリクエスト再送
  - セッション切れの自動検知とダイアログ通知

- **株価チャート**

  - TradingView Lightweight Charts によるローソク足チャート
  - 時間足の切り替え（URL の searchParams で管理、取得件数は各時間足200本）
  - ローディング・空状態のスケルトン表示

- **ウォッチリスト**

  - 銘柄の追加・削除
  - @dnd-kit によるドラッグ&ドロップ並び替え
  - SWR によるキャッシュとオプティミスティック更新

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
├── components/                       # UIコンポーネント（View層）
│   ├── auth/
│   │   ├── AuthPageShell.tsx         # 認証ページ共通レイアウト
│   │   ├── LoginForm.tsx             # ログインフォーム
│   │   ├── OAuthButtons.tsx           # Google / GitHub OAuth 導線
│   │   └── SignupForm.tsx            # サインアップフォーム
│   ├── chart/
│   │   ├── CandlestickChart.tsx      # ローソク足チャート本体
│   │   ├── ChartContainer.tsx        # チャートのデータ取得・状態管理
│   │   ├── ChartEmpty.tsx            # データなし状態
│   │   ├── IndicatorToolbar.tsx       # テクニカル指標の切り替えUI
│   │   ├── ChartSkeleton.tsx         # ローディングスケルトン
│   │   └── ChartToolbar.tsx          # 銘柄情報・時間足の切り替えUI
│   ├── layout/
│   │   ├── DashboardLayout.tsx       # ダッシュボード全体レイアウト
│   │   ├── Sidebar.tsx               # ウォッチリスト用サイドバー
│   │   ├── Topbar.tsx                # トップバー（テーマ・ロゴ検索・ログアウト）
│   │   ├── BottomNav.tsx             # モバイル用ボトムナビ
│   │   └── SessionExpiredDialog.tsx  # セッション切れダイアログ
│   ├── logo/
│   │   ├── LogoDropzone.tsx          # 画像ドラッグ&ドロップUI
│   │   ├── LogoDetectResults.tsx     # ロゴ検出結果リスト
│   │   ├── LogoSearchSheet.tsx       # レスポンシブなロゴ検索シート
│   │   └── CompanyAnalysisCard.tsx   # 企業分析サマリーカード
│   ├── watchlist/
│   │   ├── WatchlistPanel.tsx        # ウォッチリスト全体パネル
│   │   ├── WatchlistItem.tsx         # ウォッチリスト1件（ドラッグ対応）
│   │   ├── WatchlistSparkline.tsx    # 銘柄ごとの価格推移
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
│   ├── useQuotes.ts                  # 複数銘柄の価格サマリー取得（SWR）
│   ├── useSymbols.ts                 # 銘柄一覧取得（SWR、app/page.tsx が渡す SSR 初期データでハイドレート）
│   ├── useWatchlist.ts               # ウォッチリスト操作（取得・追加・削除・並び替え）
│   ├── useDefaultWatchlistSymbol.ts  # URL未指定時の初期銘柄選択
│   ├── useIndicators.ts              # テクニカル指標の表示状態
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
│   ├── auth-refresh.ts               # 401時のトークン更新・リクエスト再送
│   ├── indicators.ts                 # テクニカル指標の計算ロジック
│   ├── utils.ts                      # 汎用ユーティリティ（cn 等）
│   └── generated/
│       └── schema.ts                 # 自動生成の型定義（直接編集禁止）
│
├── openapi/
│   └── openapi.yaml                  # バックエンド API スキーマ（OpenAPI 3.0.3）
│
├── .env.example                      # 環境変数テンプレート
├── next.config.ts
├── proxy.ts                           # 認証ルーティングガード・CSP
├── tsconfig.json
├── vitest.config.ts
└── vitest.setup.ts
```

## 認証設計

### Cookie 認証 + Double Submit CSRF パターン

- **ログイン時**: バックエンドが `auth_token`・`refresh_token`（ともに HttpOnly）と `csrf_token` の 3 つの Cookie を発行
- **Cookie の有効期限**: `auth_token` は 10 分、`refresh_token` と `csrf_token` はともに 30 日。refresh API は `refresh_token`・`csrf_token`・`X-CSRF-Token` を必須とするため、`csrf_token` の消失は refresh 不可を意味する
- **認証済みリクエスト**: `credentials: "include"` で Cookie を自動送信
- **状態変更（GET / HEAD / OPTIONS 以外）**: `csrf_token` Cookie を読み取り `X-CSRF-Token` ヘッダーに付与
- **アクセストークン期限切れ（401）**: `refresh_token` と CSRF トークンで Cookie をローテーションし、元リクエストを1回再送
- **セッション切れ**: refresh後も最終的に401となった場合、`SESSION_EXPIRED_EVENT` を発火してダイアログで通知

```
lib/api.ts（Client Component から使用）
  → credentials: "include"（全リクエスト、ブラウザが Cookie を自動送信）
  → X-CSRF-Token ヘッダー付与（GET / HEAD / OPTIONS 以外）
  → 保護APIから401
      → POST /v1/auth/refresh（同時実行は単一化、409は1回再試行）
      → 成功: ローテーション後のCookieで元リクエストを1回再送
      → refresh非成功で元の401を返す、または再送後も401: SESSION_EXPIRED_EVENT 発火
```

**Server Component からの認証付きフェッチ**: `credentials: "include"` はブラウザ専用のオプションであり、Server Component（Node ランタイム）では Cookie が自動送信されない。銘柄一覧（`app/page.tsx`）は `lib/api.server.ts` の `fetchSymbolsServer()` が `next/headers` の `cookies()` から `auth_token` を明示的に読み取り、`Cookie` ヘッダーとして付与して `/v1/symbols` を取得する。取得結果は SWR の `SWRConfig` の `fallback` としてクライアントへ渡され、`useSymbols()` はマウント時点で即座にこのデータでハイドレートされる（初回ローディング状態を経由しない）。取得に失敗した場合は空配列を返し、クライアント側の再検証・セッション切れフローに委ねる。

### ルーティングガード（proxy.ts）

- `proxy.ts`（リポジトリルート）が全ページリクエストで `auth_token` Cookie の存在と exp（期限）を検査する
- 有効な `auth_token` がなくても、`refresh_token` と `csrf_token` が揃っていればクライアント側で更新できるセッションとして扱う
- `auth_token` は HttpOnly Cookie だが、proxy はサーバー側で実行されるため `request.cookies` から読み取れる

| 条件                                  | 挙動                 |
| ------------------------------------- | -------------------- |
| 有効なアクセストークンなし・refresh不可 × 保護ページ | `/login` へリダイレクト |
| 有効なアクセストークンあり × `/login` `/signup`      | `/` へリダイレクト      |
| refresh可能なセッション、または上記以外              | 素通し                  |

公開パスは `PUBLIC_PATHS`（`/login`, `/signup`）で列挙し、それ以外のパスはデフォルトで保護対象として扱う。

> **注意**: proxy の JWT チェックは署名検証を行わない UX 目的のルーティング制御であり、真の認可はバックエンド API が JWT 署名を検証して担う。proxy を通過しても API は 401 を返し得る。

役割分担: 初回遷移時のガードは `proxy.ts`、セッション滞在中の失効検知は `useSessionExpiry`（60 秒ポーリング + 401 イベント）が担う。

### 状態管理

| 状態               | 管理方法                                  |
| ------------------ | ----------------------------------------- |
| 選択中の銘柄・期間 | URL の searchParams（ブックマーク対応）   |
| サーバーデータ     | SWR（キャッシュ・ローディング・エラー）   |
| 認証トークン       | `auth_token`・`refresh_token` HttpOnly Cookie（サーバー管理） |
| CSRFトークン       | `csrf_token` Cookie + `X-CSRF-Token`ヘッダー |
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

- Node.js 24.18.0（LTS、`.nvmrc` で固定）
- npm 12.0.1
- `stock_backend` が起動済みであること（デフォルト: `http://localhost:8080`）

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/UCHIDAnobuhiro/stock-frontend.git
cd stock-frontend

# Volta を使用する場合（package.json のバージョンへ自動で切り替わる）
volta install node@24.18.0 npm@12.0.1

# nvm を使用する場合
nvm use
npm install --global npm@12.0.1

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

### Codex の worktree

Codex でこのプロジェクトのローカル環境を選んで worktree を作成すると、`.codex/environments/environment.toml` のセットアップスクリプトが自動実行されます。

1. `.worktreeinclude` がローカルチェックアウトの `.env.local` をコピーする
2. `.env.local` がなければ `.env.example` から作成する
3. `node_modules` がなければ `npm ci` を実行する
4. Node.js / npm のバージョンが不正なら、必要なバージョンを表示して初期化を停止する

Codex の上部ツールバーには「開発サーバー」と「検証」アクションが表示されます。「検証」は API 型同期、lint、型チェック、テスト、本番ビルドを直列実行します。依存関係を変更した場合は、その worktree で改めて `npm ci` を実行してください。

`doctor` はローカルでは Node.js / npm の両方を検査します。Vercelではビルドランナーのnpm差異を許容しますが、Node.js・依存関係・環境変数の検査は継続します。

`npm run build` は `next build --webpack` を実行します。Next.js 16 の Turbopack は Codex sandbox 内で内部ポートを bind できない場合があるため、エージェントが worktree 内で確実に本番ビルドを検証できる構成にしています。開発サーバーは Codex のアクション（統合ターミナル）から通常どおり Turbopack で起動します。

## コマンド

```bash
npm run doctor        # Node/npm・依存関係・環境変数を確認
npm run dev           # 開発サーバー起動
npm run build         # 本番ビルド
npm run start         # 本番サーバー起動
npm run lint          # ESLint 実行
npm run typecheck     # TypeScript 型チェック
npm run test          # テスト実行（Vitest）
npm run test:watch    # テストウォッチモード
npm run generate:api  # openapi.yaml から schema.ts を再生成
npm run check:api     # schema.ts が OpenAPI と同期しているか確認
npm run verify        # CI相当の検証を直列実行
npm run sync:api      # バックエンドの OpenAPI を同期して型を再生成
```

## 型定義の再生成

バックエンドの `api/openapi.yaml` が API コントラクトの正本です。
バックエンドを同じ親ディレクトリにチェックアウトした状態で、以下を実行します。

```bash
npm run sync:api
```

`STOCK_BACKEND_DIR` を設定すると、別の場所にあるバックエンドも指定できます。

```bash
STOCK_BACKEND_DIR=/path/to/stock-backend npm run sync:api
```

同期先は `openapi/openapi.yaml`、生成先は `lib/generated/schema.ts` です。
どちらも直接編集せず、バックエンドの正本から同期してください。CIでは正本との完全一致と生成漏れを検証します。

## デプロイ

### デプロイ先

フロントエンドの本番デプロイ先には **Vercel** を使用します。

- Next.js の App Router、動的レンダリング、`proxy.ts` を追加設定なしで実行できる
- GitHub と連携すると、Pull Request ごとの Preview Deployment と `main` の Production Deployment が自動作成される
- CDN、HTTPS 証明書、ビルドキャッシュを個別に構築する必要がない

Go バックエンドは Vercel とは別に、HTTPS で公開された環境へデプロイします。フロントエンドから直接 API を呼ぶため、後述する Cookie / CORS 設定も必要です。

### Vercel へのデプロイ手順

1. バックエンドをデプロイし、HTTPS の API URL（例: `https://api.example.com`）を確定する
2. [Vercel](https://vercel.com/) で **Add New Project** を選び、この GitHub リポジトリを Import する
3. Framework Preset が `Next.js`、Production Branch が `main` であることを確認する
4. Project Settings の Environment Variables に、次の変数を Production と Preview の両方へ登録する

   | 変数 | 値の例 | 評価タイミング |
   |---|---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://api.example.com` | ビルド時（ランタイムでの変更不可） |

5. **Deploy** を実行する。以後は `main` への push で本番、Pull Request の push で Preview が自動デプロイされる
6. 発行された HTTPS URL でログイン、株価データ取得、ログアウトが成功することを確認する

ローカルからデプロイする場合は、リポジトリルートで以下を実行します。初回実行時は Vercel のプロジェクト選択と連携設定を求められます。

```bash
# Production と同じ環境変数でローカルビルドを検証
npm ci
NEXT_PUBLIC_API_BASE_URL=https://api.example.com npm run build

# Preview Deployment
npx vercel@latest

# Production Deployment
npx vercel@latest --prod
```

> Preview Deployment の URL はブランチごとに変わります。Preview でも認証機能を検証する場合は、使用する Preview のオリジンをバックエンドの CORS 許可リストへ追加してください。

### 環境変数はビルド時に必要

`NEXT_PUBLIC_API_BASE_URL` は `NEXT_PUBLIC_` プレフィックスを持つため、**Next.js のビルド時にバンドルへ文字列としてインライン化されます**。ランタイムの環境変数では上書きできません。

```bash
# 正しい: ビルド時に渡す
NEXT_PUBLIC_API_BASE_URL=https://api.example.com npm run build
npm run start

# 誤り: ランタイムにだけ渡してもビルド成果物には反映されない
npm run build
NEXT_PUBLIC_API_BASE_URL=https://api.example.com npm run start
```

インライン化される箇所は以下の 3 つです。

| 箇所 | 影響 |
|---|---|
| `lib/api.ts` の `API_BASE` | 全 API リクエストのベース URL |
| `lib/auth-refresh.ts` の refresh URL | トークンローテーション先 |
| `proxy.ts` の CSP `connect-src` | ブラウザが接続を許可するオリジン |

未設定のままビルドすると `API_BASE` が空文字になり、全 API リクエストがフロントエンド自身へ飛んで機能しなくなります。CSP も同時に `connect-src 'self'` になるため、ブラウザ側では CSP 違反として現れず原因追跡が困難です。

この事故を防ぐため、`next.config.ts` は**ビルドフェーズで `NEXT_PUBLIC_API_BASE_URL` が未設定ならビルドを失敗させます**。`next start` / `next dev` では検査しません（ビルド成果物に焼き込み済みのため、起動時には不要）。

### `output: "standalone"` を設定しない理由

現在のデプロイ先は Vercel であり、Vercel が Next.js のビルド成果物と実行環境を管理するため、`next.config.ts` に `output: "standalone"` は設定しません。

将来 Cloud Run などへコンテナとしてセルフホストする場合は、イメージへ `node_modules` 全体を含めないよう `output: "standalone"` を有効化し、`.next/standalone` と `.next/static` をランタイムイメージへコピーします。その移行時には Dockerfile の追加と、`node .next/standalone/server.js` での起動確認も行ってください。

### Docker でビルドする場合

`ARG` と `--build-arg` で渡します。`ENV` だけを設定してもビルド前に評価されなければ意味がありません。

```dockerfile
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build
```

```bash
docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com .
```

1 つのイメージを複数環境で使い回したい場合、この構成では実現できません。`NEXT_PUBLIC_` を使わないランタイム設定方式（Server Component からの受け渡し等）への変更が必要です。

### バックエンド側に必要な設定

フロントエンドとバックエンドが別オリジンになる構成では、Cookie 認証のために以下が必要です。

- 認証 Cookie が `SameSite=None; Secure` で発行されていること
- `Access-Control-Allow-Credentials: true` が返ること
- `Access-Control-Allow-Origin` にフロントエンドのオリジンが設定されていること（`*` は資格情報付きリクエストで使用不可）
- **フロントエンド・バックエンドともに HTTPS であること**（`Secure` Cookie はHTTPS でのみ送信される）

フロントエンドとバックエンドを同一サイトのサブドメイン（例: `app.example.com` / `api.example.com`）に置く場合は、`SameSite=Lax` + `Domain=.example.com` でも動作します。

### レンダリングモード

`app/layout.tsx` が `headers()` から CSP の nonce を読み取るため、**全ページが動的レンダリング**になります（`npm run build` の出力で `ƒ (Dynamic)` と表示されます）。

nonce はリクエストごとに変わるため静的生成とは原理的に両立しません。静的配信のみのホスティング（`next export` 相当）にはデプロイできず、Node.js ランタイムが必要です。
