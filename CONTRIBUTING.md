# Contributing

Thanks for helping make React Native apps work well on foldables.

## Reporting a bug

Open an issue with the bug report template. The most useful reports include:

- The device or simulator (for example iPhone Duo simulator, iOS 27.1, or Galaxy Z Fold 6, Android 16).
- React Native and react-native-foldable-kit versions.
- What `useFoldable()` returned, and what you expected.
- A screenshot of the demo app's status panel in that posture, if you can.

Reports from real hardware are especially valuable: so far the package is verified on simulators.

## Development

```sh
npm install
npm run typecheck
npm test          # unit tests (Node) + component tests (Jest)
npm run build
```

To try changes in an app, run `scripts/create-example.sh`, then launch the demo on a foldable simulator or emulator. `scripts/capture-screenshots.sh ios|android` captures each posture.

## Pull requests

- Keep changes focused and the package dependency-free.
- Add or update tests for behaviour changes. Pure logic goes in `src/core.ts` with a test in `src/__tests__/core.test.ts`.
- Update `CHANGELOG.md` and the README when the public API changes.
- CI must pass.
