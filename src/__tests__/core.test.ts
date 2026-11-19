import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSplit, DEFAULT_STATE, normalize, sizeClassFromWindow } from '../core.ts';

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
