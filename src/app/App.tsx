import { useEffect } from 'react';
import { AppShell, NAV_ITEMS } from './components/AppShell';
import { PageHeader } from './components/primitives';
import { DataProvider, useData } from './state/data';
import { FeedbackProvider } from './state/feedback';
import { navigate, useRoute, type Route } from './state/router';
import { SettingsProvider } from './state/settings';
import { TimerProvider } from './state/timer';
import { SettingsScreen } from './screens/SettingsScreen';
import { SetupScreen } from './screens/SetupScreen';
import { FocusScreen } from './screens/FocusScreen';
import { SubjectDetailScreen, SubjectsScreen } from './screens/SubjectsScreen';
import { TasksScreen } from './screens/TasksScreen';
import { WorkScreen } from './screens/WorkScreen';
import { FlashcardsScreen } from './screens/FlashcardsScreen';
import { JourneyScreen } from './screens/JourneyScreen';
import { NoteEditorScreen, NotesScreen } from './screens/NotesScreen';
import { SearchScreen } from './screens/SearchScreen';


function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" intro="That address doesn’t match anything in NeuroNav." />
      <a className="btn btn--primary" href="#/work">
        Go to Work
      </a>
    </>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'work':
      return <WorkScreen />;
    case 'tasks':
      return <TasksScreen />;
    case 'subjects':
      return <SubjectsScreen route={route} />;
    case 'subject':
      return <SubjectDetailScreen id={route.id ?? ''} />;
    case 'focus':
      return <FocusScreen />;
    case 'notes':
      return <NotesScreen route={route} />;
    case 'note':
      return <NoteEditorScreen id={route.id ?? ''} />;
    case 'flashcards':
      return <FlashcardsScreen route={route} />;
    case 'journey':
      return <JourneyScreen />;
    case 'search':
      return <SearchScreen route={route} />;
    case 'settings':
      return <SettingsScreen route={route} />;
    default:
      return <NotFound />;
  }
}

function Router() {
  const route = useRoute();
  const { data } = useData();

  useEffect(() => {
    const mark = () => (document.body.dataset.navigated = 'true');
    window.addEventListener('hashchange', mark);
    return () => window.removeEventListener('hashchange', mark);
  }, []);

  useEffect(() => {
    if (!data.profile.onboarded && route.name !== 'setup') navigate('/setup');
  }, [data.profile.onboarded, route.name]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);

  if (route.name === 'setup') return <SetupScreen />;
  return (
    <AppShell route={route} items={NAV_ITEMS}>
      <Screen key={route.path} route={route} />
    </AppShell>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <FeedbackProvider>
        <DataProvider>
          <TimerProvider>
            <Router />
          </TimerProvider>
        </DataProvider>
      </FeedbackProvider>
    </SettingsProvider>
  );
}
