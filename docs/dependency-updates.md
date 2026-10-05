# 依存関係の更新記録

以下は更新時点の調査記録です。現在のバージョンの正本は `package.json` と `package-lock.json` です。

## shadcn CLI の除去（2026-10-05）

`shadcn@4.21.0` の CLI が `fast-glob` / `ts-morph` → `micromatch` → `braces@3.0.3` を開発依存へ取り込んでいた。`braces` の [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) に修正版がなく、調査時点の `shadcn@4.21.1` でもこの経路が残るため、CLI の依存を除去した。アプリで直接利用していたのは CSS import だけであり、既存の shadcn/ui ベースのコンポーネントはそのまま利用する。

旧ロックファイルの integrity と照合した [`shadcn@4.21.0` の npm tarball](https://registry.npmjs.org/shadcn/-/shadcn-4.21.0.tgz) から `dist/tailwind.css` を無改変で `app/shadcn.css` へ保存した。CSS の SHA-256 は `bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a`。`data-open` / `data-closed` / `data-selected` / `data-horizontal` / `data-vertical` と `no-scrollbar` を含む。MIT ライセンス全文は [`licenses/shadcn-MIT.txt`](../licenses/shadcn-MIT.txt) に保存した。

ロックファイルは npm 12.0.2 で再生成し、CLI 専用の推移依存を削除した。再導入条件と CSS の更新手順は [開発・検証](development.md) を参照する。

## 依存パッケージの更新判断（2026-09-06）

npm レジストリの `latest` とロックファイルを照合し、互換性を満たす直接依存を更新した。プレリリースは対象外。Node.js は既存の LTS 方針を維持して 24.20.0、npm は 12.0.2 を使用する。

| パッケージ | 更新前 → 更新後 |
| --- | --- |
| `@base-ui/react` | 1.7.0 → 1.8.0 |
| `lucide-react` | 1.35.0 → 1.41.0 |
| `next` / `eslint-config-next` | 16.3.3 → 16.3.4 |
| `@testing-library/user-event` | 14.6.6 → 14.6.7 |
| `@types/node` | 26.4.0 → 26.4.1 |
| `@types/react-dom` | 19.2.5 → 19.2.7 |
| `shadcn` | 4.19.0 → 4.21.0 |
| `vitest` | 4.1.11 → 5.0.0 |

以下は2026-09-06時点で確認した更新の制約であり、現在の制約を示すものではない。過去に据え置いた意図を断定するものではなく、当時確認できた互換性条件を記録している。

| 対象 | 維持する理由・再確認条件 |
| --- | --- |
| ESLint 9.39.5（最新 10.10.0） | `eslint-config-next` が使用する `eslint-plugin-react@7.37.5` と `eslint-plugin-jsx-a11y@6.10.2` の最新版でも、peerDependencies が ESLint 10 を許容しない。両プラグインの対応後に再確認する。ESLint 9 は公式サポート終了済みのため、この保留は継続確認が必要。 |
| TypeScript 5.9.3（最新 7.0.2） | `openapi-typescript@7.13.0` の peerDependencies は `^5.x`。6.0.3 も対象外であり、型生成ツールの対応待ち。さらに `typescript-eslint` 最新版の対応範囲は `<6.1.0` のため、7系への移行にはこちらの対応も必要。 |
| `js-yaml` の override `^4.3.1` | `@redocly/openapi-core@1.34.17` が修正前の 4.2.0 を固定しているため、脆弱性対策を維持する。5系への強制更新は依存元の要求範囲外。依存元が修正版を採用したら override の解除を再検討する。 |

Next.js の依存が `postcss@8.5.23` と `sharp@^0.35.3` に更新済みのため、この2つの脆弱性対策用 override は解除した。ロックファイルには `sharp@0.35.4` が解決される。

確認元: [Vitest 5 移行ガイド](https://vitest.dev/guide/migration/)、[typescript-eslint 対応範囲](https://typescript-eslint.io/users/dependency-versions/)、[ESLint サポート状況](https://eslint.org/version-support/)、各パッケージの `npm view <package>@latest peerDependencies`。


[README に戻る](../README.md)
