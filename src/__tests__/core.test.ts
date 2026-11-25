import { test } from 'node:test';
import { webState } from '../web.ts';
import assert from 'node:assert/strict';
import { computeRootLayout, computeSplit, foldInRect, DEFAULT_STATE, normalize, sizeClassFromWindow } from '../core.ts';

const base = {
  isSupported: true,
  isFoldable: true,
  hingeStatus: 'unknown',
  hingeAngle: -1,
  verticalBarEdge: 'none',
  horizontalSizeClass: 'unspecified',
  verticalSizeClass: 'unspecified',
  regions: [] as any[],
};

const vFold = { kind: 'division', x: 340, y: 0, width: 20, height: 800, active: true, separating: true };
const hFold = { kind: 'division', x: 0, y: 400, width: 700, height: 0, active: true, separating: true };
const opts = { ratio: 0.5, minPaneSize: 200, splitMinWidth: 600 };

test('book posture from vertical fold', () => {
  const s = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [vFold] });
  assert.equal(s.posture, 'book');
  assert.equal(s.fold?.orientation, 'vertical');
});

test('tabletop posture from horizontal fold', () => {
  const s = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [hFold] });
  assert.equal(s.posture, 'tabletop');
});

test('non-separating division is not a fold', () => {
  const s = normalize({ ...base, hingeStatus: 'fullyOpen', regions: [{ ...vFold, separating: false }] });
  assert.equal(s.fold, null);
  assert.equal(s.posture, 'flat');
});

test('dual-screen: flat but separating keeps fold', () => {
  const s = normalize({ ...base, hingeStatus: 'fullyOpen', regions: [vFold] });
  assert.equal(s.posture, 'flat');
  assert.ok(s.fold);
});

test('android closed via angle', () => {
  assert.equal(normalize({ ...base, hingeAngle: 3 }).posture, 'closed');
  assert.equal(normalize({ ...base, hingeAngle: 90 }).posture, 'unknown');
  assert.equal(normalize({ ...base, isFoldable: false, hingeAngle: 3 }).posture, 'unknown');
});

test('nearly flat without a separating fold reads flat', () => {
  assert.equal(normalize({ ...base, hingeStatus: 'partiallyOpen', hingeAngle: 172 }).posture, 'flat');
  assert.equal(normalize({ ...base, hingeStatus: 'partiallyOpen', hingeAngle: 120 }).posture, 'unknown');
});

test('angle -1 means unknown', () => {
  assert.equal(normalize({ ...base, hingeAngle: -1 }).hinge.angle, null);
});

test('structural sharing keeps references stable', () => {
  const raw = { ...base, hingeStatus: 'partiallyOpen', regions: [vFold, { ...vFold, kind: 'occlusion', separating: false }] };
  const a = normalize(raw);
  const b = normalize({ ...raw, regions: raw.regions.map((r) => ({ ...r })) }, a);
  assert.equal(a.fold, b.fold);
  assert.equal(a.regions, b.regions);
  assert.equal(a.occlusions, b.occlusions);
  assert.equal(a.hinge, b.hinge);
});

test('garbage payload falls back safely', () => {
  const s = normalize({ ...base, hingeStatus: 'weird', verticalBarEdge: 'up', hingeAngle: NaN, regions: undefined as any });
  assert.deepEqual(
    { ...s, regions: [], occlusions: [] },
    { ...DEFAULT_STATE, isSupported: true, isFoldable: true, regions: [], occlusions: [] }
  );
});

test('vertical bar edge and native size classes pass through', () => {
  const s = normalize({ ...base, verticalBarEdge: 'right', horizontalSizeClass: 'regular', verticalSizeClass: 'compact' });
  assert.equal(s.verticalBarEdge, 'right');
  assert.deepEqual(s.nativeSizeClass, { horizontal: 'regular', vertical: 'compact' });
});

test('split along vertical fold', () => {
  const s = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [vFold] });
  const l = computeSplit({ x: 0, y: 0, width: 700, height: 800 }, s.fold, opts);
  assert.deepEqual(l, { mode: 'fold', direction: 'row', first: 340, gap: 20 });
});

test('split along fold respects container offset', () => {
  const s = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [hFold] });
  const l = computeSplit({ x: 0, y: 100, width: 700, height: 700 }, s.fold, opts);
  assert.deepEqual(l, { mode: 'fold', direction: 'column', first: 300, gap: 0 });
});

