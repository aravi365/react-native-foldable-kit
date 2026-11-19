#!/usr/bin/env bash
# Captures the demo app in each posture into docs/screenshots/<platform>-<posture>.png.
# Usage: scripts/capture-screenshots.sh ios|android
set -euo pipefail

PLATFORM="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/screenshots"
mkdir -p "$OUT"

case "$PLATFORM" in
  ios)
    xcrun simctl list devices booted | grep -q Booted || { echo "Boot the iPhone Duo simulator first."; exit 1; }
    HOW="in the simulator's Device Hub controls"
    shot() { xcrun simctl io booted screenshot --type=png "$1" >/dev/null; }
    ;;
  android)
    adb get-state >/dev/null 2>&1 || { echo "Start a foldable emulator (Pixel Fold / 7.6\" Fold-in) first."; exit 1; }
    HOW="in the emulator's extended controls (… > Virtual sensors > posture)"
    shot() { adb exec-out screencap -p > "$1"; }
    ;;
  *)
    echo "Usage: $0 ios|android"; exit 1 ;;
esac

for POSTURE in closed flat book tabletop; do
  case "$POSTURE" in
    closed)   HINT="Close the device (outer display)" ;;
    flat)     HINT="Open it fully flat (inner display)" ;;
    book)     HINT="Half-open it like a book, held upright" ;;
    tabletop) HINT="Half-open it and rotate to landscape (laptop/tabletop)" ;;
  esac
  read -r -p "[$POSTURE] $HINT $HOW, wait for the badge to read $(echo "$POSTURE" | tr a-z A-Z), then press Enter (s to skip): " ans
  [ "$ans" = "s" ] && continue
  shot "$OUT/$PLATFORM-$POSTURE.png"
  echo "  saved docs/screenshots/$PLATFORM-$POSTURE.png"
done

{
  echo "# Screenshots"
  echo
  echo "Real captures of \`example/App.tsx\`, made with \`scripts/capture-screenshots.sh\`."
  for P in ios android; do
    ls "$OUT"/$P-*.png >/dev/null 2>&1 || continue
    [ "$P" = ios ] && echo && echo "## iPhone Duo (iOS simulator)" || { echo; echo "## Android foldable (emulator)"; }
    echo
    for POSTURE in closed flat book tabletop; do
      if [ -f "$OUT/$P-$POSTURE.png" ]; then echo "<img src=\"screenshots/$P-$POSTURE.png\" width=\"360\" alt=\"$P $POSTURE\" /> "; fi
    done
  done
} > "$ROOT/docs/SCREENSHOTS.md"
echo "Done. Wrote docs/SCREENSHOTS.md. Commit docs/ to publish them."
