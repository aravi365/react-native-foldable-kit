export * from '../lib/index';
import type { FoldableState } from '../lib/index';
/** Merge into the mocked state; pass nothing to reset. */
export function setMockFoldableState(partial?: Partial<FoldableState>): void;
