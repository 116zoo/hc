#!/usr/bin/env bash
# Sync basemind sidecars from GitHub release
# Usage: ./sync-basemind-sidecars.sh [version]

set -euo pipefail

VERSION="${1:-latest}"
REPO="jamon8888/basemind"
BIN_DIR="src/apps/desktop/binaries"

echo "Syncing basemind sidecars for version: $VERSION"

# Resolve version if latest
if [[ "$VERSION" == "latest" ]]; then
    VERSION=$(gh api repos/$REPO/releases/latest --jq '.tag_name' 2>/dev/null)
    if [[ -z "$VERSION" ]]; then
        echo "Error: Could not fetch latest version"
        exit 1
    fi
    echo "Resolved latest version: $VERSION"
fi

# Create binaries directory
mkdir -p "$BIN_DIR"

# Platform mappings
declare -A PLATFORMS=(
    ["linux-x64"]="basemind-x86_64-unknown-linux-gnu.tar.gz"
    ["linux-arm64"]="basemind-aarch64-unknown-linux-gnu.tar.gz"
    ["macos-x64"]="basemind-x86_64-apple-darwin.tar.gz"
    ["macos-arm64"]="basemind-aarch64-apple-darwin.tar.gz"
    ["windows-x64"]="basemind-x86_64-pc-windows-msvc.zip"
)

# Download each platform
for platform in "${!PLATFORMS[@]}"; do
    asset="${PLATFORMS[$platform]}"
    echo "Downloading $asset for $platform..."
    
    if gh release download "$VERSION" -R "$REPO" -p "$asset" -o "$BIN_DIR/" 2>/dev/null; then
        echo "  ✓ Downloaded $asset"
    else
        echo "  ⚠ Failed to download $asset (may not exist in this release)"
        continue
    fi
    
    # Extract
    cd "$BIN_DIR"
    if [[ "$asset" == *.tar.gz ]]; then
        tar xzf "$asset" 2>/dev/null || true
        rm "$asset"
    elif [[ "$asset" == *.zip ]]; then
        unzip -o "$asset" 2>/dev/null || true
        rm "$asset"
    fi
    cd - > /dev/null
done

# Rename extracted binaries to expected names
cd "$BIN_DIR"

# Linux x64
if [[ -f basemind ]]; then
    mv basemind basemind-linux-x64
elif [[ -f basemind-x86_64-unknown-linux-gnu ]]; then
    mv basemind-x86_64-unknown-linux-gnu basemind-linux-x64
fi

# Linux arm64
if [[ -f basemind ]]; then
    mv basemind basemind-linux-arm64
elif [[ -f basemind-aarch64-unknown-linux-gnu ]]; then
    mv basemind-aarch64-unknown-linux-gnu basemind-linux-arm64
fi

# macOS x64
if [[ -f basemind ]]; then
    mv basemind basemind-macos-x64
elif [[ -f basemind-x86_64-apple-darwin ]]; then
    mv basemind-x86_64-apple-darwin basemind-macos-x64
fi

# macOS arm64
if [[ -f basemind ]]; then
    mv basemind basemind-macos-arm64
elif [[ -f basemind-aarch64-apple-darwin ]]; then
    mv basemind-aarch64-apple-darwin basemind-macos-arm64
fi

# Windows
if [[ -f basemind.exe ]]; then
    mv basemind.exe basemind-windows-x64.exe
elif [[ -f basemind-x86_64-pc-windows-msvc.exe ]]; then
    mv basemind-x86_64-pc-windows-msvc.exe basemind-windows-x64.exe
fi

# Make executables
chmod +x basemind-* 2>/dev/null || true

echo "Sidecars synced to $BIN_DIR:"
ls -la "$BIN_DIR"/

# Generate checksums
echo "Generating checksums..."
sha256sum basemind-* > checksums.txt 2>/dev/null || true
cat checksums.txt

echo "Done!"