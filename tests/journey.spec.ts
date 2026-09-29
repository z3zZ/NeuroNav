import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const readData = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('neuronav_data_v2') || '{}'));
async function saved(page: Page) {
  await expect.poll(async () => (await readData(page)).version).toBe(2);
  await page.waitForTimeout(350);
}
async function setup(page: Page, subject = 'Biology') {
  await page.goto('/');
  await page.getByLabel('Subject', { exact: true }).selectOption(subject);
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await expect(page.getByRole('heading', { name: 'Make the next step small' })).toBeVisible();
}
async function startTask(page: Page) {
  await setup(page);
  await page.getByLabel('One topic', { exact: true }).fill('Cell division');
  await page.getByLabel('One small task').fill('Draw and label one cell');
  await page.getByRole('button', { name: 'Save task & start' }).click();
  await expect(page.getByRole('heading', { name: 'Draw and label one cell' })).toBeVisible();
}

test('subject → topic → manageable task → interrupted focus → review survives refresh', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  await expect(page.getByRole('combobox', { name: 'Subject to study' })).toHaveValue(/.+/);
  await saved(page);
  expect((await readData(page)).tasks).toHaveLength(0);
  await page.getByRole('button', { name: 'Save task & start' }).click();
  await expect(page.getByRole('alert')).toContainText('Name one topic');
  await page.getByLabel('One topic', { exact: true }).fill('Cell division');
  await page.getByLabel('One small task').fill('Draw and label one cell');
  await page.reload();
  await expect(page.getByLabel('One small task')).toHaveValue('Draw and label one cell');
  await page.screenshot({ path: `artifacts/after-${info.project.name}-work.png`, fullPage: true });
  await page.getByRole('button', { name: 'Save task & start' }).click();
  await expect(page.getByRole('heading', { name: 'Draw and label one cell' })).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Your session paused when the page closed.')).toBeVisible();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByText('1 minute of focus saved', { exact: true })).toBeVisible();
  await page.goto('/#/work');
  await page.getByRole('link', { name: 'Review session', exact: true }).click();
  await page.getByRole('checkbox', { name: /Mark .* as done/ }).check();
  await page.getByLabel('About right', { exact: true }).check();
  await page.getByLabel('No, I need a break', { exact: true }).check();
  await page.getByRole('button', { name: 'Save reflection' }).click();
  await saved(page);
  await page.reload();
  const d = await readData(page);
  expect(d.tasks).toHaveLength(1);
  expect(d.tasks[0].done).toBe(true);
  expect(d.sessions).toHaveLength(1);
  expect(d.sessions[0].reflection.workload).toBe('just-right');
  expect(d.sessions[0].topicId).toBe(d.subjects[0].topics[0].id);
  expect(d.focusTopic.topicId).toBe(d.sessions[0].topicId);
  expect(errors).toEqual([]);
});

