# Changelog

All notable changes to this project. Versions follow [semver](https://semver.org).

## 0.4.0

- Added web support (React Native Web, Expo web) through the Viewport Segments and Device Posture APIs, Chrome and Edge 138+: fold region, posture and foldable detection in the browser.
- CI now fails if the published JavaScript grows past 7 KB gzipped.
- Added Dependabot for dev dependencies and GitHub Actions.

## 0.3.1

- Fixed: view measuring falls back to layout values where `measureInWindow` is not available (tests, web).
- Added component tests (React Native Testing Library) for `FoldableSplit`, `FoldableRoot`, `FoldAwareView`, `useFoldable(selector)` and the Jest presets, plus CI on Node 22 and 24.
- Docs: migration guides from expo-hinge, react-native-reserved-regions, react-native-iphone-duo and react-native-hinge.

## 0.3.0

- Added `useFoldable(selector, isEqual?)` and `shallowEqual`: re-render only when the selected value changes.
- Added `FoldAwareView` and `useFoldLayout()`: the fold in a view's own coordinates.
- Added Jest presets: `setMockFoldableState('phone' | 'closed' | 'flat' | 'book' | 'tabletop')`.

## 0.2.0

- Added `FoldableRoot`: keeps the whole app on one side of the fold while half open, without remounting it.
- Added `useAvailableSize()`. Inside `FoldableRoot`, `useSizeClass()` and `useIsWide()` report the pane size.

## 0.1.1

- Fixed: a nearly flat hinge (165° or more) with no separating fold reads as `flat` instead of `unknown`.
- Added the demo app, screenshot scripts and simulator screenshots for iPhone Duo and Pixel 9 Pro Fold.

## 0.1.0

- First release: posture, hinge, fold and camera regions, size classes, the iPhone Duo vertical bar edge and `FoldableSplit`, for iOS 27.1 and Android foldables.
