import type { NativeFoldableState, NativeRegion } from './NativeFoldableKit';
import type {
  FoldOrientation,
  FoldRegion,
  FoldableState,
  Hinge,
  HingeStatus,
  Posture,
  Rect,
  ReservedRegion,
  SizeClass,
} from './types';

export const DEFAULT_STATE: FoldableState = Object.freeze({
  isSupported: false,
  isFoldable: false,
  posture: 'unknown',
  hinge: Object.freeze({ status: 'unknown', angle: null }) as Hinge,
  fold: null,
  occlusions: [],
  regions: [],
  verticalBarEdge: null,
  nativeSizeClass: null,
}) as FoldableState;

const STATUSES: readonly HingeStatus[] = ['closed', 'partiallyOpen', 'fullyOpen'];
const CLOSED_BELOW = 15;
const FLAT_ABOVE = 165;

export function foldOrientation(frame: Rect): FoldOrientation {
  return frame.height >= frame.width ? 'vertical' : 'horizontal';
}

export function derivePosture(
  hinge: Hinge,
  fold: FoldRegion | null,
  isFoldable: boolean
): Posture {
  switch (hinge.status) {
    case 'partiallyOpen':
      if (fold) return fold.orientation === 'vertical' ? 'book' : 'tabletop';
      break;
    case 'fullyOpen':
      return 'flat';
    case 'closed':
      return 'closed';
  }
  if (!isFoldable || hinge.angle == null) return 'unknown';
  if (hinge.angle <= CLOSED_BELOW) return 'closed';
  if (hinge.angle >= FLAT_ABOVE) return 'flat';
  return 'unknown';
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function sameRegion(a: ReservedRegion, b: ReservedRegion): boolean {
  return (
    a.kind === b.kind &&
    a.active === b.active &&
    a.separating === b.separating &&
    sameRect(a.frame, b.frame)
  );
}

function sameList(a: ReservedRegion[], b: ReservedRegion[]): boolean {
  return a.length === b.length && a.every((r, i) => sameRegion(r, b[i]!));
}

function toRegion(r: NativeRegion): ReservedRegion {
  return {
    kind: r.kind === 'division' ? 'division' : 'occlusion',
    frame: { x: r.x, y: r.y, width: r.width, height: r.height },
    active: r.active === true,
    separating: r.separating === true,
  };
}

function sizeClass(v: string): SizeClass | null {
  return v === 'compact' || v === 'regular' ? v : null;
}

/** Converts a native payload, reusing objects from `prev` that did not change so hooks skip re-renders. */
export function normalize(raw: NativeFoldableState, prev: FoldableState = DEFAULT_STATE): FoldableState {
  const status = STATUSES.find((s) => s === raw.hingeStatus) ?? 'unknown';
  const angle = Number.isFinite(raw.hingeAngle) && raw.hingeAngle >= 0 ? raw.hingeAngle : null;
  const isFoldable = raw.isFoldable === true;

  const nextRegions = (raw.regions ?? []).map(toRegion);
  const regions = sameList(nextRegions, prev.regions) ? prev.regions : nextRegions;

  const nextOcclusions = regions.filter((r) => r.kind === 'occlusion' && r.active);
  const occlusions = sameList(nextOcclusions, prev.occlusions) ? prev.occlusions : nextOcclusions;

  const rawFold = regions.find((r) => r.kind === 'division' && r.active && r.separating);
  let fold: FoldRegion | null = rawFold
    ? { ...rawFold, kind: 'division', orientation: foldOrientation(rawFold.frame) }
    : null;
  if (fold && prev.fold && sameRegion(fold, prev.fold)) fold = prev.fold;

  const hinge =
    prev.hinge.status === status && prev.hinge.angle === angle ? prev.hinge : { status, angle };

  const h = sizeClass(raw.horizontalSizeClass);
  const v = sizeClass(raw.verticalSizeClass);
  const nativeSizeClass =
    h && v
      ? prev.nativeSizeClass?.horizontal === h && prev.nativeSizeClass.vertical === v
        ? prev.nativeSizeClass
        : { horizontal: h, vertical: v }
      : null;

  const verticalBarEdge =
    raw.verticalBarEdge === 'left' || raw.verticalBarEdge === 'right' ? raw.verticalBarEdge : null;

  return {
    isSupported: raw.isSupported === true,
    isFoldable,
    posture: derivePosture(hinge, fold, isFoldable),
    hinge,
    fold,
    occlusions,
    regions,
    verticalBarEdge,
    nativeSizeClass,
  };
}

/** Material window size classes; iOS reports regular width on iPhone Duo's inner display (≈ 600pt+). */
export function sizeClassFromWindow(width: number, height: number) {
  return {
    horizontal: (width >= 600 ? 'regular' : 'compact') as SizeClass,
    vertical: (height >= 480 ? 'regular' : 'compact') as SizeClass,
  };
}

export type SplitLayout =
  | { mode: 'fold' | 'split'; direction: 'row' | 'column'; first: number; gap: number }
  | { mode: 'compact' };

export type SplitOptions = {
  ratio: number;
  minPaneSize: number;
  splitMinWidth: number;
};

/** Where to cut a container: along the fold if it crosses the container, else by ratio when wide enough. */
export function computeSplit(container: Rect, fold: FoldRegion | null, o: SplitOptions): SplitLayout {
  if (container.width <= 0 || container.height <= 0) return { mode: 'compact' };

  if (fold) {
    const vertical = fold.orientation === 'vertical';
    const start = vertical ? fold.frame.x - container.x : fold.frame.y - container.y;
    const gap = vertical ? fold.frame.width : fold.frame.height;
    const total = vertical ? container.width : container.height;
    const crossStart = vertical ? fold.frame.y - container.y : fold.frame.x - container.x;
    const crossLen = vertical ? fold.frame.height : fold.frame.width;
    const crossTotal = vertical ? container.height : container.width;
    const crosses = crossStart < crossTotal && crossStart + crossLen > 0;
    if (crosses && start >= o.minPaneSize && total - start - gap >= o.minPaneSize) {
      return { mode: 'fold', direction: vertical ? 'row' : 'column', first: start, gap };
    }
  }

  if (container.width >= o.splitMinWidth) {
    const ratio = Math.min(Math.max(o.ratio, 0.1), 0.9);
    return { mode: 'split', direction: 'row', first: Math.round(container.width * ratio), gap: 0 };
  }
  return { mode: 'compact' };
}
