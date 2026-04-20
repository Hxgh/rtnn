#!/bin/sh
set -eu

escape_js() {
  printf '%s' "${1-}" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

api_base_url="$(escape_js "${TARO_APP_API_BASE_URL:-http://127.0.0.1:5100}")"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RTNN_RUNTIME_CONFIG__ = Object.assign({}, window.__RTNN_RUNTIME_CONFIG__, {
  TARO_APP_API_BASE_URL: "${api_base_url}"
});
EOF
