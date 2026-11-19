import { useCallback, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { computeSplit } from './core';
import { useFoldRegion } from './hooks';
import type { Rect } from './types';

export type FoldableSplitProps = {
  primary: ReactNode;
  secondary: ReactNode;
  /** Primary pane share when splitting without a fold. Default 0.5. */
  ratio?: number;
  /** Smallest pane (pt/dp) before falling back to compact. Default 200. */
  minPaneSize?: number;
  /** Container width at which panes go side by side without a fold. Default 600. */
  splitMinWidth?: number;
  /** What to show when there is no room for two panes. Default `stack`. */
  compact?: 'stack' | 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  paneStyle?: StyleProp<ViewStyle>;
};

/**
 * Two panes that sit on either side of the fold when the device is half open (book or tabletop),
 * side by side on wide windows (iPhone Duo inner display, Android unfolded, tablets),
 * and stacked or single on narrow ones.
 */
export function FoldableSplit({
  primary,
  secondary,
  ratio = 0.5,
  minPaneSize = 200,
  splitMinWidth = 600,
  compact = 'stack',
  style,
  paneStyle,
}: FoldableSplitProps) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const fold = useFoldRegion();
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const node = ref.current;
    if (!node) return setRect({ x: 0, y: 0, width, height });
    node.measureInWindow((x, y, w, h) => {
      setRect((p) =>
        p.x === x && p.y === y && p.width === w && p.height === h ? p : { x, y, width: w, height: h }
      );
    });
  }, []);

  const layout = computeSplit(rect, fold, { ratio, minPaneSize, splitMinWidth });

  if (layout.mode === 'compact') {
    return (
      <View ref={ref} onLayout={onLayout} style={[styles.fill, style]}>
        {compact !== 'secondary' && <View style={[styles.fill, paneStyle]}>{primary}</View>}
        {compact !== 'primary' && <View style={[styles.fill, paneStyle]}>{secondary}</View>}
      </View>
    );
  }

  const row = layout.direction === 'row';
  return (
    <View ref={ref} onLayout={onLayout} style={[styles.fill, { flexDirection: row ? 'row' : 'column' }, style]}>
      <View style={[row ? { width: layout.first } : { height: layout.first }, paneStyle]}>{primary}</View>
      {layout.gap > 0 && <View style={row ? { width: layout.gap } : { height: layout.gap }} />}
      <View style={[styles.fill, paneStyle]}>{secondary}</View>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
