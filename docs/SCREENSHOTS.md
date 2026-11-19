# Screenshots

Real captures of [`example/App.tsx`](../example/App.tsx), framed with `scripts/frame-screenshots.py`.

## iPhone Duo (iOS 27.1 simulator)

| Closed | Fully open |
|---|---|
| <img src="screenshots/ios-closed.png" width="300" alt="iPhone Duo closed: outer display, compact width, panes stacked" /> | <img src="screenshots/ios-flat.png" width="460" alt="iPhone Duo fully open: inner display, panes side by side" /> |
| `closed · 5°`, compact × regular, vertical bar right | `fullyOpen · 180°`, regular × regular, no separating fold |

| Book | Tabletop |
|---|---|
| <img src="screenshots/ios-book.png" width="460" alt="iPhone Duo half open as a book: panes either side of a vertical fold" /> | <img src="screenshots/ios-tabletop.png" width="300" alt="iPhone Duo half open in tabletop: panes above and below a horizontal fold" /> |
| `partiallyOpen · 128°`, vertical fold `456,0 40×669` | `partiallyOpen · 128°`, horizontal fold `0,456 669×40` |

## Android foldable (Pixel 9 Pro Fold emulator, API 36.1)

| Closed | Fully open |
|---|---|
| <img src="screenshots/android-closed.png" width="260" alt="Pixel 9 Pro Fold closed: outer display, compact width, panes stacked" /> | <img src="screenshots/android-flat.png" width="420" alt="Pixel 9 Pro Fold fully open: panes side by side" /> |
| `closed · 0°` (hinge angle sensor), compact × regular | `fullyOpen · 180°`, regular × regular, no separating fold |

| Book | Tabletop |
|---|---|
| <img src="screenshots/android-book.png" width="420" alt="Pixel 9 Pro Fold half open as a book: panes either side of a vertical fold" /> | <img src="screenshots/android-tabletop.png" width="420" alt="Pixel 9 Pro Fold in tabletop: panes above and below a horizontal fold" /> |
| `partiallyOpen · 90°`, vertical fold `426,0 0×883` | `partiallyOpen · 90°`, horizontal fold `0,426 883×0` |

Pixel's fold has no physical gap (0 dp), iPhone Duo's is 40 pt; `FoldableSplit` uses whatever the platform reports.
