import { describe, expect, it } from "vitest";
import { validateAuthFields } from "@/lib/auth-validation";

describe("パスワードのAPI境界値", () => {
  it.each([
    ["ASCII 11文字", "a".repeat(11)],
    ["日本語11文字", "あ".repeat(11)],
    ["サロゲートペア6文字", "🔑".repeat(6)],
    ["サロゲートペア11文字", "🔑".repeat(11)],
  ])("登録時は%sを12文字未満として拒否する", (_, password) => {
    expect(validateAuthFields("user@example.com", password, "signup").password).toBe(
      "パスワードは12文字以上で入力してください",
    );
  });

  it.each(["signup", "login"] as const)("%sではUTF-8の1024バイト上限を検証する", (mode) => {
    for (const password of ["a".repeat(1025), "あ".repeat(342), "🔑".repeat(257)]) {
      expect(validateAuthFields("user@example.com", password, mode).password).toBe(
        "パスワードはUTF-8で1024バイト以下で入力してください",
      );
    }
    for (const password of ["a".repeat(1024), "あ".repeat(341) + "a", "🔑".repeat(256)]) {
      expect(validateAuthFields("user@example.com", password, mode)).toEqual({});
    }
  });

  it("登録時はUnicode 12文字を受け付け、ログイン時は最低12文字を要求しない", () => {
    expect(validateAuthFields("user@example.com", "🔑".repeat(12), "signup")).toEqual({});
    expect(validateAuthFields("user@example.com", "あ", "login")).toEqual({});
  });
});
