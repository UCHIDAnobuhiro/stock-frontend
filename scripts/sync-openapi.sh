#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
frontend_dir="$(cd "${script_dir}/.." && pwd)"
backend_dir="${STOCK_BACKEND_DIR:-"${frontend_dir}/../stock-backend"}"
backend_spec="${backend_dir}/api/openapi.yaml"
frontend_spec="${frontend_dir}/openapi/openapi.yaml"

if [[ ! -f "${backend_spec}" ]]; then
  echo "バックエンドの OpenAPI が見つかりません: ${backend_spec}" >&2
  exit 1
fi

cp "${backend_spec}" "${frontend_spec}"
npm --prefix "${frontend_dir}" run generate:api
