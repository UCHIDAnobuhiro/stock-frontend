# stock_frontend

## プロジェクト概要

`stock_backend`（Go / net/http + chi）のフロントエンド。株価チャートの表示・ウォッチリスト管理・企業ロゴ分析を行う。

AGENTS.md を共通指示の正本とし、`CLAUDE.md` は `@AGENTS.md` で参照する。構成やコマンドを変更した場合は、このファイルの関連記述も更新する。

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
│   ├── api-base.ts             # API ベースURLの共有定義
│   ├── api.ts                  # APIクライアント（openapi-fetch、Client Component 用）
│   ├── api.server.ts           # Server Component 用APIフェッチ（cookies() からCookieヘッダーを付与）
│   ├── auth.ts                 # 認証ヘルパー
│   ├── auth-refresh.ts         # 401時のトークン更新・リクエスト再送
│   ├── indicators.ts           # テクニカル指標の計算ロジック
│   ├── utils.ts                # `cn()` などの汎用ユーティリティ
│   └── generated/
│       └── schema.ts           # 自動生成の型定義（直接編集禁止）
├── proxy.ts                    # 認証ルーティングガード・nonce ベース CSP
├── scripts/                    # 開発環境確認・OpenAPI 同期
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
| 銘柄一覧 | Server Component（SSR）で初期データ取得 + Client Component（SWR）でハイドレート |
| ローソク足チャート | Client Component |
| ウォッチリスト | Client Component |
| ロゴ検出・企業分析 | Client Component |

銘柄一覧は `WatchlistPanel` / `ChartToolbar` / `LogoSearchSheet` で共有するため、`app/page.tsx`（Server Component）が `lib/api.server.ts` の `fetchSymbolsServer()` で初回データを取得し、`SWRConfig` の `fallback` として渡す。正常な空配列も fallback に含める。認証情報がない場合や API のエラーレスポンスでは `null` が返り、fallback を設定せずクライアント側で取得する。`hooks/useSymbols.ts` は同じキー `/v1/symbols` を使う。fallback があっても再検証中は `isLoading` が true になり得るため、初期データの有無と区別する。

### 状態管理

- **選択中の銘柄・期間** → URL の searchParams で管理（ブックマーク・共有に対応）
- **サーバーデータ** → SWR（キャッシュ・ローディング・エラー管理）
- **認証トークン** → HttpOnly Cookie（`auth_token`・`refresh_token`）でサーバーが管理
- **CSRFトークン** → `csrf_token` Cookie を変更系リクエストの `X-CSRF-Token` ヘッダーへ付与
- グローバル状態管理ライブラリ（Zustand等）は必要になったタイミングで追加する

### 層の役割

```
コンポーネント (components/)
    ↓ hooks を呼ぶ
カスタムフック (hooks/)
    ↓ api.ts を呼ぶ（Client Component）
APIクライアント (lib/api.ts)
    ↓
Go バックエンド
```

例外: 銘柄一覧のみ `app/page.tsx`（Server Component）が `lib/api.server.ts` を直接呼び、`next/headers` の `cookies()` から `auth_token` を読み取って `Cookie` ヘッダーを明示的に付与する（`credentials: "include"` はブラウザ専用でサーバー側では機能しないため）。

## API

- `NEXT_PUBLIC_API_BASE_URL` 環境変数でベースURLを管理（**ビルド時にバンドルへインライン化されるため、ランタイム設定では反映されない**。未設定時は `next.config.ts` がビルドを失敗させる）
- 認証: Cookie 認証（`auth_token`・`refresh_token` HttpOnly Cookie）+ CSRF トークン（`csrf_token` Cookie）
- Cookie認証を使う状態変更リクエストと認証Cookieの更新・削除には `X-CSRF-Token` ヘッダーが必要
- クライアント側の保護APIが401を返した場合は `lib/auth-refresh.ts` が `/v1/auth/refresh` を呼び、成功時に元リクエストを1回再送する。同一クライアント内の refresh は共有し、refresh の409のみ1回再試行する。再送時は最新の CSRF Cookie を使う
- login・signup・logout・refresh・OAuth は自動 refresh の対象外。SSR の `fetchSymbolsServer()` も自動 refresh は行わない
- `proxy.ts` は Cookie の存在と期限による画面遷移制御を行い、JWT の署名検証・認可はバックエンドが担う。`refresh_token` と `csrf_token` があれば、アクセストークン期限切れでもクライアント側の復旧へ進める
- CSP の nonce は `proxy.ts` → `app/layout.tsx` → `ThemeProvider` に渡す。リクエストごとの nonce を前提とする動的レンダリングを維持する
- 型定義は `schema.ts` から自動生成されるため、補完・型エラーが有効

### 主要エンドポイント