test('Other entry, real UK calendar dates and automatic image mapping', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Subject', { exact: true }).selectOption('other');
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a subject');
  await page.getByLabel('Custom subject name').fill('Marine studies');
  await page.getByText('Name and exam date (optional)', { exact: true }).click();
  await page.getByLabel('Exam date').fill('31/02/2027');
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await expect(page.getByText('Enter a real date as DD/MM/YYYY, or leave it blank.')).toBeVisible();
  await page.getByLabel('Exam date').fill('04/10/2027');
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await saved(page);
  expect((await readData(page)).subjects[0]).toMatchObject({ name: 'Marine studies', examDate: '2027-10-04', image: 'auto' });
  for (const [name, image] of [
    ['Computing', 'computing-circuits'],
    ['Biology', 'biology-fern'],
    ['Maths', 'maths-geometry'],
    ['History', 'history-archive'],
  ]) {
    await page.goto('/#/subjects?new=1');
    await page.getByLabel('Subject', { exact: true }).selectOption(name);
    await page.getByRole('button', { name: 'Add subject', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await page.goto('/#/subjects');
    const card = page.locator('.subject-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`subject-${image}`);
    await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  const d = await readData(page);
  await page.goto(`/#/subjects/${d.subjects[0].id}`);
  await page.getByRole('button', { name: 'Edit subject' }).click();
  await expect(page.getByLabel('Custom subject name')).toHaveValue('Marine studies');
  await page.getByText('Exam date and preferences (optional)', { exact: true }).click();
  await expect(page.getByLabel('Exam date')).toHaveValue('04/10/2027');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await saved(page);
  expect((await readData(page)).subjects).toHaveLength(5);
});

test('notes, flashcard review and task editing keep their links and survive reload', async ({ page }) => {
  await startTask(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Write a review note', exact: true }).click();
  await saved(page);
  const d = await readData(page);
  const ref = `${d.subjects[0].id}|${d.subjects[0].topics[0].id}`;
  await page.getByLabel('Title', { exact: true }).fill('Cell division notes');
  await page.getByLabel('Note', { exact: true }).fill('Mitosis produces two genetically identical cells.');
  await page.reload();
  await expect(page.getByLabel('Note', { exact: true })).toHaveValue('Mitosis produces two genetically identical cells.');
  await page.goto(`/#/flashcards?deck=${encodeURIComponent(ref)}`);
  await page.getByLabel('Front: question or term', { exact: true }).fill('What does mitosis produce?');
  await page.getByLabel('Back: answer', { exact: true }).fill('Two genetically identical cells.');
  await page.getByRole('button', { name: 'Add card', exact: true }).click();
  await page.getByRole('button', { name: 'Review 1 due card' }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Round finished' })).toBeVisible();
  await saved(page);
  await page.reload();
  const after = await readData(page);
  expect(after.notes[0].topicId).toBe(d.tasks[0].topicId);
  expect(after.flashcards[0].topicId).toBe(d.tasks[0].topicId);
  expect(after.practice).toHaveLength(1);
  await page.goto('/#/tasks');
  await page.getByRole('button', { name: 'Options', exact: true }).first().click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Date (DD/MM/YYYY)').first().fill('30/02/2027');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Enter a real date as DD/MM/YYYY.')).toBeVisible();
  await page.getByLabel('Date (DD/MM/YYYY)').first().fill('05/10/2027');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await saved(page);
  expect((await readData(page)).tasks[0].dueDate).toBe('2027-10-05');
});

test('keyboard setup and accessibility at requested widths and display preferences', async ({ page }, info) => {
  await page.goto('/');
  await page.getByLabel('Subject', { exact: true }).focus();
  await page.keyboard.press('b');
  await page.keyboard.press('Enter');
  // Native select keyboard typeahead varies by browser; pick a known option then use keyboard submission.
  await page.getByLabel('Subject', { exact: true }).selectOption('Biology');
  await page.getByRole('button', { name: 'Continue to Work' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('One topic', { exact: true }).fill('Cell division');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  for (const settings of [
    {},
    { theme: 'dark' },
    { contrast: 'high' },
    { font: 'dyslexia', fontSize: 'xlarge', spacing: 'loose', motion: 'reduced' },
  ]) {
    await page.evaluate((s) => localStorage.setItem('neuronav_settings_v2', JSON.stringify({ version: 2, ...s })), settings);
    await page.reload();
    await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  }
  await page.screenshot({ path: `artifacts/after-${info.project.name}-320-dyslexia.png`, fullPage: true });
});

test('legacy setup drafts and existing preferences are retained without automatic tasks', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'neuronav_onboarding_subjects',
      JSON.stringify([
        { id: 'old-draft', name: 'Computer Science', examDate: '2027-06-15', difficulty: 'challenging', energyDrain: 'high' },
      ]),
    );
    localStorage.setItem('neuronav_onboarding_session', 'long');
    localStorage.setItem('neuronav_onboarding_energy', '35');
    localStorage.setItem('neuronav_onboarding_time', 'evening');
  });
  await page.reload();
  await expect(page.getByText(/Your earlier setup has been kept/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await saved(page);
  const d = await readData(page);
  expect(d.subjects[0]).toMatchObject({ id: 'old-draft', name: 'Computer Science', difficulty: 'challenging', energyDrain: 'high' });
  expect(d.profile).toMatchObject({ sessionLength: 'long', dailyEnergy: 35, preferredTime: 'evening' });
  expect(d.tasks).toHaveLength(0);
});

test('saved work remains intact, task undo works, and topic links override unrelated drafts', async ({ page }) => {
  await startTask(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Back to Work', exact: true }).click();
  await saved(page);
  const before = await readData(page);
  await page.goto('/#/tasks');
  await page.getByRole('checkbox', { name: 'Draw and label one cell', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await saved(page);
  expect((await readData(page)).tasks[0].done).toBe(false);
  await page.goto('/#/subjects?new=1');
  await page.getByLabel('Subject', { exact: true }).selectOption('History');
  await page.getByRole('button', { name: 'Add subject', exact: true }).click();
  await page.getByLabel('New topic', { exact: true }).fill('The Tudors');
  await page.getByRole('button', { name: 'Add topic', exact: true }).click();
  await saved(page);
  await page.evaluate(
    (old) =>
      localStorage.setItem(
        'neuronav_drafts_v2',
        JSON.stringify({
          'work-step': JSON.stringify({
            subjectId: old.subjects[0].id,
            topicId: old.subjects[0].topics[0].id,
            title: 'Unrelated old draft',
            minutes: '10',
          }),
        }),
      ),
    before,
  );
  await page.getByRole('link', { name: 'Plan task for The Tudors' }).click();
  await expect(page.getByLabel('Topic to study')).toHaveText(/The Tudors/);
  await expect(page.getByLabel('One small task')).toHaveValue('Recall three facts about The Tudors');
  await page.getByRole('button', { name: 'Save task & start' }).click();
  await saved(page);
  const after = await readData(page);
  expect(after.tasks[0]).toEqual(before.tasks[0]);
  expect(after.subjects[0]).toEqual(before.subjects[0]);
  expect(after.tasks).toHaveLength(2);
  expect(after.tasks[1].topicId).toBe(after.subjects[1].topics[0].id);
});

test('image failure, offline editing and local tool error/retry keep work usable', async ({ page, context }) => {
  await page.route('**/assets/neuronav/**', (route) => route.abort());
  await setup(page);
  await page.getByRole('link', { name: 'Biology', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.locator('.subject-card__media img')).toHaveCount(0);
  await page.getByRole('button', { name: /Explain differently/ }).click();
  await expect(page.getByText('Explain differently needs a little more.')).toBeVisible();
  const source = page.getByLabel('Or paste text (kept if you refresh)');
  await source.fill('Mitosis produces two cells. Each cell contains the same genetic material.');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.tool-result')).toBeVisible();
  await page.getByLabel('One topic', { exact: true }).fill('Cell division');
  await page.getByRole('button', { name: 'Save task & start' }).click();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Back to Work', exact: true }).click();
  await saved(page);
  expect((await readData(page)).tasks).toHaveLength(1);
  await context.setOffline(false);
  await page.reload();
  await expect(source).toHaveValue('Mitosis produces two cells. Each cell contains the same genetic material.');
});

test('corrupt data is backed up and legacy revision data migrates without overwriting originals', async ({ page }) => {
  await page.goto('/');
  const legacy = {
    name: 'Learner',
    sessionLength: 'short',
    subjects: [{ id: 'legacy-subject', name: 'Maths', examDate: '2027-06-15', difficulty: 'moderate', energyDrain: 'medium' }],
  };
  await page.evaluate((l) => {
    localStorage.setItem('neuronav_data_v2', '{broken');
    localStorage.setItem('neuronav_plan', JSON.stringify(l));
    localStorage.setItem('neuronav_reflections', JSON.stringify([{ workload: 'just-right', energyAfter: 65, wouldContinue: true }]));
  }, legacy);
  await page.evaluate(() => history.replaceState(null, '', '#/work'));
  await page.reload();
  await expect(page.getByText('Some saved data couldn’t be read.', { exact: true })).toBeVisible();
  await saved(page);
  const d = await readData(page);
  expect(d.subjects[0].id).toBe('legacy-subject');
  expect(d.legacyReflections).toHaveLength(1);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.startsWith('neuronav_data_v2_unreadable_') && localStorage.getItem(k) === '{broken'),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('neuronav_plan')!))).toEqual(legacy);
  for (const route of ['subjects', 'tasks', 'flashcards', 'notes', 'journey', 'settings']) {
    await page.goto(`/#/${route}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  }
});

test('focus break, end-of-block choice and pending review guard', async ({ page }) => {
  await startTask(page);
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await page.getByRole('button', { name: 'Take a break', exact: true }).click();
  await page.clock.fastForward(5 * 60_000);
  await expect(page.getByText('Break over. Ready when you are.')).toBeVisible();
  await page.getByRole('button', { name: 'Start another block' }).click();
  await page.clock.fastForward(10 * 60_000);
  await expect(page.getByText('That block is done. What next?')).toBeVisible();
  await page.getByRole('button', { name: 'Finish session' }).click();
  await page.goto('/#/tasks');
  await page.getByRole('button', { name: /Start\s*:\s*Draw and label one cell/ }).click();
  await expect(page.getByRole('heading', { name: '11 minutes of focus saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start studying', exact: true })).toBeVisible();
});
