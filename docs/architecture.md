# アーキテクチャ

実装規約と画面仕様の正本は [AGENTS.md](../AGENTS.md) です。この文書はコードを読む際の責務とデータの流れを説明します。

## 責務と依存方向

```text
app/page.tsx ── lib/api.server.ts ── バックエンド（SSR の銘柄一覧）
     │              │
     │              └── lib/api-base.ts（共有 URL）
     ↓ SWR fallback
components/ ── hooks/ ── lib/api.ts ── lib/auth-refresh.ts ── バックエンド
     │            │          └── lib/api-base.ts
     └────────────┴── lib/market-data.ts / lib/indicators.ts 等
```

| 配置 | 責務 |
| --- | --- |
| `app/` | ページ・レイアウト、SSR、エラー境界 |
| `components/` | 表示と操作。チャートシリーズ等、描画に閉じたフックも配置する |
| `hooks/` | API 取得・更新、URL 遷移、フォームの状態・送信、共有する操作 |
| `lib/` | API 通信、認証ヘルパー、入力検証、指標計算、共有型 |
| `lib/generated/` | OpenAPI 由来の自動生成型。直接編集しない |
| `tests/support/` | テストだけが参照する共通補助コード |

ルート直下に配置し、`@/*` は `./*` に対応します。Server Component を基本とし、操作を伴う境界に `"use client"` を付けます。境界配下の表示部品すべてに宣言を重複させる必要はありません。

市場データの共有型は `lib/market-data.ts` に置き、API 型を再定義せず生成型を参照します。従来のフックからも型を再エクスポートしますが、`lib/` はフックへ依存しません。SSR の API URL はブラウザ用クライアントを初期化せず `api-base.ts` から参照します。

## 状態管理

| 状態 | 所有者 |
| --- | --- |
| 選択銘柄・時間足 | `useSelectedSymbol` と URL の `symbol` / `interval` |
| 銘柄一覧・ローソク足・価格サマリー・ウォッチリスト | SWR |
| アクセストークン・リフレッシュトークン | バックエンドが発行する HttpOnly Cookie |
| CSRF トークン | `csrf_token` Cookie → `X-CSRF-Token` ヘッダー |
| テーマ | next-themes |
| 指標の有効状態 | `useIndicators` の React state |
| ウォッチリスト表示形式 | `WatchlistPanel` と localStorage |
| チャートの選択足・固定状態・表示範囲 | `CandlestickChart` |

`useSelectedSymbol` は同一ページの銘柄・時間足の変更を History API で URL に反映します。`useSearchParams` に同期するため、共有 URL とブラウザの戻る・進む操作を維持しつつ、変更ごとの `app/page.tsx` の再実行と銘柄一覧の SSR 再取得を避けます。直接アクセスや再読み込みは通常のページリクエストとして `proxy.ts` を通ります。画面内の切り替えでは保護 API が認証・認可を行い、最終的な401はセッション切れ表示につなぎます。認証データはブラウザの永続ストレージへ保存しません。

## SSR と SWR

`app/page.tsx` は `fetchSymbolsServer()` を開始し、その Promise を `SymbolsProvider` で共有します。シェルとチャートは取得完了を待たずに表示し、サイドバー・銘柄名とロゴ・ロゴ検索の一覧依存部分だけが Suspense で待機します。解決した結果は各部分の `SymbolsFallback` が `/v1/symbols` キーの SWR fallback として渡します。サーバーは `cookies()` から読み取った `auth_token` を Cookie ヘッダーへ明示的に付けます。

- 正常な空配列は取得成功であり、fallback に含めます。
- 認証 Cookie がない場合や API がエラーレスポンスを返した場合、または通信に失敗した場合は `null` を返し、fallback を設定せずクライアントから取得します。
- fallback があっても SWR の再検証中は `isLoading` が true になり得ます。初期データの有無とローディング状態は別の情報です。
- SSR は自動 refresh を行いません。

`useQuotes` は最大50銘柄ごとに分割して並列取得します。結果はリクエスト順で結合し、銘柄単位の失敗も保持します。HTTP エラーがある場合は全体の取得エラーとして扱います。キーはコードをソートして作るため、並び替えだけでは再取得しません。

