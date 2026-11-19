import { createContext } from 'react';

export const PaneSizeContext = createContext<{ width: number; height: number } | null>(null);
