import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useFoldLayout } from './hooks';
import type { FoldRegion } from './types';

export type FoldAwareViewProps = Omit<ViewProps, 'children'> & {
  /** Receives the fold in this view's coordinates, or null when it does not cross the view. */
  children: (fold: FoldRegion | null) => ReactNode;
};

/** A View that tells its children where the fold crosses it. */
export function FoldAwareView({ children, onLayout, ...props }: FoldAwareViewProps) {
  const { ref, onLayout: measure, fold } = useFoldLayout();
  return (
    <View
      {...props}
      ref={ref}
      onLayout={(e) => {
        measure(e);
        onLayout?.(e);
      }}
    >
      {children(fold)}
    </View>
  );
}
