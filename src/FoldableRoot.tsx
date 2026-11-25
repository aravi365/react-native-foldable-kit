import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { computeRootLayout } from './core';
import { useFoldRegion } from './hooks';
import { useWindowRect } from './useWindowRect';
import { PaneSizeContext } from './paneContext';

export type FoldableRootProps = {
  children: ReactNode;
  /** Keep the app off the fold while one splits the window. Default true. */
  avoidFold?: boolean;
  /** Side of the fold to keep the app on. Default `larger`. */
  side?: 'start' | 'end' | 'larger';
  /** Rendered on the other side of the fold while avoiding it. */
  other?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Wrap your app once to make it fold-safe: while the device is half open, the whole app sits on one side
 * of the crease. Children stay mounted when the layout changes. Inside, useSizeClass/useIsWide reflect the pane.
 */
export function FoldableRoot({ children, avoidFold = true, side = 'larger', other, style }: FoldableRootProps) {
  const fold = useFoldRegion();
  const { ref, onLayout, rect } = useWindowRect();

  const layout = avoidFold ? computeRootLayout(rect, fold, side) : ({ avoid: false } as const);
  const row = layout.avoid && layout.direction === 'row';
  const paneW = layout.avoid ? (row ? layout.size : rect.width) : 0;
  const paneH = layout.avoid ? (row ? rect.height : layout.size) : 0;
  const pane = useMemo(() => (layout.avoid ? { width: paneW, height: paneH } : null), [layout.avoid, paneW, paneH]);

  const flexDirection = layout.avoid ? `${layout.direction}${layout.reverse ? '-reverse' : ''}` as const : 'row';
  const appStyle = layout.avoid ? (row ? { width: layout.size } : { height: layout.size }) : styles.fill;
  const gapStyle = layout.avoid ? (row ? { width: layout.gap } : { height: layout.gap }) : styles.hidden;

  return (
    <View ref={ref} onLayout={onLayout} style={[styles.fill, { flexDirection }, style]}>
      <View style={appStyle}>
        <PaneSizeContext.Provider value={pane}>{children}</PaneSizeContext.Provider>
      </View>
      <View style={gapStyle} />
      <View style={layout.avoid ? styles.fill : styles.hidden}>{layout.avoid ? other : null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { width: 0, height: 0, overflow: 'hidden' },
});
