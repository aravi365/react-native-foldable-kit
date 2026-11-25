import type { NativeFoldableState, NativeRegion } from './NativeFoldableKit';

type Box = { x: number; y: number; width: number; height: number };

export type WebSignals = {
  /** window.viewport.segments (Viewport Segments API), or null where unsupported. */
  segments: Box[] | null;
  /** navigator.devicePosture.type (Device Posture API), or null where unsupported. */
  posture: 'continuous' | 'folded' | null;
  /** A fold or folded posture was seen earlier in this page's life. */
  sawFold: boolean;
};

/** The space between two segments: the fold, in CSS pixels. */
function divisionBetween(a: Box, b: Box): NativeRegion {
  const sideBySide = b.x >= a.x + a.width - 1;
  return sideBySide
    ? { kind: 'division', x: a.x + a.width, y: Math.min(a.y, b.y), width: Math.max(0, b.x - (a.x + a.width)), height: Math.max(a.height, b.height), active: true, separating: true }
    : { kind: 'division', x: Math.min(a.x, b.x), y: a.y + a.height, width: Math.max(a.width, b.width), height: Math.max(0, b.y - (a.y + a.height)), active: true, separating: true };
}

export function webState({ segments, posture, sawFold }: WebSignals): NativeFoldableState {
  const ordered = (segments ?? []).slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const regions: NativeRegion[] = [];
  for (let i = 1; i < ordered.length; i++) regions.push(divisionBetween(ordered[i - 1]!, ordered[i]!));
  const split = regions.length > 0;
  const hingeStatus = posture === 'folded' ? 'partiallyOpen' : split ? 'fullyOpen' : 'unknown';
  return {
    isSupported: segments !== null || posture !== null,
    isFoldable: split || posture === 'folded' || sawFold,
    hingeStatus,
    hingeAngle: -1,
    verticalBarEdge: 'none',
    horizontalSizeClass: 'unspecified',
    verticalSizeClass: 'unspecified',
    regions,
  };
}
