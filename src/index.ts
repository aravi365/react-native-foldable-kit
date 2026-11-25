export * from './types';
export { addFoldableListener, getFoldableState } from './store';
export {
  shallowEqual,
  useAvailableSize,
  useFoldable,
  useFoldLayout,
  useFoldRegion,
  useHinge,
  useIsFoldable,
  useIsWide,
  useOcclusions,
  usePosture,
  useSizeClass,
  useVerticalBarEdge,
} from './hooks';
export { FoldableSplit, type FoldableSplitProps } from './FoldableSplit';
export { FoldableRoot, type FoldableRootProps } from './FoldableRoot';
export { FoldAwareView, type FoldAwareViewProps } from './FoldAwareView';
export { computeRootLayout, computeSplit, foldInRect, foldOrientation, sizeClassFromWindow, type RootLayout, type SplitLayout } from './core';
