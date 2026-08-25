#!/usr/bin/env bash
# Installs the Terraform CLI to ~/.local/bin (no root required).
# Usage: bash scripts/install-terraform.sh   [TF_VERSION=v1.9.8 overrides]
set -euo pipefail

VERSION="${TF_VERSION:-v1.9.8}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
esac

URL="https://releases.hashicorp.com/terraform/${VERSION#v}/terraform_${VERSION#v}_${OS}_${ARCH}.zip"
TMP="$(mktemp -d)"

echo "Downloading terraform ${VERSION} (${OS}/${ARCH})..."
curl -fsSL "$URL" -o "$TMP/tf.zip"
unzip -o -q "$TMP/tf.zip" -d "$TMP"

mkdir -p "$HOME/.local/bin"
mv "$TMP/terraform" "$HOME/.local/bin/terraform"
rm -rf "$TMP"

"$HOME/.local/bin/terraform" version
echo "✔ terraform installed. Ensure ~/.local/bin is on your PATH."
