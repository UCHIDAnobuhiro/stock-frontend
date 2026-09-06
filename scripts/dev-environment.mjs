import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const REQUIRED_NODE = ">=24.18.0 <25";
const REQUIRED_NPM = ">=12.0.2 <13";
const API_BASE_KEY = "NEXT_PUBLIC_API_BASE_URL";
const IS_VERCEL = process.env.VERCEL === "1";

function parseVersion(rawVersion) {
  const match = rawVersion.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function isAtLeast(version, minimum) {
  if (version.major !== minimum.major) return version.major > minimum.major;
  if (version.minor !== minimum.minor) return version.minor > minimum.minor;
  return version.patch >= minimum.patch;
}

function isSupportedNode(rawVersion) {
  const version = parseVersion(rawVersion);
  return version !== null && version.major === 24 && isAtLeast(version, { major: 24, minor: 18, patch: 0 });
}

function getNpmVersion() {
  const userAgentMatch = process.env.npm_config_user_agent?.match(/(?:^|\s)npm\/([^\s]+)/);
  if (userAgentMatch) return userAgentMatch[1];

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["--version"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function isSupportedNpm(rawVersion) {
  const version = parseVersion(rawVersion);
  return version !== null && version.major === 12 && isAtLeast(version, { major: 12, minor: 0, patch: 2 });
}

function envFileDefinesApiBase(path) {
  if (!existsSync(path)) return false;

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .some((line) => {
      const match = line.match(/^\s*NEXT_PUBLIC_API_BASE_URL\s*=\s*(.*)\s*$/);
      return match !== null && match[1].trim() !== "";
    });
}

function collectRuntimeErrors() {
  const npmVersion = getNpmVersion();
  const errors = [];

  if (!isSupportedNode(process.version)) {
    errors.push(`Node.js ${REQUIRED_NODE} が必要です（現在: ${process.version}）。`);
  }
  if (!IS_VERCEL && !isSupportedNpm(npmVersion)) {
    errors.push(`npm ${REQUIRED_NPM} が必要です（現在: ${npmVersion}）。`);
  }

  return { errors, npmVersion };
}

function printErrors(errors) {
  for (const error of errors) console.error(`- ${error}`);
  console.error("README の『開発環境』に従って Node.js / npm を切り替えてください。");
}

function prepareWorktree() {
  const { errors } = collectRuntimeErrors();
  if (errors.length > 0) {
    console.error("worktree の初期化を中止しました。");
    printErrors(errors);
    process.exit(1);
  }

  if (!existsSync(".env.local") && existsSync(".env.example")) {
    copyFileSync(".env.example", ".env.local");
    console.log(".env.example から .env.local を作成しました。");
  }

  if (!existsSync("node_modules")) {
    console.log("依存パッケージがないため npm ci を実行します。");
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(npmCommand, ["ci"], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

if (process.argv.includes("--setup")) prepareWorktree();

const { errors, npmVersion } = collectRuntimeErrors();
if (!existsSync("node_modules")) {
  errors.push("node_modules がありません。npm ci を実行してください。");
}
if (!process.env[API_BASE_KEY] && !envFileDefinesApiBase(".env.local")) {
  errors.push(`${API_BASE_KEY} が環境変数にも .env.local にも設定されていません。`);
}

if (errors.length > 0) {
  console.error("開発環境に問題があります。");
  printErrors(errors);
  process.exit(1);
}

console.log(`開発環境は正常です（Node.js ${process.version}, npm ${npmVersion}）。`);
