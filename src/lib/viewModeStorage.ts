/**
 * View mode (grid vs list) for binders and search.
 * Binder view mode is not persisted – grid is always the standard when opening a binder.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const PREFIX = '@oakedex/viewMode/';

export type ViewModeContext = 'binder' | 'collectionList' | 'search';
export type ViewMode = 'grid' | 'list';

const DEFAULT_MODE: ViewMode = 'grid';

export async function getViewMode(context: ViewModeContext): Promise<ViewMode> {
  if (context === 'binder') return 'grid';
  try {
    const raw = await AsyncStorage.getItem(PREFIX + context);
    if (raw === 'list' || raw === 'grid') return raw;
  } catch {
    // ignore
  }
  return DEFAULT_MODE;
}

export async function setViewMode(context: ViewModeContext, mode: ViewMode): Promise<void> {
  if (context === 'binder') return;
  try {
    await AsyncStorage.setItem(PREFIX + context, mode);
  } catch {
    // ignore
  }
}

export function useViewMode(context: ViewModeContext): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setModeState] = useState<ViewMode>(context === 'binder' ? 'grid' : DEFAULT_MODE);

  useEffect(() => {
    if (context === 'binder') {
      setModeState('grid');
      return;
    }
    let cancelled = false;
    getViewMode(context).then((m) => {
      if (!cancelled) setModeState(m);
    });
    return () => {
      cancelled = true;
    };
  }, [context]);

  const setMode = useCallback(
    (m: ViewMode) => {
      setModeState(m);
      setViewMode(context, m);
    },
    [context]
  );

  return [mode, setMode];
}