| エンドポイント | 認証 | 用途 |
|---|---|---|
| `GET /healthz` | 不要 | ヘルスチェック |
| `POST /v1/signup` | 不要 | ユーザー登録 |
| `POST /v1/login` | 不要 | ログイン（Cookie発行） |
| `DELETE /v1/logout` | CSRF | ログアウト（Cookie削除・セッション失効） |
| `POST /v1/auth/refresh` | Refresh Cookie + CSRF | 認証Cookieのローテーション |
| `GET /v1/auth/oauth/{provider}` | 不要 | OAuthログイン開始（プロバイダーへリダイレクト） |
| `GET /v1/auth/oauth/{provider}/callback` | 不要 | OAuthコールバック（Cookie発行後フロントへリダイレクト） |
| `GET /v1/candles/{code}` | Cookie | ローソク足データ取得 |
| `GET /v1/quotes` | Cookie | 複数銘柄の価格サマリー取得 |
| `GET /v1/symbols` | Cookie | アクティブ銘柄一覧 |
| `GET /v1/watchlist` | Cookie | ウォッチリスト取得 |
| `POST /v1/watchlist` | Cookie + CSRF | ウォッチリスト追加 |
| `DELETE /v1/watchlist/{code}` | Cookie + CSRF | ウォッチリスト削除 |
| `PUT /v1/watchlist/order` | Cookie + CSRF | ウォッチリスト並び替え |
| `POST /v1/logo/detect` | Cookie + CSRF | 画像からロゴ検出 |
| `POST /v1/logo/analyze` | Cookie + CSRF | 企業分析サマリー生成 |

## デザイン方針

- テーマ: GitHubを参考にしたライト / ダークテーマ（デフォルトはダーク）
- ライトテーマのテキスト: `#1f2328`
- ライトテーマの上昇・プラス: `#1a7f37`
- ライトテーマの下落・マイナス: `#cf222e`
- ダークテーマの各色は `app/globals.css` の `.dark` トークンを正本とする

## コーディング規約

- アプリのデータ取得・更新は `lib/api.ts`（Client Component）または `lib/api.server.ts`（Server Component）経由で行う。refresh の内部通信は `lib/auth-refresh.ts` が担当し、OAuth 開始はリンクによるブラウザ遷移とする
- `lib/generated/` 以下は直接編集しない
- データ取得・操作のロジックはカスタムフックへ、指標計算などの純粋関数は `lib/` へ置く。表示に閉じた状態やイベント処理はコンポーネント内で扱える
- 環境変数は `.env.local` で管理し、`.env.example` をリポジトリに含める

## よく使うコマンド

```bash
npm run setup:worktree # worktree の環境準備と確認
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
npm run sync:api      # バックエンドの OpenAPI を同期して型を再生成
npm run verify        # doctor・API型同期確認・lint・型チェック・テスト・ビルドを直列実行
```

ドキュメントのみの変更は差分・参照先・記述の整合性を確認する。コード変更では影響範囲に応じた検証を行い、全体検証には `npm run verify` を使う。CI は加えて `npm audit --audit-level=high` を実行する（`verify` には含まれない）。実行できなかった検証は理由とともに報告する。

### Codex の worktree

- Codex のローカル環境設定は `.codex/environments/environment.toml` を使用する
- `.worktreeinclude` でローカルチェックアウトの `.env.local` を新しい Codex 管理 worktree へコピーする
- セットアップスクリプトは `.env.local` がなければ `.env.example` から作成し、`node_modules` がなければ `npm ci` を実行する
- ローカルの Node.js / npm が `package.json` の `engines` の許容範囲外の場合、初期化と `npm run doctor` は明示的に失敗する（Vercelではビルドランナーのnpm差異を許容）
- Codex 上部の「開発サーバー」「検証」アクションから、`npm run dev` と `npm run verify` を実行できる
- 本番ビルドは Codex sandbox 内での Turbopack のローカル bind 制約を避けるため、Next.js が公式対応する `--webpack` を使用する
- 検証はリソース競合によるテスト timeout を避けるため `npm run verify` で直列実行する

## 型定義の再生成

バックエンドの `api/openapi.yaml` がAPIコントラクトの正本。元のフロントエンドチェックアウトの隣に `stock-backend` をチェックアウトした状態で以下を実行する：

```bash
npm run sync:api
```

worktree からも Git の共通ディレクトリを基準に元のチェックアウトを解決する。別の場所にあるバックエンドを使う場合は `STOCK_BACKEND_DIR=/path/to/stock-backend npm run sync:api` とする。`openapi/openapi.yaml` と `lib/generated/schema.ts` は直接編集しない。

## コミット・PR作成の言語ルール

コミットメッセージおよびプルリクエストのタイトル・説明はすべて**日本語**で記述してください。

- コミット前のコードレビューは `code-check` スキルを参照（Claude Code: `.claude/skills/code-check/SKILL.md` / その他のエージェント: `.agents/skills/code-check/SKILL.md`）
- リポジトリ内の `code-check` は `.agents/skills/code-check/SKILL.md` を正本とし、Claude Code 用の `.claude/skills/code-check/SKILL.md` も同じ内容に更新する。

## Git ブランチ操作のルール

ブランチを切る・切り替える際は `git checkout` ではなく `git switch` を使用してください。

- 新しいブランチを作成して切り替える: `git switch -c <branch-name>`
- 既存のブランチに切り替える: `git switch <branch-name>`
