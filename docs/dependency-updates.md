# 依存関係の更新記録

以下は更新時点の調査記録です。現在のバージョンの正本は `package.json` と `package-lock.json` です。

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

以下は現在も更新を妨げる制約がある。過去に据え置いた意図を断定するものではなく、今回確認できた互換性条件を記録している。

| 対象 | 維持する理由・再確認条件 |
| --- | --- |
| ESLint 9.39.5（最新 10.10.0） | `eslint-config-next` が使用する `eslint-plugin-react@7.37.5` と `eslint-plugin-jsx-a11y@6.10.2` の最新版でも、peerDependencies が ESLint 10 を許容しない。両プラグインの対応後に再確認する。ESLint 9 は公式サポート終了済みのため、この保留は継続確認が必要。 |
| TypeScript 5.9.3（最新 7.0.2） | `openapi-typescript@7.13.0` の peerDependencies は `^5.x`。6.0.3 も対象外であり、型生成ツールの対応待ち。さらに `typescript-eslint` 最新版の対応範囲は `<6.1.0` のため、7系への移行にはこちらの対応も必要。 |
| `js-yaml` の override `^4.3.1` | `@redocly/openapi-core@1.34.17` が修正前の 4.2.0 を固定しているため、脆弱性対策を維持する。5系への強制更新は依存元の要求範囲外。依存元が修正版を採用したら override の解除を再検討する。 |

Next.js の依存が `postcss@8.5.23` と `sharp@^0.35.3` に更新済みのため、この2つの脆弱性対策用 override は解除した。ロックファイルには `sharp@0.35.4` が解決される。

確認元: [Vitest 5 移行ガイド](https://vitest.dev/guide/migration/)、[typescript-eslint 対応範囲](https://typescript-eslint.io/users/dependency-versions/)、[ESLint サポート状況](https://eslint.org/version-support/)、各パッケージの `npm view <package>@latest peerDependencies`。


[README に戻る](../README.md)
