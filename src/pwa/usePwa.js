import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, promptInstall, applyUpdate } from './pwa';

export function usePwa() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...state, promptInstall, applyUpdate };
}
