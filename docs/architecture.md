# アーキテクチャ

実装規約と画面仕様の正本は [AGENTS.md](../AGENTS.md) です。この文書はコードを読む際の責務とデータの流れを説明します。

## 責務と依存方向

```text
index.html → app/main.tsx → app/routes.tsx（React Router）
                                ↓
components/ ── hooks/ ── lib/api.ts ── lib/auth-refresh.ts ── Go バックエンド
     └─────────── lib/market-data.ts / lib/indicators.ts
```

`app/` はSPAのルートとページ、`components/` は表示、`hooks/` は取得・操作、`lib/` はAPI通信と純粋関数を担当します。ルート直下の構成と `@/*` → `./*` のエイリアスを維持します。ESLintは上位層への逆向き参照と、コンポーネントからAPIクライアントへの直接アクセスを防ぎます。型はOpenAPIから `lib/generated/schema.ts` に生成し、直接編集しません。

`LogoSearchSheet` は初回オープン時に `React.lazy` で検索内容を読み込みます。銘柄一覧は `useSymbols` が `/v1/symbols` のSWRキーを共有し、チャート取得は一覧を待ちません。

## 状態管理

| 状態 | 所有者 |
| --- | --- |
| 選択銘柄・時間足 | `useSelectedSymbol` とURLの `symbol` / `interval` |
| 銘柄一覧・ローソク足・価格サマリー・ウォッチリスト | SWR |
| 認証トークン | バックエンドが発行するHttpOnly Cookie |
| CSRFトークン | `csrf_token` Cookie → `X-CSRF-Token` ヘッダー |
| テーマ | `ThemeProvider`、`localStorage`、描画前の `public/theme-init.js` |
| 指標の有効状態 | `useIndicators` のReact state |
| ウォッチリスト表示形式・サイドバーのスクロール位置 | `Sidebar` |
| チャートの選択足・固定状態・表示範囲 | `useCandlestickChart` |

`useSelectedSymbol` はReact RouterのURLと履歴へ反映します。連続した銘柄・時間足操作は最新URLを参照し、別のクエリとhashを保ちます。戻る・進む操作にも追従します。

## 認証とCSP

`app/routes.tsx` は既存の `GET /v1/watchlist` を認証確認に使います。401なら保護画面からログインへ、成功なら認証済みとして公開画面からホームへ移ります。一時障害では保護画面に再試行を表示し、公開画面ではログイン・登録フォームとOAuth入口を利用可能にします。認証確認中もホームの取得を並列に開始し、URL指定のチャートを待たせません。認可はGoバックエンドが行います。

ブラウザ用 `lib/api.ts` はCookieを送信し、安全メソッド以外にCSRFヘッダーを付けます。401時は `lib/auth-refresh.ts` がrefreshを共有し、409のみ一度再試行します。成功時は最新CSRF Cookieで元リクエストを一度再送します。refreshの401/403は失効として扱い、5xx・通信失敗・再409は一時障害の503として扱います。一時障害ではセッション切れイベントを発火しません。login・signup・logout・refresh・OAuthは自動refreshの対象外です。

ログイン成功時にはSWRキャッシュを破棄してwatchlistの認証確認を再実行し、ホームへ移ります。認証確認が一時的に失敗してもログイン失敗として表示せず、ホームで再試行を促します。ログアウト成功時は全キャッシュの破棄を待ってからログインへ移ります。ログアウトが失敗した場合はCookieが残り得るため画面を維持して再試行を促します。利用中の失効は `useSessionExpiry` のダイアログで扱います。

`vercel.ts` はSPAの深いURLを `index.html` にrewriteし、拡張子付き静的ファイルと `assets/`・`fonts/` を除外します。全レスポンスへCSPと基本セキュリティヘッダーを付けます。HTMLはinline scriptを含まず、`public/theme-init.js` を `script-src 'self'` で読み込みます。CSPの `connect-src` はビルド環境の `VITE_API_BASE_URL` のoriginから生成し、ViteとVercelで共通のURL検証を使います。

## チャートの計算と描画

`ChartContainer` がデータを取得し、銘柄・時間足を含む key によって選択状態をリセットします。`CandlestickChart` と `useCandlestickChart` は次のように役割を分けます。

1. 入力配列を変更せずに日付順へ並べ、終値列をメモ化する。
2. 有効な SMA・ボリンジャーバンドを計算する。各計算は独立してメモ化する。
3. `CandlestickChart` は計算結果を描画用フックと `IndicatorReadout` に渡し、数値表示と操作 UI を構成する。
4. `useCandlestickChart` はチャートの生成・破棄、リサイズ、選択足・固定状態・表示範囲、ローソク足・出来高・指標シリーズの投入を管理する。

描画用フックは指標の構成が同じ間はシリーズを再利用し、再取得した全履歴を反映します。指標の無効化や構成変更では不要なシリーズだけを削除し、チャート破棄時には残るシリーズを片付けます。指標値のポップオーバーは `IndicatorReadout` が担当し、チャート操作で閉じない仕様を維持します。BB の順序・色・ラベルは `lib/indicators.ts` の `BOLLINGER_SERIES` を共有します。

足の選択時は、データ変更時に作る日付索引から四本値・SMA・BB の値を参照します。価格と出来高の表示形式は共有の `Intl.NumberFormat` を再利用し、表示対象の足データが変わらない場合は四本値の整形結果を再利用します。

テーマ変更や足の選択では指標を再計算しません。テーマ変更時はローソク足の色設定と足ごとの出来高色だけを更新し、ローソク足データは再投入しません。1280px未満では指標を描画・計算せず、最新足の始値・高値・安値・出来高を表示します。スマホ・タブレットの判定は `useIsCompactChart` の viewport 幅に統一し、768px以上では開閉可能な銘柄サイドバーを併設します。初期表示本数の判定にはチャート領域幅を使い、640px未満は30本、それ以上は60本とします。

PCサイドバーは `useIsDesktopSidebar` で768px以上の表示幅を判定します。768px未満または閉じた状態では `WatchlistPanel` をマウントせず、ウォッチリストとスパークライン用価格の購読・描画を止めます。表示形式とスクロール位置は軽量な `Sidebar` に保持します。選択銘柄の初期化と上部価格はチャート側で独立して取得します。

スマホ・タブレットの出来高は Lightweight Charts の別ペインへ配置し、株価と出来高の高さを5:1に配分します。時間軸は共有し、価格軸の初期範囲を固定したまま横スクロールしても、株価が出来高領域へ重なりません。1280pxの境界を跨ぐ際は出来高シリーズを移動し、PCでは従来の重ね合わせ表示に戻します。

[README に戻る](../README.md)
