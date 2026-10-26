#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
SOURCE_PROJECT="${1:-$SCRIPT_DIR/../chisinau-macos}"
BUILD_DIR="$SCRIPT_DIR/build"
STAGE_ROOT="${TMPDIR:-/tmp}/chisinau-native-stage"
APP_DIR="$STAGE_ROOT/Chișinău 3D.app"
FINAL_DIR="$BUILD_DIR/Chișinău 3D Native"
SDK_PATH="$(xcrun --show-sdk-path)"
CXX_HEADERS="$SDK_PATH/usr/include/c++/v1"

if [[ ! -f "$SCRIPT_DIR/resources/world/manifest.json" || "${2:-}" == "--rebuild-world" ]]; then
  rm -f "$SCRIPT_DIR/resources/world/"*.ctile(N) "$SCRIPT_DIR/resources/world/"*.dtile(N) "$SCRIPT_DIR/resources/world/manifest.json"
  node "$SCRIPT_DIR/tools/build_world.mjs" "$SOURCE_PROJECT" "$SCRIPT_DIR/resources/world"
fi
if [[ ! -f "$SCRIPT_DIR/resources/models/helicopter.cmesh" || "${2:-}" == "--rebuild-world" ]]; then
  mkdir -p "$SCRIPT_DIR/resources/models"
  node "$SCRIPT_DIR/tools/build_models.mjs" "$SOURCE_PROJECT" "$SCRIPT_DIR/resources/models"
fi
if [[ ! -f "$SCRIPT_DIR/resources/map/world-map.png" || "${2:-}" == "--rebuild-world" ]]; then
  node "$SCRIPT_DIR/tools/build_map.mjs" "$SCRIPT_DIR/resources/world" "$SCRIPT_DIR/resources/map/world-map.png"
fi

rm -rf "$STAGE_ROOT" "$FINAL_DIR"
mkdir -p "$BUILD_DIR/bin" "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources/world" "$APP_DIR/Contents/Resources/models" "$APP_DIR/Contents/Resources/textures" "$APP_DIR/Contents/Resources/map"

COMMON=(
  -std=c++20 -O3 -DNDEBUG -fobjc-arc -fblocks
  -mmacosx-version-min=12.0 -isystem "$CXX_HEADERS"
  "$SCRIPT_DIR/src/main.mm"
  -framework Cocoa -framework Metal -framework MetalKit -framework QuartzCore
)

clang++ "${COMMON[@]}" -arch arm64 -o "$BUILD_DIR/bin/Chisinau3DNative-arm64"
clang++ "${COMMON[@]}" -arch x86_64 -o "$BUILD_DIR/bin/Chisinau3DNative-x86_64"
lipo -create "$BUILD_DIR/bin/Chisinau3DNative-arm64" "$BUILD_DIR/bin/Chisinau3DNative-x86_64" -output "$APP_DIR/Contents/MacOS/Chisinau3DNative"

cp -X "$SCRIPT_DIR/Info.plist" "$APP_DIR/Contents/Info.plist"
cp -X "$SOURCE_PROJECT/build/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
ditto --norsrc --noextattr "$SCRIPT_DIR/resources/world" "$APP_DIR/Contents/Resources/world"
ditto --norsrc --noextattr "$SCRIPT_DIR/resources/models" "$APP_DIR/Contents/Resources/models"
ditto --norsrc --noextattr "$SCRIPT_DIR/resources/map" "$APP_DIR/Contents/Resources/map"
cp -X "$SOURCE_PROJECT/public/streets/resources/textures/surfaces/asphalt_diffuse.png" "$APP_DIR/Contents/Resources/textures/asphalt_diffuse.png"
cp -X "$SOURCE_PROJECT/public/streets/resources/textures/surfaces/concrete_unmarked_road_diffuse.png" "$APP_DIR/Contents/Resources/textures/pavement_diffuse.png"
cp -X "$SOURCE_PROJECT/public/streets/resources/textures/surfaces/grass_diffuse.png" "$APP_DIR/Contents/Resources/textures/grass_diffuse.png"
cp -X "$SOURCE_PROJECT/public/streets/LICENSE.txt" "$APP_DIR/Contents/Resources/OpenStreetMap-and-StreetsGL-LICENSE.txt"
cp -X "$SOURCE_PROJECT/public/models/map-md/sources.json" "$APP_DIR/Contents/Resources/map-md-sources.json"
cp -X "$SOURCE_PROJECT/ASSETS.md" "$APP_DIR/Contents/Resources/ASSET-CREDITS.md"
printf 'APPL????' > "$APP_DIR/Contents/PkgInfo"

xattr -cr "$APP_DIR"
codesign --force --deep --sign - "$APP_DIR"
codesign --verify --deep --strict "$APP_DIR"
mkdir -p "$FINAL_DIR"
ditto --norsrc --noextattr "$APP_DIR" "$FINAL_DIR/Chișinău 3D.app"
xattr -cr "$FINAL_DIR/Chișinău 3D.app"
/usr/bin/xattr -d com.apple.FinderInfo "$FINAL_DIR/Chișinău 3D.app" 2>/dev/null || true
/usr/bin/xattr -d 'com.apple.fileprovider.fpfs#P' "$FINAL_DIR/Chișinău 3D.app" 2>/dev/null || true
file "$APP_DIR/Contents/MacOS/Chisinau3DNative"
du -sh "$APP_DIR"
