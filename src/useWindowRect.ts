import { useCallback, useRef, useState, type ComponentRef, type RefObject } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';
import type { Rect } from './types';

const EMPTY: Rect = { x: 0, y: 0, width: 0, height: 0 };

export type MeasuredView = {
  ref: RefObject<ComponentRef<typeof View> | null>;
  onLayout: (e: LayoutChangeEvent) => void;
};

/** A view's frame in window coordinates, kept current through onLayout. */
export function useWindowRect(): MeasuredView & { rect: Rect } {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [rect, setRect] = useState<Rect>(EMPTY);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const node = ref.current;
    if (!node) return setRect({ x: 0, y: 0, width, height });
    node.measureInWindow((x, y, w, h) => {
      setRect((p) => (p.x === x && p.y === y && p.width === w && p.height === h ? p : { x, y, width: w, height: h }));
    });
  }, []);

  return { ref, onLayout, rect };
}
