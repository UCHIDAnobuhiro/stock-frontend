export interface AuthFieldErrors {
  email?: string;
  password?: string;
}

/** ログイン・新規登録で共通の入力検証。パスワードの長さ制約は登録時のみ適用する。 */
export function validateAuthFields(
  email: string,
  password: string,
  mode: "login" | "signup",
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "有効なメールアドレスを入力してください";
  }
  if (!password) {
    errors.password = "パスワードを入力してください";
  } else if (mode === "signup" && password.length < 12) {
    errors.password = "パスワードは12文字以上で入力してください";
  }
  return errors;
}
