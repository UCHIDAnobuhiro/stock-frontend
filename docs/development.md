# 開発・検証

### Codex の worktree

Codex でこのプロジェクトのローカル環境を選んで worktree を作成すると、`.codex/environments/environment.toml` のセットアップスクリプトが自動実行されます。

1. `.worktreeinclude` がローカルチェックアウトの `.env.local` をコピーする
2. `.env.local` がなければ `.env.example` から作成する
3. `node_modules` がなければ `npm ci` を実行する
4. Node.js / npm のバージョンが不正なら、必要なバージョンを表示して初期化を停止する

Codex の上部ツールバーには「開発サーバー」と「検証」アクションが表示されます。「検証」は API 型同期、lint、型チェック、テスト、本番ビルドを直列実行します。依存関係を変更した場合は、その worktree で改めて `npm ci` を実行してください。

`doctor` はローカルでは Node.js / npm の両方を検査します。Node.js の最低バージョンは 24.18.0 とし、推奨バージョンへの更新だけでは引き上げません。Vercel が提供する 24.19.0 も対応範囲に含みます。Vercelではビルドランナーのnpm差異を許容しますが、Node.js・依存関係・環境変数の検査は継続します。

`npm run build` は `next build --webpack` を実行します。Next.js 16 の Turbopack は Codex sandbox 内で内部ポートを bind できない場合があるため、エージェントが worktree 内で確実に本番ビルドを検証できる構成にしています。開発サーバーは Codex のアクション（統合ターミナル）から通常どおり Turbopack で起動します。

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
どちらも直接編集せず、バックエンドの正本から同期してください。`check:api` と CI は、フロントエンドに置いた OpenAPI と生成型の同期を検証します。バックエンドの正本との一致は `sync:api` で同期して差分を確認します。

## テストの配置と役割

| 配置 | 検証すること |
| --- | --- |
| `lib/__tests__/` | 指標計算、Cookie・refresh、API ミドルウェア、SSR の返り値 |
| `hooks/__tests__/` | 入力検証・遷移、取得パラメータ、SWR の取得・楽観的更新・ロールバック |
| `components/**/__tests__/` | 選択・固定・表示範囲、モバイル表示、ダイアログ等の操作 |
| `app/__tests__/` | ページの fallback、エラー・空状態の表示 |
| `tests/support/` | テスト用の共通 Provider。アプリからは参照しない |

純粋関数の計算は入力と期待値で確認します。フックのリクエスト引数は API 境界で確認し、キャッシュ共有・SSR fallback・楽観的更新は実際の SWR を使って確認します。`createSWRWrapper()` はマウントごとにキャッシュを分離し、エラー後のバックグラウンド再試行を無効にします。

チャートのテストでは Canvas を描画するライブラリ境界をモックし、渡すデータとユーザー操作後の表示を検証します。ブラウザでの描画品質や実バックエンドとの接続を保証する E2E テストではありません。

```bash
# 関連するテストのみ
npm run test -- components/chart/__tests__/CandlestickChart.test.tsx

# 変更後の全体検証（リソース競合を避けて直列実行）
npm run verify

# CI が追加で実行する依存関係監査
npm audit --audit-level=high
```

`verify` は doctor → API 型同期確認 → lint → TypeScript → 全テスト → 本番ビルドを実行します。実バックエンドとの通信、ブラウザの目視確認、依存関係監査は含みません。

## 変更時のドキュメント更新

- 共通の実装規約・デザイン方針・コマンド変更は [AGENTS.md](../AGENTS.md) に反映します。
- 導入手順は [README](../README.md)、設計の説明は [アーキテクチャ](architecture.md)、本番環境は [デプロイ](deployment.md) を更新します。
- 依存関係の過去の判断は [更新記録](dependency-updates.md) に日付付きで残します。

[README に戻る](../README.md)
