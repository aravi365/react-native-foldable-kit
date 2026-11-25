import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { computeSplit } from './core';
import { useFoldRegion } from './hooks';
import { useWindowRect } from './useWindowRect';

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
  const fold = useFoldRegion();
  const { ref, onLayout, rect } = useWindowRect();

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
