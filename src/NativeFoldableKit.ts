import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type NativeRegion = {
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  separating: boolean;
};

export type NativeFoldableState = {
  isSupported: boolean;
  isFoldable: boolean;
  hingeStatus: string;
  hingeAngle: number;
  verticalBarEdge: string;
  horizontalSizeClass: string;
  verticalSizeClass: string;
  regions: ReadonlyArray<NativeRegion>;
};

export interface Spec extends TurboModule {
  getState(): NativeFoldableState;
  setAngleUpdatesEnabled(enabled: boolean): void;
  readonly onChange: CodegenTypes.EventEmitter<NativeFoldableState>;
}

export default TurboModuleRegistry.get<Spec>('FoldableKit');
