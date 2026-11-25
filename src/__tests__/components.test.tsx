import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { FoldableRoot, FoldableSplit, FoldAwareView, useAvailableSize, useFoldable, useIsWide } from '..';
import { _reset } from '../store';

const mockNative = {
  raw: null as any,
  listeners: new Set<(s: any) => void>(),
};

jest.mock('../NativeFoldableKit', () => ({
  __esModule: true,
  default: {
    getState: () => mockNative.raw,
    setAngleUpdatesEnabled: jest.fn(),
    onChange: (l: (s: any) => void) => {
      mockNative.listeners.add(l);
      return { remove: () => mockNative.listeners.delete(l) };
    },
  },
}));

const base = {
  isSupported: true,
  isFoldable: true,
  hingeStatus: 'fullyOpen',
  hingeAngle: -1,
  verticalBarEdge: 'none',
  horizontalSizeClass: 'unspecified',
  verticalSizeClass: 'unspecified',
  regions: [] as any[],
};
const vFold = { kind: 'division', x: 340, y: 0, width: 20, height: 800, active: true, separating: true };
const hFold = { kind: 'division', x: 0, y: 400, width: 700, height: 20, active: true, separating: true };
const book = { ...base, hingeStatus: 'partiallyOpen', regions: [vFold] };
const tabletop = { ...base, hingeStatus: 'partiallyOpen', regions: [hFold] };

async function emit(raw: any) {
  mockNative.raw = raw;
  await act(() => {
    mockNative.listeners.forEach((l) => l(raw));
  });
}


const lastLayout = { width: 0, height: 0 };
const { default: nativeMethods } = jest.requireActual('@react-native/jest-preset/jest/MockNativeMethods');
nativeMethods.measureInWindow.mockImplementation((cb: (x: number, y: number, w: number, h: number) => void) =>
  cb(0, 0, lastLayout.width, lastLayout.height)
);

async function layoutEvent(el: any, width: number, height: number) {
  lastLayout.width = width;
  lastLayout.height = height;
  await fireEvent(el, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

const style = (text: string) => StyleSheet.flatten(screen.getByText(text).parent!.props.style) ?? {};

beforeEach(() => {
  _reset();
  mockNative.listeners.clear();
  mockNative.raw = base;
});

describe('FoldableSplit', () => {
  const split = (props = {}) => (
    <FoldableSplit primary={<Text>A</Text>} secondary={<Text>B</Text>} {...props} />
  );
  const fire = (w: number, h: number) => layoutEvent(screen.getByText('A').parent!.parent!, w, h);

  it('splits at a vertical fold in book posture', async () => {
    mockNative.raw = book;
    await render(split());
    await fire(700, 800);
    expect(style('A').width).toBe(340);
    expect(StyleSheet.flatten(screen.getByText('A').parent!.parent!.props.style).flexDirection).toBe('row');
  });

  it('splits at a horizontal fold in tabletop posture', async () => {
    mockNative.raw = tabletop;
    await render(split());
    await fire(700, 820);
    expect(style('A').height).toBe(400);
    expect(StyleSheet.flatten(screen.getByText('A').parent!.parent!.props.style).flexDirection).toBe('column');
  });

  it('goes side by side on a wide window without a fold', async () => {
    await render(split({ ratio: 0.4 }));
    await fire(800, 600);
    expect(style('A').width).toBe(320);
  });

  it('shows only the primary pane when narrow with compact="primary"', async () => {
    await render(split({ compact: 'primary' }));
    await fire(390, 844);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.queryByText('B')).toBeNull();
  });

  it('re-lays out when the device folds', async () => {
    await render(split());
    await fire(700, 800);
    expect(style('A').width).toBe(350);
    await emit(book);
    expect(style('A').width).toBe(340);
  });
});

describe('FoldableRoot', () => {
  let mounts = 0;
  function Probe() {
    const wide = useIsWide();
    const { width } = useAvailableSize();
    useEffect(() => {
      mounts += 1;
    }, []);
    return <Text>{`${wide ? 'wide' : 'narrow'}:${width}`}</Text>;
  }
  const fire = () => layoutEvent(screen.getByText(/:/).parent!.parent!, 700, 800);

  beforeEach(() => {
    mounts = 0;
  });

  it('keeps the app on one side of the fold and reports the pane size', async () => {
    mockNative.raw = book;
    await render(
      <FoldableRoot other={<Text>other</Text>}>
        <Probe />
      </FoldableRoot>
    );
    await fire();
    expect(screen.getByText('narrow:340')).toBeTruthy();
    expect(screen.getByText('other')).toBeTruthy();
  });

  it('does not remount the app when the device folds and unfolds', async () => {
    await render(
      <FoldableRoot>
        <Probe />
      </FoldableRoot>
    );
    await fire();
    await emit(book);
    await emit(base);
    await emit(book);
    expect(mounts).toBe(1);
    expect(screen.queryByText('other')).toBeNull();
  });

  it('renders full size when avoidFold is off', async () => {
    mockNative.raw = book;
    await render(
      <FoldableRoot avoidFold={false}>
        <Probe />
      </FoldableRoot>
    );
    await fire();
    expect(screen.queryByText('narrow:340')).toBeNull();
  });
});

describe('FoldAwareView', () => {
  it('gives the fold in the view coordinates', async () => {
    mockNative.raw = book;
    await render(<FoldAwareView testID="fav">{(f) => <Text>{f ? `fold@${f.frame.x}` : 'none'}</Text>}</FoldAwareView>);
    await layoutEvent(screen.getByTestId('fav'), 700, 300);
    expect(screen.getByText('fold@340')).toBeTruthy();
  });

  it('is null when the fold does not cross the view', async () => {
    mockNative.raw = book;
    await render(<FoldAwareView testID="fav">{(f) => <Text>{f ? 'fold' : 'none'}</Text>}</FoldAwareView>);
    await layoutEvent(screen.getByTestId('fav'), 300, 300);
    expect(screen.getByText('none')).toBeTruthy();
  });
});

describe('useFoldable(selector)', () => {
  it('re-renders only when the selected value changes', async () => {
    let renders = 0;
    function Posture() {
      const posture = useFoldable((s) => s.posture);
      renders += 1;
      return <Text>{posture}</Text>;
    }
    await render(<Posture />);
    expect(screen.getByText('flat')).toBeTruthy();
    const before = renders;
    await emit({ ...base, horizontalSizeClass: 'regular', verticalSizeClass: 'regular' });
    expect(renders).toBe(before);
    await emit(book);
    expect(screen.getByText('book')).toBeTruthy();
  });
});

describe('jest mock presets', () => {
  it('switches posture with a preset name', async () => {
    const mock = require('../../jest');
    function P() {
      return <Text>{mock.useFoldable((s: any) => s.posture)}</Text>;
    }
    await render(<P />);
    await act(() => mock.setMockFoldableState('tabletop'));
    expect(screen.getByText('tabletop')).toBeTruthy();
    await act(() => mock.setMockFoldableState());
    expect(screen.getByText('unknown')).toBeTruthy();
  });
});
