import { useState } from 'react';
import { STORAGE_KEYS, isObject, readJSON, writeJSON } from '../lib/storage';

type Drafts = Record<string, string>;

function readDrafts(): Drafts {
  const r = readJSON(STORAGE_KEYS.drafts, (raw) => (isObject(raw) ? (raw as Drafts) : null));
  return r.status === 'ok' ? r.value : {};
}

/** Text input state that survives a refresh. Cleared by setting it to ''. */
export function useDraft(key: string, initial = ''): [string, (value: string) => void] {
  const [value, setValue] = useState(() => {
    const saved = readDrafts()[key];
    return typeof saved === 'string' ? saved : initial;
  });
  return [value, (next: string) => {
    setValue(next);
    const drafts = readDrafts();
    if (next) drafts[key] = next;
    else delete drafts[key];
    writeJSON(STORAGE_KEYS.drafts, drafts);
  }];
}
