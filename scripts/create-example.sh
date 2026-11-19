#!/usr/bin/env bash
# Creates a bare React Native demo app in example/FoldableKitDemo using this checkout of the package.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/example/FoldableKitDemo"

if [ ! -d "$APP" ]; then
  npx -y @react-native-community/cli@latest init FoldableKitDemo \
    --directory "$APP" --skip-git-init --install-pods false
fi

rm -f "$APP"/react-native-foldable-kit-*.tgz
(cd "$ROOT" && npm install --no-audit --no-fund && npm pack --silent --pack-destination "$APP")

cd "$APP"
npm install --no-audit --no-fund ./react-native-foldable-kit-*.tgz react-native-safe-area-context
cp "$ROOT/example/App.tsx" App.tsx

if [ "$(uname)" = "Darwin" ]; then
  (cd ios && bundle install && bundle exec pod install)
fi

cat <<MSG

Demo app ready: $APP
  iOS (Xcode 27.1, iPhone Duo simulator):  cd example/FoldableKitDemo && npx react-native run-ios
  Android (foldable emulator):              cd example/FoldableKitDemo && npx react-native run-android
Then capture screenshots:                   scripts/capture-screenshots.sh ios|android
MSG
