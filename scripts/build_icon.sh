#!/bin/bash
# Converts logo.svg → Laan.app/Contents/Resources/AppIcon.icns
# Requires: macOS (uses built-in sips + iconutil)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
SVG="$ROOT/logo.svg"
ICONSET="$ROOT/scripts/AppIcon.iconset"
ICNS="$ROOT/Laan.app/Contents/Resources/AppIcon.icns"

echo "Building icon from $SVG..."

# Create iconset directory
mkdir -p "$ICONSET"

# Convert SVG → PNG at largest size using qlmanage (built into macOS)
# qlmanage renders SVG to PNG; we use a large size then scale down
TMP_PNG="$ICONSET/tmp_1024.png"

# Try rsvg-convert first (brew install librsvg), fallback to qlmanage
if command -v rsvg-convert &>/dev/null; then
  rsvg-convert -w 1024 -h 1024 "$SVG" -o "$TMP_PNG"
elif command -v inkscape &>/dev/null; then
  inkscape --export-png="$TMP_PNG" -w 1024 -h 1024 "$SVG"
else
  # macOS built-in: use qlmanage to generate a preview, then grab the PNG
  TMPDIR_QM="$(mktemp -d)"
  qlmanage -t -s 1024 -o "$TMPDIR_QM" "$SVG" 2>/dev/null
  # qlmanage appends ".png" to the filename
  mv "$TMPDIR_QM/logo.svg.png" "$TMP_PNG" 2>/dev/null || \
  mv "$TMPDIR_QM/"*.png "$TMP_PNG" 2>/dev/null || true
  rm -rf "$TMPDIR_QM"
fi

if [ ! -f "$TMP_PNG" ]; then
  echo "ERROR: Could not render SVG to PNG."
  echo "Install librsvg: brew install librsvg"
  exit 1
fi

# Generate all required icon sizes using sips
sizes=(16 32 64 128 256 512)
for size in "${sizes[@]}"; do
  sips -z $size $size "$TMP_PNG" --out "$ICONSET/icon_${size}x${size}.png"     &>/dev/null
  double=$((size * 2))
  sips -z $double $double "$TMP_PNG" --out "$ICONSET/icon_${size}x${size}@2x.png" &>/dev/null
done

# Clean up temp file
rm "$TMP_PNG"

# Convert iconset → icns
iconutil -c icns "$ICONSET" -o "$ICNS"

# Clean up iconset
rm -rf "$ICONSET"

echo "✓ Icon built: $ICNS"

# Also copy logo.svg into the frontend public dir for the web app
cp "$SVG" "$ROOT/frontend/public/logo.svg"
echo "✓ logo.svg copied to frontend/public/"
