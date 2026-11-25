import type { NativeFoldableState, Spec } from './NativeFoldableKit';
import { webState } from './web';

type Listener = (state: NativeFoldableState) => void;
type Rect = { x: number; y: number; width: number; height: number };

const g = globalThis as any;

const listeners = new Set<Listener>();
let sawFold = false;
let last = '';

function read(): NativeFoldableState {
  const segs = g.viewport?.segments;
  const posture = g.navigator?.devicePosture?.type;
  const state = webState({
    segments: Array.isArray(segs) ? segs.map((r: Rect) => ({ x: r.x, y: r.y, width: r.width, height: r.height })) : null,
    posture: posture === 'folded' || posture === 'continuous' ? posture : null,
    sawFold,
  });
  if (state.isFoldable) sawFold = true;
  return state;
}

function emit() {
  const state = read();
  const key = JSON.stringify(state);
  if (key === last) return;
  last = key;
  listeners.forEach((l) => l(state));
}

let attached = false;
function attach() {
  if (attached || typeof g.addEventListener !== 'function') return;
  attached = true;
  g.addEventListener('resize', emit);
  g.navigator?.devicePosture?.addEventListener?.('change', emit);
}

/** Browser implementation of the native module, backed by the Viewport Segments and Device Posture APIs. */
const web = {
  getState() {
    attach();
    const state = read();
    last = JSON.stringify(state);
    return state;
  },
  setAngleUpdatesEnabled() {},
  onChange(listener: Listener) {
    attach();
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  },
} as unknown as Spec;

export default web;
