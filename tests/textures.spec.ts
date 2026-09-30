import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('card texture styles, strength and accessibility overrides persist without changing study data', async ({ page }, info) => {
  await page.goto('/');
  await page.getByLabel('Subject', { exact: true }).selectOption('Biology');
  await page.getByRole('button', { name: 'Continue to Work' }).click();
  await page.goto('/#/settings');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-card-texture', 'mixed');
  const preview = page.locator('.texture-preview').first();
  const pattern = () => preview.evaluate((e) => getComputedStyle(e, '::before').backgroundImage);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('neuronav_data_v2'))).not.toBeNull();
  const data = await page.evaluate(() => localStorage.getItem('neuronav_data_v2'));
  for (const [name, value] of [
    ['Contours', 'contours'],
    ['Dot paper', 'dots'],
    ['Linen', 'linen'],
    ['Graph paper', 'grid'],
  ]) {
    await page.getByRole('radio', { name: new RegExp(`^${name}`) }).check();
    await expect(root).toHaveAttribute('data-card-texture', value);
    expect(await pattern()).toContain(`texture-${value}.svg`);
    const response = await page.request.get(`/assets/brand/texture-${value}.svg`);
    expect(response.ok()).toBe(true);
  }
  for (const [name, opacity] of [
    ['Subtle', '0.035'],
    ['Balanced', '0.065'],
    ['Defined', '0.1'],
  ]) {
    await page.getByRole('radio', { name, exact: true }).check();
    expect(await preview.evaluate((e) => getComputedStyle(e, '::before').opacity)).toBe(opacity);
  }
  await page.reload();
  await expect(root).toHaveAttribute('data-card-texture', 'grid');
  await expect(root).toHaveAttribute('data-texture-strength', 'defined');
  await page.getByRole('radio', { name: /^Varied cards/ }).check();
  const previews = await page
    .locator('.texture-preview')
    .evaluateAll((es) => es.map((e) => getComputedStyle(e, '::before').backgroundImage));
  expect(new Set(previews).size).toBeGreaterThan(1);
  await page.locator('.settings-textures').screenshot({ path: `artifacts/card-textures-${info.project.name}.png` });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .locator('.theme-options')
    .getByRole('radio', { name: /^Night study/ })
    .check();
  expect(await preview.evaluate((e) => getComputedStyle(e, '::before').filter)).toBe('invert(1)');
  await page.locator('.settings-textures').screenshot({ path: `artifacts/card-textures-dark-${info.project.name}.png` });
  await page
    .locator('.theme-options')
    .getByRole('radio', { name: /^Black on white/ })
    .check();
  await expect(root).toHaveAttribute('data-card-texture', 'off');
  expect(await preview.evaluate((e) => getComputedStyle(e, '::before').display)).toBe('none');
  await expect(page.getByRole('radio', { name: /^Varied cards/ })).toBeChecked();
  await page
    .locator('.theme-options')
    .getByRole('radio', { name: /^Warm paper/ })
    .check();
  await expect(root).toHaveAttribute('data-card-texture', 'mixed');
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('neuronav_settings_v2')!);
    localStorage.setItem('neuronav_settings_v2', JSON.stringify({ ...settings, simplified: true }));
  });
  await page.reload();
  await expect(root).toHaveAttribute('data-card-texture', 'off');
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('neuronav_settings_v2')!);
    localStorage.setItem('neuronav_settings_v2', JSON.stringify({ ...settings, simplified: false }));
  });
  await page.reload();
  await expect(root).toHaveAttribute('data-card-texture', 'mixed');
  await page.getByRole('radio', { name: /^None Plain card/ }).check();
  await page.reload();
  await expect(root).toHaveAttribute('data-card-texture', 'off');
  expect(await page.evaluate(() => localStorage.getItem('neuronav_data_v2'))).toBe(data);
  await page.getByRole('radio', { name: /^Contours/ }).check();
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await preview.evaluate((e) => getComputedStyle(e, '::before').display)).toBe('none');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 320, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#/work');
  await page.getByLabel('One topic', { exact: true }).fill('Cells');
  await page.getByLabel('One small task').fill('Draw one cell');
  await page.getByRole('button', { name: 'Save task & start' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});
