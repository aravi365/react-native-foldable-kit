const handlers: Record<string, () => void> = {};
let postureChange: (() => void) | undefined;
const g = globalThis as any;

beforeAll(() => {
  g.viewport = { segments: [{ x: 0, y: 0, width: 800, height: 600 }] };
  g.addEventListener = (type: string, fn: () => void) => (handlers[type] = fn);
  Object.defineProperty(g.navigator ?? (g.navigator = {}), 'devicePosture', {
    configurable: true,
    value: { type: 'continuous', addEventListener: (_: string, fn: () => void) => (postureChange = fn) },
  });
});

it('reads the browser APIs and reports changes', () => {
  const web = require('../foldableModule.web').default;
  expect(web.getState()).toMatchObject({ isSupported: true, isFoldable: false, regions: [] });
  const seen: any[] = [];
  web.onChange((s: any) => seen.push(s));
  g.viewport.segments = [{ x: 0, y: 0, width: 400, height: 900 }, { x: 420, y: 0, width: 400, height: 900 }];
  g.navigator.devicePosture.type = 'folded';
  postureChange!();
  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatchObject({ hingeStatus: 'partiallyOpen', isFoldable: true });
  expect(seen[0].regions[0]).toMatchObject({ kind: 'division', x: 400, width: 20 });
  handlers.resize!();
  expect(seen).toHaveLength(1);
});
