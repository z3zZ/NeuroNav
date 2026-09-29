import { useEffect, useState } from 'react';

export type RouteName =
  | 'work'
  | 'subjects'
  | 'subject'
  | 'tasks'
  | 'flashcards'
  | 'notes'
  | 'note'
  | 'journey'
  | 'settings'
  | 'focus'
  | 'search'
  | 'setup'
  | 'not-found';

export interface Route {
  name: RouteName;
  id: string | null;
  query: URLSearchParams;
  path: string;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/work';
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart);
  const [first = 'work', second = null] = segments;
  const id = second ? decodeURIComponent(second) : null;
  const simple: Record<string, RouteName> = {
    work: 'work',
    tasks: 'tasks',
    flashcards: 'flashcards',
    journey: 'journey',
    settings: 'settings',
    focus: 'focus',
    search: 'search',
    setup: 'setup',
  };
  let name: RouteName = simple[first] ?? 'not-found';
  if (first === 'subjects') name = id ? 'subject' : 'subjects';
  if (first === 'notes') name = id ? 'note' : 'notes';
  return { name, id, query, path: pathPart };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export const href = (path: string) => `#${path}`;
