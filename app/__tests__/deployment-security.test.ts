import { validateApiBaseUrl } from "../../config/api-url";
import { sourceToRegex } from "@vercel/routing-utils";

const getConfig = async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  return (await import("../../vercel")).createVercelConfig;
};

afterEach(() => vi.unstubAllEnvs());

it("Vercelが読むconfig exportもビルド環境のAPI URLに追従する", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "https://api.preview.example/v1");
  vi.resetModules();
  const { config } = await import("../../vercel");
  expect(config.headers?.[0].headers.find(({ key }) => key === "Content-Security-Policy")?.value)
    .toContain("connect-src 'self' https://api.preview.example;");
});

it.each(["https://api.example.com", "https://api.other.example/v1"])(
  "API URL %s のoriginをCSPへ反映し、全レスポンスの保護とSPA rewriteを維持する",
  async (apiUrl) => {
    const config = (await getConfig())(apiUrl);
    const headerRule = config.headers?.[0];
    const headers = Object.fromEntries(headerRule?.headers.map(({ key, value }) => [key, value]) ?? []);
    expect(config.framework).toBe("vite");
    expect(config.outputDirectory).toBe("dist");
    expect(config.rewrites?.[0].destination).toBe("/index.html");
    expect(headerRule?.source).toBe("/(.*)");
    expect(headers).toMatchObject({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain(`connect-src 'self' ${new URL(apiUrl).origin};`);
    expect(csp).not.toContain("connect-src 'self' https://api.stockviewapp.com");
  },
);

it("ローカルHTTPを許可し、APIベースパスをCSP originに含めない", async () => {
  const config = (await getConfig())("http://localhost:8080/v1");
  expect(config.headers?.[0].headers.find(({ key }) => key === "Content-Security-Policy")?.value)
    .toContain("connect-src 'self' http://localhost:8080;");
  expect(validateApiBaseUrl("http://[::1]:8080/v1").origin).toBe("http://[::1]:8080");
});

it("Vercelの実matcherで深い画面URLだけをSPAへ書き換える", async () => {
  const config = (await getConfig())("https://api.example.com");
  const source = config.rewrites?.[0].source;
  expect(source).toBeDefined();
  const matcher = new RegExp(sourceToRegex(source!).src);
  for (const path of ["/", "/login", "/signup", "/portfolio/watchlist/deep"]) {
    expect(matcher.test(path)).toBe(true);
  }
  for (const path of [
    "/assets/missing.js", "/assets/missing.css", "/fonts/missing.woff2",
    "/theme-init.js", "/favicon.ico", "/nested/missing.png",
  ]) {
    expect(matcher.test(path)).toBe(false);
  }
});

it.each([
  undefined, "", "api.example.com", "https:api.example.com", "https:/api.example.com",
  "https:///api.example.com", "http://api.example.com", "https://user:pass@api.example.com",
  "https://api.example.com?token=x", "https://api.example.com#part", " https://api.example.com",
  "https://api.example.com/has space", "ftp://api.example.com",
])("不正なAPI URL %s をViteとVercel共通の検証で拒否する", (apiUrl) => {
  expect(() => validateApiBaseUrl(apiUrl)).toThrow("VITE_API_BASE_URL");
});
