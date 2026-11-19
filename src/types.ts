export type HingeStatus = 'closed' | 'partiallyOpen' | 'fullyOpen' | 'unknown';

/**
 * - `book`: half open, fold runs top to bottom (left/right panes)
 * - `tabletop`: half open, fold runs left to right (top/bottom panes)
 * - `flat`: fully open
 * - `closed`: folded shut, app is on the outer display
 * - `unknown`: not a foldable, or the OS gives no signal
 */
export type Posture = 'book' | 'tabletop' | 'flat' | 'closed' | 'unknown';

/** `vertical`: fold runs top to bottom. `horizontal`: fold runs left to right. */
export type FoldOrientation = 'vertical' | 'horizontal';

export type SizeClass = 'compact' | 'regular';

export type Rect = { x: number; y: number; width: number; height: number };

export type ReservedRegion = {
  /** `division`: the fold/hinge. `occlusion`: camera, cutout, Dynamic Island. */
  kind: 'division' | 'occlusion';
  /** Points/dp, relative to the app window. */
  frame: Rect;
  active: boolean;
  /** Content cannot usefully span this region (always true for an active iOS fold). */
  separating: boolean;
};

export type FoldRegion = ReservedRegion & {
  kind: 'division';
  orientation: FoldOrientation;
};

export type Hinge = {
  status: HingeStatus;
  /** Degrees, 0 closed to 180 flat. null when unknown or angle updates are off. */
  angle: number | null;
};

export type FoldableState = {
  /** The OS exposes fold APIs (iOS 27.1+, Android 7+ with WindowManager). Not proof of a fold. */
  isSupported: boolean;
  /** The device has a hinge or fold. */
  isFoldable: boolean;
  posture: Posture;
  hinge: Hinge;
  /** Active fold that splits the window, or null. */
  fold: FoldRegion | null;
  /** Active cameras/cutouts. */
  occlusions: ReservedRegion[];
  /** All regions, including inactive ones. */
  regions: ReservedRegion[];
  /** Physical side the system puts its vertical bar on (iPhone Duo), or null. */
  verticalBarEdge: 'left' | 'right' | null;
  /** Native size classes (iOS). null means derive from window size. */
  nativeSizeClass: { horizontal: SizeClass; vertical: SizeClass } | null;
};
