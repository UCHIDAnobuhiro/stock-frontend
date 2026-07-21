import { describe, it, expect } from "vitest";
import { normalizeCompanyName, findBestMatch } from "@/lib/companyMatch";

describe("normalizeCompanyName", () => {
  it("法人格・記号・大文字小文字の違いを吸収する", () => {
    expect(normalizeCompanyName("Sony Group Corporation")).toBe("sony");
    expect(normalizeCompanyName("Sony Corp")).toBe("sony");
    expect(normalizeCompanyName("株式会社ソニー")).toBe("ソニー");
  });

  it("連続する空白をトリムして1つに畳む", () => {
    expect(normalizeCompanyName("  Toyota   Motor  Corporation ")).toBe("toyota motor");
  });
});

describe("findBestMatch", () => {
  const candidates = [
    { code: "6758", name: "Sony Group Corporation" },
    { code: "7203", name: "Toyota Motor Corporation" },
    { code: "9984", name: "SoftBank Group Corp." },
  ];

  it("表記揺れがあっても正規化後の一致で見つけられる", () => {
    const match = findBestMatch("Sony Corp", candidates, (c) => c.name);
    expect(match?.code).toBe("6758");
  });

  it("完全一致を優先する", () => {
    const match = findBestMatch("Toyota Motor Corporation", candidates, (c) => c.name);
    expect(match?.code).toBe("7203");
  });

  it("類似度が低い場合は null を返す", () => {
    const match = findBestMatch("Completely Unknown Inc", candidates, (c) => c.name);
    expect(match).toBeNull();
  });

  it("空文字は null を返す", () => {
    const match = findBestMatch("", candidates, (c) => c.name);
    expect(match).toBeNull();
  });
});
