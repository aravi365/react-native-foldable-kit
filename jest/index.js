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

const fold = (orientation, frame) => ({ kind: 'division', active: true, separating: true, orientation, frame });
const foldable = { ...DEFAULT, isSupported: true, isFoldable: true };
const PRESETS = {
  phone: DEFAULT,
  closed: { ...foldable, posture: 'closed', hinge: { status: 'closed', angle: 0 }, nativeSizeClass: { horizontal: 'compact', vertical: 'regular' } },
  flat: { ...foldable, posture: 'flat', hinge: { status: 'fullyOpen', angle: 180 }, nativeSizeClass: { horizontal: 'regular', vertical: 'regular' } },
  book: { ...foldable, posture: 'book', hinge: { status: 'partiallyOpen', angle: 90 }, fold: fold('vertical', { x: 426, y: 0, width: 0, height: 883 }), nativeSizeClass: { horizontal: 'regular', vertical: 'regular' } },
  tabletop: { ...foldable, posture: 'tabletop', hinge: { status: 'partiallyOpen', angle: 90 }, fold: fold('horizontal', { x: 0, y: 426, width: 883, height: 0 }), nativeSizeClass: { horizontal: 'regular', vertical: 'regular' } },
};
PRESETS.book.regions = [PRESETS.book.fold];
PRESETS.tabletop.regions = [PRESETS.tabletop.fold];

let state = DEFAULT;
const listeners = new Set();

/** Pass a preset ('phone' | 'closed' | 'flat' | 'book' | 'tabletop'), a partial state to merge, or nothing to reset. */
function setMockFoldableState(next) {
  state = typeof next === 'string' ? PRESETS[next] : next ? { ...state, ...next } : DEFAULT;
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
  PRESETS,
  setMockFoldableState,
  getFoldableState: () => state,
  addFoldableListener: (l) => (listeners.add(l), () => listeners.delete(l)),
  useFoldable: (selector) => useStore(selector || ((s) => s)),
  useFoldLayout: () => ({ ref: { current: null }, onLayout: () => {}, fold: state.fold }),
  FoldAwareView: ({ children }) => children(state.fold),
  shallowEqual: (a, b) => a === b || (a && b && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k])),
  foldInRect: () => null,
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
