/**
 * Vitest のグローバルセットアップ。
 * jsdom 環境で localStorage が正しく動作しない場合に備え、
 * インメモリ実装で上書きする。
 */

let store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    store = {};
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
  get length() {
    return Object.keys(store).length;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// 各テスト前に localStorage をリセットする
beforeEach(() => {
  store = {};
});
