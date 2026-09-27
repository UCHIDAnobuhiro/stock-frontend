import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionRedirect } from "@/hooks/useSessionRedirect";

const { replace, unload, startNavigation } = vi.hoisted(() => ({
  replace: vi.fn(),
  unload: vi.fn(),
  startNavigation: vi.fn((navigate: () => void) => navigate()),
}));

vi.mock("react-router", () => ({ useNavigate: () => replace }));
vi.mock("swr", () => ({ useSWRConfig: () => ({ unload }) }));
vi.mock("@/hooks/useNavigationLoading", () => ({ useNavigationLoading: () => ({ startNavigation }) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSessionRedirect", () => {
  it("キャッシュを同期破棄してから画面遷移を開始する", () => {
    const { result } = renderHook(() => useSessionRedirect());
    act(() => result.current());
    expect(unload).toHaveBeenCalledExactlyOnceWith({ revalidate: false });
    expect(startNavigation).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledExactlyOnceWith("/login", { replace: true });
    expect(unload.mock.invocationCallOrder[0]).toBeLessThan(startNavigation.mock.invocationCallOrder[0]);
  });
});