`useWatchlist` の更新は `optimisticData` に渡される最新キャッシュを使います。追加・削除・並び替えが失敗した場合は SWR がロールバックし、成功時はサーバーの一覧を取得します。

ウォッチリストの銘柄検索は `WatchlistSymbolSearch` が入力状態を持ち、入力中もウォッチリスト行を再描画しません。`lib/symbol-search.ts` が cmdk と同じスコアでコード・企業名を順位付けし、候補は50件ずつ表示します。残件数とページ操作を示し、全候補へ到達できます。

## 認証と CSP

ブラウザ用 `api.ts` は Cookie を送信し、安全メソッド（GET / HEAD / OPTIONS）以外には CSRF ヘッダーを付けます。保護 API の401を `auth-refresh.ts` が受け取ると、refresh に成功した場合に元リクエストを1回だけ再送します。同じクライアント内の refresh は共有し、409のみ1回再試行します。再送時には最新の CSRF Cookie を使います。

login・signup・logout・refresh・OAuth は自動 refresh の対象外です。最終的に保護 API が401を返すと `SESSION_EXPIRED_EVENT` を発火し、`useSessionExpiry` がダイアログ表示へつなぎます。加えて、マウント直後と60秒ごとにブラウザ内の CSRF Cookie の存在を確認します。この確認では API 通信を行いません。

`proxy.ts` は Cookie の存在と JWT の期限を確認する画面遷移用ガードです。署名検証と認可はバックエンドが担います。有効なアクセストークンがなくても refresh Cookie と CSRF Cookie が揃えばクライアントで復旧できます。

nonce は `proxy.ts` → `app/layout.tsx` → `ThemeProvider` に渡します。リクエストごとに異なる nonce を使うため、ページの動的レンダリングを維持します。

認証フォームの状態・API 送信・成功後の遷移は `useLogin` / `useSignup` に残し、共通の入力検証だけを `lib/auth-validation.ts` に置きます。登録時だけパスワード12文字以上を要求します。

## チャートの計算と描画

`ChartContainer` がデータを取得し、銘柄・時間足を含む key によって選択状態をリセットします。`CandlestickChart` は次の役割を持ちます。

1. 入力配列を変更せずに日付順へ並べ、終値列をメモ化する。
2. 有効な SMA・ボリンジャーバンドを計算する。各計算は独立してメモ化する。
3. 計算結果を `useIndicatorSeries` / `useBollingerSeries` と `IndicatorReadout` で共有する。
4. チャートの生成・破棄、リサイズ、選択足・固定状態・表示範囲を管理する。

描画用フックは指標の構成が同じ間はシリーズを再利用し、再取得した全履歴を反映します。指標の無効化や構成変更では不要なシリーズだけを削除し、チャート破棄時には残るシリーズを片付けます。指標値のポップオーバーは `IndicatorReadout` が担当し、チャート操作で閉じない仕様を維持します。BB の順序・色・ラベルは `lib/indicators.ts` の `BOLLINGER_SERIES` を共有します。

足の選択時は、データ変更時に作る日付索引から四本値・SMA・BB の値を参照します。価格と出来高の表示形式は共有の `Intl.NumberFormat` を再利用し、表示対象の足データが変わらない場合は四本値の整形結果を再利用します。

テーマ変更や足の選択では指標を再計算しません。テーマ変更時はローソク足の色設定と足ごとの出来高色だけを更新し、ローソク足データは再投入しません。1280px未満では指標を描画・計算せず、最新足の始値・高値・安値・出来高を表示します。スマホ・タブレットの判定は `useIsCompactChart` の viewport 幅に統一し、768px以上では開閉可能な銘柄サイドバーを併設します。初期表示本数の判定にはチャート領域幅を使い、640px未満は30本、それ以上は60本とします。

スマホ・タブレットの出来高は Lightweight Charts の別ペインへ配置し、株価と出来高の高さを5:1に配分します。時間軸は共有し、価格軸の初期範囲を固定したまま横スクロールしても、株価が出来高領域へ重なりません。1280pxの境界を跨ぐ際は出来高シリーズを移動し、PCでは従来の重ね合わせ表示に戻します。

[README に戻る](../README.md)
