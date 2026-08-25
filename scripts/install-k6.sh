#!/usr/bin/env bash
# Installs the k6 load-testing CLI to ~/.local/bin (no root required).
# Usage: bash scripts/install-k6.sh   [K6_VERSION=v1.2.3 overrides]
set -euo pipefail

VERSION="${K6_VERSION:-v1.2.3}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
esac

URL="https://github.com/grafana/k6/releases/download/${VERSION}/k6-${VERSION}-${OS}-${ARCH}.tar.gz"
TMP="$(mktemp -d)"

echo "Downloading k6 ${VERSION} (${OS}/${ARCH})..."
curl -fsSL "$URL" | tar xz -C "$TMP"

mkdir -p "$HOME/.local/bin"
mv "$TMP/k6-${VERSION}-${OS}-${ARCH}/k6" "$HOME/.local/bin/k6"
rm -rf "$TMP"

"$HOME/.local/bin/k6" version
echo "✔ k6 installed. Ensure ~/.local/bin is on your PATH."
