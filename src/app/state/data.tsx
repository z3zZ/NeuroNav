import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadData, normaliseData, type LoadOutcome } from '../lib/model';
import { STORAGE_KEYS, writeJSON } from '../lib/storage';
import type { AppData } from '../lib/types';

export type SaveStatus = 'saved' | 'saving' | 'error';

interface DataContextValue {
  data: AppData;
  /** Applies a pure transition and schedules a save. */
  update: (recipe: (d: AppData) => AppData) => void;
  replace: (next: AppData) => void;
  saveStatus: SaveStatus;
  loadProblem: LoadOutcome['problem'];
  backupKey: string | null;
  dismissLoadProblem: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadData);
  const [data, setData] = useState<AppData>(initial.data);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [loadProblem, setLoadProblem] = useState(initial.problem);
  const dataRef = useRef(data);
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setSaveStatus(writeJSON(STORAGE_KEYS.data, dataRef.current) ? 'saved' : 'error');
  }, []);

  // Persist migrated or repaired data straight away so the next load is clean.
  useEffect(() => {
    if (initial.data.notices.migrated || initial.problem) {
      dirty.current = true;
      flush();
    }
  }, [initial, flush]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Never lose the last change when the tab closes.
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [flush]);

  const update = useCallback(
    (recipe: (d: AppData) => AppData) => {
      setData((prev) => {
        const next = recipe(prev);
        if (next === prev) return prev;
        dataRef.current = next;
        return next;
      });
      dirty.current = true;
      setSaveStatus('saving');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 300);
    },
    [flush],
  );

  const replace = useCallback(
    (next: AppData) => {
      const clean = normaliseData(next);
      if (!clean) return;
      update(() => clean);
    },
    [update],
  );

  const value = useMemo(
    () => ({
      data,
      update,
      replace,
      saveStatus,
      loadProblem,
      backupKey: initial.backupKey,
      dismissLoadProblem: () => setLoadProblem(null),
    }),
    [data, update, replace, saveStatus, loadProblem, initial.backupKey],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
