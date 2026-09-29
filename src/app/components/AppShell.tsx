import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  CircleAlert,
  Layers,
  LayoutDashboard,
  ListChecks,
  Menu,
  Route as RouteIcon,
  Search,
  Settings as SettingsIcon,
  StickyNote,
  X,
} from 'lucide-react';
import { useData } from '../state/data';
import { navigate, type Route, type RouteName } from '../state/router';
import { useSettings } from '../state/settings';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  routes: RouteName[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/work', label: 'Work', icon: LayoutDashboard, routes: ['work', 'focus'] },
  { path: '/subjects', label: 'Subjects', icon: BookOpen, routes: ['subjects', 'subject'] },
  { path: '/tasks', label: 'Tasks', icon: ListChecks, routes: ['tasks'] },
  { path: '/flashcards', label: 'Flashcards', icon: Layers, routes: ['flashcards'] },
  { path: '/notes', label: 'Notes', icon: StickyNote, routes: ['notes', 'note'] },
  { path: '/journey', label: 'Study Journey', icon: RouteIcon, routes: ['journey'] },
  { path: '/settings', label: 'Settings', icon: SettingsIcon, routes: ['settings'] },
];

export function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#345E47" />
      <path d="M9 22V10l7 8 7-8v12" fill="none" stroke="#F5F3ED" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavList({ route, items, onNavigate }: { route: Route; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="nav-list">
      {items.map(({ path, label, icon: Icon, routes }) => (
        <li key={path}>
          <a
            className="nav-link"
            href={`#${path}`}
            aria-current={routes.includes(route.name) ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SaveStatus() {
  const { saveStatus } = useData();
  const { saved: settingsSaved } = useSettings();
  if (saveStatus === 'error' || !settingsSaved) {
    return (
      <a className="save-status save-status--error" href="#/settings?section=data">
        <CircleAlert size={16} aria-hidden="true" />
        Couldn’t save on this device
      </a>
    );
  }
  return (
    <span className="save-status">
      {saveStatus === 'saving' ? (
        'Saving…'
      ) : (
        <>
          <Check size={16} aria-hidden="true" />
          Saved on this device
        </>
      )}
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function AppShell({
  route,
  items,
  showSearch = true,
  children,
}: {
  route: Route;
  items: NavItem[];
  showSearch?: boolean;
  children: ReactNode;
}) {
  const { data } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState(route.name === 'search' ? route.query.get('q') ?? '' : '');

  useEffect(() => {
    if (route.name === 'search') setQuery(route.query.get('q') ?? '');
  }, [route]);

  useEffect(() => {
    setMenuOpen(false);
  }, [route.path]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const initial = data.profile.name.trim().charAt(0).toUpperCase();

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>
        Skip to main content
      </a>

      <aside className="sidebar" aria-label="Sidebar">
        <a className="brand" href="#/work">
          <BrandMark />
          NeuroNav
        </a>
        <nav aria-label="Main">
          <NavList route={route} items={items} />
        </nav>
        <p className="sidebar__footer">Your work is stored in this browser only.</p>
      </aside>

      <div className="shell__body">
        <header className="topbar">
          <a className="brand topbar__brand" href="#/work">
            <BrandMark />
            NeuroNav
          </a>
          {showSearch && <form
            className="search-form"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <label htmlFor="global-search" className="visually-hidden">
              Search subjects, tasks, notes and flashcards
            </label>
            <Search className="search-form__icon" size={18} aria-hidden="true" />
            <input
              id="global-search"
              className="input"
              type="search"
              placeholder="Search your work"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (route.name === 'search') {
                  window.history.replaceState(null, '', `#/search?q=${encodeURIComponent(e.target.value)}`);
                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                }
              }}
            />
          </form>}
          <div className="topbar__meta">
            <SaveStatus />
            <span className="topbar__date">{dateFormat.format(new Date())}</span>
            <a className="account-link" href="#/settings" aria-label={`Settings and profile${data.profile.name ? ` for ${data.profile.name}` : ''}`}>
              <span className="avatar" aria-hidden="true">
                {initial || <SettingsIcon size={16} />}
              </span>
              <span className="account-link__name">{data.profile.name || 'Settings'}</span>
            </a>
          </div>
          <button
            ref={menuButton}
            type="button"
            className="btn btn--on-dark btn--small menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            Menu
          </button>
        </header>
        <nav id="mobile-nav" className="mobile-nav" aria-label="Main" hidden={!menuOpen}>
          <NavList route={route} items={items} onNavigate={() => setMenuOpen(false)} />
        </nav>

        <main id="main-content" className="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
