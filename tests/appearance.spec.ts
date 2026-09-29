import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const themes = [
  ['Warm paper', 'light', 'forest', 'standard'],
  ['Forest clarity', 'light', 'forest', 'more'],
  ['Ocean clarity', 'light', 'ocean', 'more'],
  ['Night study', 'dark', 'forest', 'more'],
  ['Black on white', 'light', 'mono', 'high'],
  ['White on black', 'dark', 'mono', 'high'],
  ['Match device', 'light', 'forest', 'standard'],
];

test('theme choices persist, meet contrast checks and keep layouts accessible', async ({ page }, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ colorScheme: 'light', contrast: 'no-preference' });
  await page.goto('/');
  await page.getByLabel('Subject', { exact: true }).selectOption('Biology');
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await page.goto('/#/settings');
  for (const [name, mode, palette, contrast] of themes) {
    await page
      .locator('.theme-options')
      .getByRole('radio', { name: new RegExp(`^${name}`) })
      .check();
    await page.reload();
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', mode);
    await expect(root).toHaveAttribute('data-palette', palette);
    await expect(root).toHaveAttribute('data-contrast', contrast);
    await expect(page.locator('.theme-options').getByRole('radio', { name: new RegExp(`^${name}`) })).toBeChecked();
    const ratios = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const lum = (token: string) => {
        let hex = s.getPropertyValue(token).trim().slice(1);
        if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
        const rgb = [0, 2, 4]
          .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const ratio = (a: string, b: string) => {
        const x = lum(a),
          y = lum(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      return { body: ratio('--ink', '--canvas'), muted: ratio('--muted', '--surface'), button: ratio('--accent-ink', '--accent') };
    });
    expect(ratios.body).toBeGreaterThanOrEqual(palette === 'mono' ? 21 : 7);
    expect(ratios.muted).toBeGreaterThanOrEqual(contrast === 'standard' ? 4.5 : 7);
    expect(ratios.button).toBeGreaterThanOrEqual(4.5);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (palette === 'mono') await expect(page.locator('.appearance-preview img')).toHaveCount(0);
    await page.screenshot({ path: `artifacts/theme-${info.project.name}-${name.replaceAll(' ', '-')}.png` });
    await page.goto('/#/work');
    await expect(root).toHaveAttribute('data-palette', palette);
    const work = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(work.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/#/settings');
  }
  // A narrow, large-text monochrome view remains usable and keyboard-selectable.
  await page.getByRole('radio', { name: /^Black on white/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^White on black/ })).toBeChecked();
  await page.getByRole('radio', { name: 'Extra large', exact: true }).check();
  await page.getByRole('radio', { name: 'OpenDyslexic', exact: true }).check();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('switch', { name: 'High contrast', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'standard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('new backgrounds follow themes, allow overrides, and respect no-photo modes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.setup__background img')).toHaveAttribute('src', /study-daylight-v2/);
  await page.getByRole('button', { name: 'Explore first' }).click();
  await page.goto('/#/settings');
  await page.getByRole('radio', { name: /^Night study/ }).check();
  await expect(page.locator('.appearance-preview img')).toHaveAttribute('src', /study-nightfall-v2/);
  await expect.poll(() => page.locator('.appearance-preview img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await page.getByLabel('Study background', { exact: true }).selectOption('daylight');
  await page.reload();
  await expect(page.locator('.appearance-preview img')).toHaveAttribute('src', /study-daylight-v2/);
  await page.getByLabel('Study background', { exact: true }).selectOption('original');
  await expect(page.locator('.appearance-preview img')).toHaveAttribute('src', /dashboard-hero-study-desk/);
  await page.getByRole('radio', { name: /^Black on white/ }).check();
  await expect(page.locator('main img')).toHaveCount(0);
  await page.getByRole('radio', { name: /^Warm paper/ }).check();
  await page.getByRole('switch', { name: 'Show photographs', exact: true }).click();
  await expect(page.locator('main img')).toHaveCount(0);
  await page.goto('/#/work');
  await expect(page.locator('main img')).toHaveCount(0);
});

test('older settings retain their preferences and new choices preserve unrelated preferences', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'neuronav_settings_v2',
      JSON.stringify({ version: 2, theme: 'dark', contrast: 'high', font: 'mono', fontSize: 'large', sound: false, imagery: false }),
    ),
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'mono');
  await page.getByRole('button', { name: 'Explore first' }).click();
  await page.goto('/#/settings');
  await page.getByRole('radio', { name: /^Ocean clarity/ }).check();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('neuronav_settings_v2')!));
  expect(stored).toMatchObject({
    theme: 'ocean',
    contrast: 'more',
    font: 'mono',
    fontSize: 'large',
    imagery: false,
    background: 'auto',
    sound: false,
  });
  await page.reload();
  await expect(page.getByRole('radio', { name: /^Ocean clarity/ })).toBeChecked();
});
