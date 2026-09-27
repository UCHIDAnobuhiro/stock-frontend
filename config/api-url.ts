export function validateApiBaseUrl(value: string | undefined): URL {
  if (!value || /\s/.test(value) || !/^https?:\/\/[^/\\?#]+(?:[/?#]|$)/.test(value)) {
    throw new Error("VITE_API_BASE_URL must be an absolute HTTP(S) URL without whitespace.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_API_BASE_URL must be an absolute HTTP(S) URL.");
  }

  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username || url.password || value.includes("?") || value.includes("#")
  ) {
    throw new Error("VITE_API_BASE_URL must use HTTPS (or local HTTP) without credentials, query, or fragment.");
  }

  return url;
}
