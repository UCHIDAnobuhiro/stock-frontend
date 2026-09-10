import type { ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";

/** マウントごとにキャッシュを分離し、失敗時のバックグラウンド再試行を止める。 */
export function createSWRWrapper(config: SWRConfiguration = {}) {
  const value = {
    ...config,
    provider: () => new Map(),
    shouldRetryOnError: false,
  };
  return function SWRTestProvider({ children }: { children: ReactNode }) {
    return <SWRConfig value={value}>{children}</SWRConfig>;
  };
}
