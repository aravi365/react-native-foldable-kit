import { useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { useWindowDimensions } from 'react-native';
import { foldInRect, sizeClassFromWindow } from './core';
import { PaneSizeContext } from './paneContext';
import { getFoldableState, retainAngleUpdates, subscribe } from './store';
import { useWindowRect, type MeasuredView } from './useWindowRect';
import type { FoldRegion, FoldableState, Hinge, Posture, ReservedRegion, SizeClass } from './types';

function useField<T>(pick: (s: FoldableState) => T): T {
  const get = () => pick(getFoldableState());
  return useSyncExternalStore(subscribe, get, get);
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a) as (keyof T)[];
  return ka.length === Object.keys(b).length && ka.every((k) => Object.is(a[k], b[k]));
}

/**
 * The whole snapshot, or any part of it through a selector. Re-renders only when the selected value changes
 * (by `isEqual`, default Object.is; pass `shallowEqual` for selectors that build objects).
 */
export function useFoldable(): FoldableState;
export function useFoldable<T>(selector: (state: FoldableState) => T, isEqual?: (a: T, b: T) => boolean): T;
export function useFoldable<T>(
  selector?: (state: FoldableState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T | FoldableState {
  const cache = useRef<{ state: FoldableState; select: unknown; value: unknown } | null>(null);
  const get = () => {
    const state = getFoldableState();
    if (!selector) return state;
    const c = cache.current;
    if (c && c.state === state && c.select === selector) return c.value as T;
    const next = selector(state);
    const value = c && isEqual(c.value as T, next) ? (c.value as T) : next;
    cache.current = { state, select: selector, value };
    return value;
  };
  return useSyncExternalStore(subscribe, get, get);
}

/** `book` | `tabletop` | `flat` | `closed` | `unknown`. */
export function usePosture(): Posture {
  return useField((s) => s.posture);
}

/** Active fold splitting the window, or null. Window coordinates in points/dp. */
export function useFoldRegion(): FoldRegion | null {
  return useField((s) => s.fold);
}

/**
 * The fold relative to one of your views. Spread `ref` and `onLayout` on the view; `fold` is null unless the fold
 * crosses it, and its frame is in that view's coordinates.
 */
export function useFoldLayout(): MeasuredView & { fold: FoldRegion | null } {
  const { ref, onLayout, rect } = useWindowRect();
  const fold = useFoldRegion();
  const prev = useRef<FoldRegion | null>(null);
  const next = foldInRect(rect, fold);
  const same =
    prev.current && next && prev.current.orientation === next.orientation &&
    shallowEqual(prev.current.frame, next.frame);
  if (!same) prev.current = next;
  return { ref, onLayout, fold: prev.current };
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

/** Size the app can use: the FoldableRoot pane while it avoids the fold, otherwise the window. */
export function useAvailableSize(): { width: number; height: number } {
  const pane = useContext(PaneSizeContext);
  const { width, height } = useWindowDimensions();
  return pane ?? { width, height };
}

/** Horizontal/vertical size class. Native traits on iOS, window size elsewhere, pane size inside FoldableRoot. */
export function useSizeClass(): { horizontal: SizeClass; vertical: SizeClass } {
  const native = useField((s) => s.nativeSizeClass);
  const pane = useContext(PaneSizeContext);
  const { width, height } = useWindowDimensions();
  if (pane) return sizeClassFromWindow(pane.width, pane.height);
  return native ?? sizeClassFromWindow(width, height);
}

/** Shorthand: true when there is room for two panes (regular width). */
export function useIsWide(): boolean {
  return useSizeClass().horizontal === 'regular';
}
