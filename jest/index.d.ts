export * from '../lib/index';
import type { FoldableState } from '../lib/index';
export type MockPreset = 'phone' | 'closed' | 'flat' | 'book' | 'tabletop';
export const PRESETS: Record<MockPreset, FoldableState>;
/** A preset, a partial state to merge, or nothing to reset. */
export function setMockFoldableState(next?: MockPreset | Partial<FoldableState>): void;
