/**
 * ロゴ検出で得た企業名と銘柄マスタの名称を突合するためのユーティリティ。
 * 表記揺れ（法人格の有無・記号・全角半角スペース等）を吸収したうえで一致度を判定する。
 */

const CORPORATE_SUFFIXES = [
  "corporation",
  "incorporated",
  "company limited",
  "co ltd",
  "co\\.,? ltd\\.?",
  "co\\.?",
  "corp\\.?",
  "inc\\.?",
  "ltd\\.?",
  "plc",
  "llc",
  "group",
  "holdings?",
  "kk",
];

const SUFFIX_PATTERN = new RegExp(`\\b(${CORPORATE_SUFFIXES.join("|")})\\b`, "gi");

/**
 * 会社名を比較用に正規化する。
 * - 全角英数・スペースを半角化
 * - 記号（.,&-等）・「株式会社」「㈱」等の法人格を除去
 * - 小文字化し、連続空白を1つに畳んで前後をトリム
 */
export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/株式会社|有限会社|合同会社|㈱|㈲/g, "")
    .replace(/[.,&\-_'"()]/g, " ")
    .toLowerCase()
    .replace(SUFFIX_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter(Boolean);
}

/**
 * 正規化後のトークン集合の類似度（Jaccard係数）を返す。
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.5;

/**
 * detectedName に対応する候補を candidates（各要素の getName で名称を取り出す）から探す。
 * 完全一致・正規化後の部分文字列一致・トークン類似度の順で判定し、
 * 見つからない場合は null を返す。
 */
export function findBestMatch<T>(
  detectedName: string,
  candidates: T[],
  getName: (candidate: T) => string
): T | null {
  const normalizedDetected = normalizeCompanyName(detectedName);
  if (!normalizedDetected) return null;

  let bestCandidate: T | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeCompanyName(getName(candidate));
    if (!normalizedCandidate) continue;

    if (normalizedCandidate === normalizedDetected) {
      return candidate;
    }

    const isSubstring =
      normalizedCandidate.includes(normalizedDetected) ||
      normalizedDetected.includes(normalizedCandidate);
    const score = isSubstring ? 1 : tokenSimilarity(normalizedDetected, normalizedCandidate);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore >= SIMILARITY_THRESHOLD ? bestCandidate : null;
}
