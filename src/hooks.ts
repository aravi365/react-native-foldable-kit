import { useEffect, useSyncExternalStore } from 'react';
import { useWindowDimensions } from 'react-native';
import { sizeClassFromWindow } from './core';
import { getFoldableState, retainAngleUpdates, subscribe } from './store';
import type { FoldRegion, FoldableState, Hinge, Posture, ReservedRegion, SizeClass } from './types';

function useField<T>(pick: (s: FoldableState) => T): T {
  const get = () => pick(getFoldableState());
  return useSyncExternalStore(subscribe, get, get);
}

/** Whole snapshot. Prefer the narrower hooks below to re-render less. */
export function useFoldable(): FoldableState {
  return useSyncExternalStore(subscribe, getFoldableState, getFoldableState);
}

/** `book` | `tabletop` | `flat` | `closed` | `unknown`. */
export function usePosture(): Posture {
  return useField((s) => s.posture);
}

/** Active fold splitting the window, or null. Window coordinates in points/dp. */
export function useFoldRegion(): FoldRegion | null {
  return useField((s) => s.fold);
}

/** Active camera/cutout regions to keep controls away from. */
export function useOcclusions(): ReservedRegion[] {
  return useField((s) => s.occlusions);
}

/** True on devices with a hinge or fold. */
export function useIsFoldable(): boolean {
  return useField((s) => s.isFoldable);
}

/**
 * Hinge status, plus a live angle while `angle` is true. Use for effects, not layout.
 * Angle updates stay off until a component asks for them.
 */
export function useHinge({ angle = false }: { angle?: boolean } = {}): Hinge {
  useEffect(() => (angle ? retainAngleUpdates() : undefined), [angle]);
  return useField((s) => s.hinge);
}

/** Side the system puts its vertical bar on (iPhone Duo), or null. Put your own rail there. */
export function useVerticalBarEdge(): 'left' | 'right' | null {
  return useField((s) => s.verticalBarEdge);
}

/** Horizontal/vertical size class. Native traits on iOS, window size elsewhere. Lay out from this. */
export function useSizeClass(): { horizontal: SizeClass; vertical: SizeClass } {
  const native = useField((s) => s.nativeSizeClass);
  const { width, height } = useWindowDimensions();
  return native ?? sizeClassFromWindow(width, height);
}

/** Shorthand: true when there is room for two panes (regular width). */
export function useIsWide(): boolean {
  return useSizeClass().horizontal === 'regular';
}
