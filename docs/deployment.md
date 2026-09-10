# デプロイ

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

API ベース URL は `lib/api-base.ts` で共有し、次の箇所で使います。

| 箇所 | 影響 |
|---|---|
| `lib/api.ts` / `lib/api.server.ts` | ブラウザ・SSR の API リクエスト先 |
| `lib/auth-refresh.ts` の refresh URL | トークンローテーション先 |
| `proxy.ts` の CSP `connect-src` | ブラウザが接続を許可するオリジン |

未設定のままビルドすると `API_BASE` が空文字になり、全 API リクエストがフロントエンド自身へ飛んで機能しなくなります。CSP も同時に `connect-src 'self'` になるため、ブラウザ側では CSP 違反として現れず原因追跡が困難です。

この事故を防ぐため、`next.config.ts` は**ビルドフェーズで `NEXT_PUBLIC_API_BASE_URL` が未設定ならビルドを失敗させます**。`next.config.ts` 自体の検査はビルド時のみです。`npm run dev` と `npm run build` は事前の `doctor` でも環境変数を確認します。`next start` はビルド済みの値を使います。

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

[README に戻る](../README.md)
