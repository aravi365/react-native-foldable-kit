export * from './types';
export { addFoldableListener, getFoldableState } from './store';
export {
  useAvailableSize,
  useFoldable,
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
export { computeRootLayout, computeSplit, foldOrientation, sizeClassFromWindow, type RootLayout, type SplitLayout } from './core';
