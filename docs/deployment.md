# デプロイ

フロントエンドはViteで `dist/` にビルドし、Vercelから静的配信します。`vercel.ts` はSPAの深いURLを `index.html` にrewriteし、全パスへCSPとセキュリティヘッダーを付けます。Next.jsのサーバー実行環境は必要ありません。

## 本番設定

VercelのFramework Presetは **Vite**、Production Branchは `main`、Output Directoryは `dist` に設定します。Environment VariablesのProductionに `VITE_API_BASE_URL=https://api.stockviewapp.com` を登録します。Previewは利用するAPIのURLを別途設定しますが、現状の認証制限は下記の通りです。旧 `NEXT_PUBLIC_API_BASE_URL` は参照しません。変数はビルド時にバンドルへ組み込まれ、変更後は再ビルドが必要です。未設定・不正URLではビルドが失敗し、`vercel.ts` は同じ変数のoriginをCSPの `connect-src` に使います。

```bash
npm ci
VITE_API_BASE_URL=https://api.stockviewapp.com npm run build
```

本番サイトは `https://www.stockviewapp.com`、APIは `https://api.stockviewapp.com` です。バックエンドは `COOKIE_DOMAIN=stockviewapp.com`、Secure、SameSite=LaxのCookieを発行し、CORSで `https://www.stockviewapp.com` と資格情報付きリクエストを許可します。同一サイトのサブドメインなのでこのCookie構成で認証できます。フロントエンドは `credentials: "include"` と `csrf_token` Cookie由来の `X-CSRF-Token` を使います。OAuth開始はAPIへのトップレベル遷移で、コールバック後は本番フロントへ戻ります。既存の本番Go設定は変更しません。

デプロイ後は直接アクセスした `/login` と `/signup`、共有した `/?symbol=...&interval=...`、OAuth、ログアウト、テーマ切り替え、CSPによるAPI接続を確認してください。この移行作業では本番デプロイを行いません。

## ローカル

`.env.local` に `VITE_API_BASE_URL=http://localhost:8080` を設定し、バックエンドを起動して `npm run dev` を実行します。Viteはポート3000を使用し、使用中なら別ポートへ自動変更せず停止します。`npm run build` と `npm run start` で静的成果物のローカルプレビューもできます。ローカルのVite開発サーバーはVercelのレスポンスヘッダーを付けません。

## Previewの制限

通常の `*.vercel.app` Previewは本番サイト `stockviewapp.com` と別サイトです。本番バックエンドのCookieを読めず、現在のCORS許可にも含まれません。そのためPreviewでの認証・API操作は検証対象外です。Previewで認証を試すには、同一サイトの固定サブドメインを用意してCookie・CORS・OAuth戻り先を合わせるか、独立したPreviewバックエンドを構成する別作業が必要です。今回その構成やバックエンド設定は変更しません。

[README に戻る](../README.md)
