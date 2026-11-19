import type { EventSubscription } from 'react-native';
import native from './NativeFoldableKit';
import type { NativeFoldableState } from './NativeFoldableKit';
import { DEFAULT_STATE, normalize } from './core';
import type { FoldableState } from './types';

let state: FoldableState = DEFAULT_STATE;
let started = false;
let subscription: EventSubscription | null = null;
let angleUsers = 0;
const listeners = new Set<() => void>();

function apply(raw: NativeFoldableState): void {
  const next = normalize(raw, state);
  state = next;
  listeners.forEach((l) => l());
}

function start(): void {
  if (started || native == null) return;
  started = true;
  try {
    state = normalize(native.getState(), state);
    subscription = native.onChange(apply);
  } catch {
    state = DEFAULT_STATE;
  }
}

/** Current snapshot. Referentially stable until something changes. */
export function getFoldableState(): FoldableState {
  start();
  return state;
}

/** Called on every change. Returns an unsubscribe function. */
export function addFoldableListener(listener: (state: FoldableState) => void): () => void {
  start();
  const wrapped = () => listener(state);
  listeners.add(wrapped);
  return () => {
    listeners.delete(wrapped);
  };
}

export function subscribe(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Continuous angle updates cost events, so they are only on while something asks for them. */
export function retainAngleUpdates(): () => void {
  start();
  angleUsers += 1;
  if (angleUsers === 1) native?.setAngleUpdatesEnabled(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    angleUsers -= 1;
    if (angleUsers === 0) native?.setAngleUpdatesEnabled(false);
  };
}

/** Test helper. */
export function _reset(): void {
  subscription?.remove();
  subscription = null;
  state = DEFAULT_STATE;
  started = false;
  angleUsers = 0;
  listeners.clear();
}
