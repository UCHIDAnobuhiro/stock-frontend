import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionRedirect } from "@/hooks/useSessionRedirect";

const { replace, mutate, startNavigation } = vi.hoisted(() => ({
  replace: vi.fn(),
  mutate: vi.fn(),
  startNavigation: vi.fn((navigate: () => void) => navigate()),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate }) }));
vi.mock("@/hooks/useNavigationLoading", () => ({ useNavigationLoading: () => ({ startNavigation }) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSessionRedirect", () => {
  it("全キャッシュ破棄の完了まで画面遷移を待つ", async () => {
    let finishClear: (() => void) | undefined;
    mutate.mockImplementation(() => new Promise<void>((resolve) => { finishClear = resolve; }));
    const { result } = renderHook(() => useSessionRedirect());

    let redirect: Promise<void> | undefined;
    await act(async () => {
      redirect = result.current();
      await Promise.resolve();
    });
    expect(mutate).toHaveBeenCalledWith(expect.any(Function), undefined, { revalidate: false });
    expect(mutate.mock.calls[0][0]("any-key")).toBe(true);
    expect(startNavigation).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    await act(async () => {
      finishClear?.();
      await redirect;
    });
    expect(startNavigation).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login");
  });
});
