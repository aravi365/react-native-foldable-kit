'use strict';
// Usage: jest.mock('react-native-foldable-kit', () => require('react-native-foldable-kit/jest'));
const React = require('react');

const DEFAULT = {
  isSupported: false,
  isFoldable: false,
  posture: 'unknown',
  hinge: { status: 'unknown', angle: null },
  fold: null,
  occlusions: [],
  regions: [],
  verticalBarEdge: null,
  nativeSizeClass: null,
};

let state = DEFAULT;
const listeners = new Set();

function setMockFoldableState(partial) {
  state = partial ? { ...state, ...partial } : DEFAULT;
  listeners.forEach((l) => l(state));
}

function useStore(pick) {
  const get = () => pick(state);
  return React.useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    get,
    get
  );
}

const sizeClassFromWindow = (w, h) => ({
  horizontal: w >= 600 ? 'regular' : 'compact',
  vertical: h >= 480 ? 'regular' : 'compact',
});

module.exports = {
  setMockFoldableState,
  getFoldableState: () => state,
  addFoldableListener: (l) => (listeners.add(l), () => listeners.delete(l)),
  useFoldable: () => useStore((s) => s),
  usePosture: () => useStore((s) => s.posture),
  useFoldRegion: () => useStore((s) => s.fold),
  useOcclusions: () => useStore((s) => s.occlusions),
  useIsFoldable: () => useStore((s) => s.isFoldable),
  useHinge: () => useStore((s) => s.hinge),
  useVerticalBarEdge: () => useStore((s) => s.verticalBarEdge),
  useSizeClass: () => useStore((s) => s.nativeSizeClass ?? { horizontal: 'compact', vertical: 'regular' }),
  useIsWide: () => useStore((s) => (s.nativeSizeClass ? s.nativeSizeClass.horizontal === 'regular' : false)),
  FoldableSplit: ({ primary, secondary }) => React.createElement(React.Fragment, null, primary, secondary),
  FoldableRoot: ({ children }) => React.createElement(React.Fragment, null, children),
  useAvailableSize: () => ({ width: 390, height: 844 }),
  computeRootLayout: () => ({ avoid: false }),
  computeSplit: () => ({ mode: 'compact' }),
  foldOrientation: (f) => (f.height >= f.width ? 'vertical' : 'horizontal'),
  sizeClassFromWindow,
};
