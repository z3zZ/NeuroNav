import { test, expect } from '@playwright/test';
import { emptyData } from '../src/app/lib/model';
import { addSubject } from '../src/app/lib/actions';
import { nextAction } from '../src/app/lib/selectors';

test('past exams keep their subject usable without outranking an upcoming exam', () => {
  let data = emptyData();
  [data] = addSubject(data, { id: 'past', name: 'History', examDate: '2001-01-01', difficulty: 'moderate', energyDrain: 'medium', image: 'auto' });
  let action = nextAction(data);
  expect(action.kind).toBe('topic');
  if (action.kind === 'topic') expect(action.ref.subjectId).toBe('past');
  [data] = addSubject(data, { id: 'upcoming', name: 'Biology', examDate: '2099-01-01', difficulty: 'moderate', energyDrain: 'medium', image: 'auto' });
  action = nextAction(data);
  expect(action.kind).toBe('topic');
  if (action.kind === 'topic') expect(action.ref.subjectId).toBe('upcoming');
});
