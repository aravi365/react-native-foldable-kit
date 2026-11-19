import { createContext, useContext, useState } from 'react';
import { FlatList, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  FoldableRoot,
  FoldableSplit,
  useFoldRegion,
  useHinge,
  useIsFoldable,
  useOcclusions,
  usePosture,
  useSizeClass,
  useVerticalBarEdge,
} from 'react-native-foldable-kit';

const ITEMS = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  title: `Message ${i + 1}`,
  body: 'Open this on a foldable: the list and the detail move to either side of the fold.',
}));

type Mode = 'split' | 'root';
const ModeContext = createContext<{ mode: Mode; toggle: () => void }>({ mode: 'split', toggle: () => {} });

const POSTURE_COLOR: Record<string, string> = {
  book: '#7c3aed',
  tabletop: '#0891b2',
  flat: '#16a34a',
  closed: '#ea580c',
  unknown: '#6b7280',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function StatePanel() {
  const posture = usePosture();
  const hinge = useHinge({ angle: true });
  const fold = useFoldRegion();
  const size = useSizeClass();
  const edge = useVerticalBarEdge();
  const occlusions = useOcclusions();
  const foldable = useIsFoldable();
  const f = fold?.frame;
  const { mode, toggle } = useContext(ModeContext);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: POSTURE_COLOR[posture] }]}>
          <Text style={styles.badgeText}>{posture.toUpperCase()}</Text>
        </View>
        <Pressable onPress={toggle} style={styles.mode}>
          <Text style={styles.modeText}>{mode === 'split' ? 'FoldableSplit' : 'FoldableRoot'} ⇄</Text>
        </Pressable>
      </View>
      <Row label="Foldable" value={foldable ? 'yes' : 'no'} />
      <Row label="Hinge" value={`${hinge.status}${hinge.angle == null ? '' : ` · ${Math.round(hinge.angle)}°`}`} />
      <Row label="Size class" value={`${size.horizontal} × ${size.vertical}`} />
      <Row
        label="Fold"
        value={f ? `${fold!.orientation} @ ${Math.round(f.x)},${Math.round(f.y)} ${Math.round(f.width)}×${Math.round(f.height)}` : 'none'}
      />
      <Row label="Vertical bar" value={edge ?? 'none'} />
      <Row label="Occlusions" value={String(occlusions.length)} />
    </View>
  );
}

function List({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <FlatList
      data={ITEMS}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={<StatePanel />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect(item.id)}
          style={[styles.item, item.id === selected && styles.itemActive]}
        >
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemBody} numberOfLines={1}>
            {item.body}
          </Text>
        </Pressable>
      )}
    />
  );
}

function Detail({ id }: { id: string }) {
  const item = ITEMS.find((i) => i.id === id)!;
  return (
    <View style={styles.detail}>
      <Text style={styles.detailTitle}>{item.title}</Text>
      <Text style={styles.detailBody}>{item.body}</Text>
    </View>
  );
}

function OtherSide() {
  return (
    <View style={styles.other}>
      <Text style={styles.otherTitle}>Other side of the fold</Text>
      <Text style={styles.otherBody}>
        FoldableRoot keeps the whole app on one side while the device is half open. This pane is optional.
      </Text>
    </View>
  );
}

export default function App() {
  const [selected, setSelected] = useState('1');
  const [mode, setMode] = useState<Mode>('split');
  const screen = (
    <FoldableSplit
      ratio={0.42}
      compact="stack"
      primary={<List selected={selected} onSelect={setSelected} />}
      secondary={<Detail id={selected} />}
    />
  );
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <ModeContext.Provider value={{ mode, toggle: () => setMode((m) => (m === 'split' ? 'root' : 'split')) }}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
          {mode === 'split' ? screen : <FoldableRoot other={<OtherSide />}>{screen}</FoldableRoot>}
        </SafeAreaView>
      </ModeContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  panel: { margin: 12, padding: 12, borderRadius: 14, backgroundColor: '#fff', gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  mode: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#e2e8f0' },
  modeText: { color: '#0f172a', fontWeight: '600', fontSize: 12 },
  other: { flex: 1, margin: 12, padding: 20, borderRadius: 14, backgroundColor: '#ecfeff', justifyContent: 'center' },
  otherTitle: { fontSize: 18, fontWeight: '700', color: '#155e75' },
  otherBody: { marginTop: 6, fontSize: 14, lineHeight: 20, color: '#0e7490' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: '700', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: '#64748b' },
  value: { color: '#0f172a', fontWeight: '600', flexShrink: 1 },
  item: { marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: '#fff' },
  itemActive: { backgroundColor: '#ede9fe' },
  itemTitle: { fontWeight: '600', color: '#0f172a' },
  itemBody: { color: '#64748b', marginTop: 2 },
  detail: { flex: 1, margin: 12, padding: 20, borderRadius: 14, backgroundColor: '#fff' },
  detailTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  detailBody: { marginTop: 8, fontSize: 16, lineHeight: 22, color: '#334155' },
});
