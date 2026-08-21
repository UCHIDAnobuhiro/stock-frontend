#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
frontend_dir="$(cd "${script_dir}/.." && pwd)"

# worktree 自身の親を基準にすると sibling の stock-backend を見つけられないため、
# Git の共通ディレクトリ（main checkout の .git）から元のリポジトリ位置を解決する。
if git_common_dir="$(git -C "${frontend_dir}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)"; then
  main_frontend_dir="$(cd "$(dirname "${git_common_dir}")" && pwd)"
else
  main_frontend_dir="${frontend_dir}"
fi

backend_dir="${STOCK_BACKEND_DIR:-"${main_frontend_dir}/../stock-backend"}"
backend_spec="${backend_dir}/api/openapi.yaml"
frontend_spec="${frontend_dir}/openapi/openapi.yaml"

if [[ ! -f "${backend_spec}" ]]; then
  echo "バックエンドの OpenAPI が見つかりません: ${backend_spec}" >&2
  exit 1
fi

cp "${backend_spec}" "${frontend_spec}"
npm --prefix "${frontend_dir}" run generate:api
