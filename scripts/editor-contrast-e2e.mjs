import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMPI_PREVIEW_URL || 'http://127.0.0.1:4173/COMPi/';
const browser = await chromium.launch({ headless: true, executablePath: '/usr/sbin/chromium', args: ['--no-sandbox'] });
const channel = n => n / 255 <= .04045 ? n / 255 / 12.92 : ((n / 255 + .055) / 1.055) ** 2.4;
const luminance = rgb => .2126 * channel(rgb[0]) + .7152 * channel(rgb[1]) + .0722 * channel(rgb[2]);
const contrast = (a, b) => { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + .05) / (dark + .05); };
const rgb = css => [...css.matchAll(/\d+(?:\.\d+)?/g)].slice(0, 3).map(x => Number(x[0]));

try {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme, viewport: { width: colorScheme === 'dark' ? 390 : 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('button', { name: 'Practice arena' }).click();
    await page.getByLabel('Search').fill('Boolean expression construction');
    await page.locator('.practice-row').click();
    await page.locator('.cm-editor .cm-line').first().waitFor();
    const read = () => page.locator('.cm-editor').evaluate(e => ({
      foreground: getComputedStyle(e.querySelector('.cm-line')).color,
      background: getComputedStyle(e).backgroundColor,
      content: e.querySelector('.cm-line').textContent,
    }));
    const practice = await read();
    assert.match(practice.content, /x = int\(input\(\)\)/);
    assert.ok(contrast(rgb(practice.foreground), rgb(practice.background)) >= 4.5,
      `${colorScheme} practice editor text unreadable: ${JSON.stringify(practice)}`);
    await page.evaluate(mode => { document.documentElement.dataset.theme = mode; }, colorScheme === 'dark' ? 'light' : 'dark');
    const override = await read();
    assert.ok(contrast(rgb(override.foreground), rgb(override.background)) >= 4.5,
      `${colorScheme} OS / opposite manual theme editor text unreadable: ${JSON.stringify(override)}`);
    await page.getByRole('button', { name: 'Back to practice' }).click();
    await page.getByRole('button', { name: 'Playground', exact: true }).click();
    await page.locator('.cm-editor .cm-line').first().waitFor();
    const playground = await read();
    assert.ok(contrast(rgb(playground.foreground), rgb(playground.background)) >= 4.5,
      `${colorScheme} playground editor text unreadable: ${JSON.stringify(playground)}`);
    await context.close();
  }
  console.log('PASS CodeMirror text contrast in light/dark practice and playground');
} finally {
  await browser.close();
}