test('fold outside container falls back to ratio/compact', () => {
  const s = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [vFold] });
  assert.deepEqual(computeSplit({ x: 400, y: 0, width: 300, height: 800 }, s.fold, opts), { mode: 'compact' });
  assert.deepEqual(computeSplit({ x: 0, y: 0, width: 300, height: 800 }, s.fold, opts), { mode: 'compact' });
});

test('wide without fold splits by ratio', () => {
  assert.deepEqual(computeSplit({ x: 0, y: 0, width: 800, height: 600 }, null, { ...opts, ratio: 0.4 }), {
    mode: 'split',
    direction: 'row',
    first: 320,
    gap: 0,
  });
});

test('size class from window', () => {
  assert.deepEqual(sizeClassFromWindow(390, 844), { horizontal: 'compact', vertical: 'regular' });
  assert.deepEqual(sizeClassFromWindow(700, 900), { horizontal: 'regular', vertical: 'regular' });
  assert.deepEqual(sizeClassFromWindow(844, 390), { horizontal: 'regular', vertical: 'compact' });
});

test('root keeps app on one side of the fold', () => {
  const book = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [vFold] });
  const box = { x: 0, y: 0, width: 700, height: 800 };
  assert.deepEqual(computeRootLayout(box, book.fold, 'start'), { avoid: true, direction: 'row', reverse: false, size: 340, gap: 20 });
  assert.deepEqual(computeRootLayout(box, book.fold, 'end'), { avoid: true, direction: 'row', reverse: true, size: 340, gap: 20 });
  const table = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [hFold] });
  assert.deepEqual(computeRootLayout({ x: 0, y: 0, width: 700, height: 900 }, table.fold, 'larger'), { avoid: true, direction: 'column', reverse: true, size: 500, gap: 0 });
  assert.deepEqual(computeRootLayout(box, null, 'larger'), { avoid: false });
  assert.deepEqual(computeRootLayout({ x: 400, y: 0, width: 300, height: 800 }, book.fold, 'larger'), { avoid: false });
});

test('fold relative to a view', () => {
  const book = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [vFold] }).fold;
  assert.deepEqual(foldInRect({ x: 0, y: 100, width: 700, height: 300 }, book)?.frame, { x: 340, y: 0, width: 20, height: 300 });
  assert.equal(foldInRect({ x: 400, y: 0, width: 300, height: 800 }, book), null);
  assert.equal(foldInRect({ x: 0, y: 0, width: 340, height: 800 }, book), null);
  const zero = normalize({ ...base, hingeStatus: 'partiallyOpen', regions: [{ ...hFold, height: 0 }] }).fold;
  assert.deepEqual(foldInRect({ x: 0, y: 300, width: 700, height: 300 }, zero)?.frame, { x: 0, y: 100, width: 700, height: 0 });
  assert.equal(foldInRect({ x: 0, y: 0, width: 700, height: 800 }, null), null);
});

test('web: one segment is not a fold', () => {
  const s = webState({ segments: [{ x: 0, y: 0, width: 800, height: 600 }], posture: 'continuous', sawFold: false });
  assert.equal(s.isSupported, true);
  assert.equal(s.isFoldable, false);
  assert.equal(normalize(s).posture, 'unknown');
});

test('web: folded with side-by-side segments is book', () => {
  const s = webState({ segments: [{ x: 420, y: 0, width: 400, height: 900 }, { x: 0, y: 0, width: 400, height: 900 }], posture: 'folded', sawFold: false });
  const n = normalize(s);
  assert.equal(n.posture, 'book');
  assert.deepEqual(n.fold?.frame, { x: 400, y: 0, width: 20, height: 900 });
});

test('web: folded with stacked segments is tabletop; flat dual screen keeps the fold', () => {
  const stacked = [{ x: 0, y: 0, width: 900, height: 400 }, { x: 0, y: 400, width: 900, height: 400 }];
  assert.equal(normalize(webState({ segments: stacked, posture: 'folded', sawFold: false })).posture, 'tabletop');
  const flat = normalize(webState({ segments: stacked, posture: 'continuous', sawFold: false }));
  assert.equal(flat.posture, 'flat');
  assert.deepEqual(flat.fold?.frame, { x: 0, y: 400, width: 900, height: 0 });
});

test('web: no APIs means unsupported defaults', () => {
  const s = webState({ segments: null, posture: null, sawFold: false });
  assert.equal(s.isSupported, false);
  assert.equal(normalize(s).posture, 'unknown');
});
