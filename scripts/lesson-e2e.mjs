import assert from 'node:assert/strict';
import { chromium } from 'playwright';


const base = process.env.COMPI_PREVIEW_URL || 'http://127.0.0.1:4173/COMPi/';
const browser = await chromium.launch({ headless: true, executablePath: '/usr/sbin/chromium', args: ['--no-sandbox'] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(base);
  await page.getByRole('button', { name: /Continue learning/ }).click();
  await page.getByRole('heading', { name: 'Name the fault before fixing it' }).waitFor();
  assert.equal(await page.getByText('A program runs without exception').count(), 0, 'teaching must have its own screen');
  await page.getByRole('button', { name: /Continue to question 1/ }).click();
  await page.locator('.option').filter({ hasText: 'Syntax error' }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByText('Not quite. Try again.').waitFor();
  await page.getByRole('button', { name: 'Review teaching' }).click();
  await page.getByRole('button', { name: /Return to question/ }).click();
  await page.getByRole('button', { name: /Continue to question 2/ }).click();
  await page.reload();
  await page.getByText('Question 2 of 3').waitFor();
  await page.getByRole('button', { name: 'Review teaching' }).click();
  await page.getByRole('button', { name: /Return to question/ }).click();
  await page.locator('.answer-label input').fill('a syntax error');
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByText('That’s right.').waitFor();
  await page.getByRole('button', { name: /Continue to question 3/ }).click();
  await page.getByRole('button', { name: 'Move line 2 up' }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByRole('button', { name: /Review missed questions/ }).click();
  await page.getByText('Review 1 of 1').waitFor();
  await page.reload();
  await page.getByText('Review 1 of 1').waitFor();
  await page.locator('.option').filter({ hasText: 'Runtime error' }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByRole('button', { name: /Try again/ }).click();
  await page.locator('.option').filter({ hasText: 'Semantic (logic) error' }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  assert.equal(await page.locator('.top-stats').innerText(), '✦ 20 XP', 'review must not award first-try XP');
  await page.getByRole('button', { name: /Finish lesson/ }).click();
  await page.getByRole('heading', { name: 'Lesson complete' }).waitFor();
  assert.equal(await page.locator('.top-stats').innerText(), '✦ 20 XP');
  assert.match(await page.locator('.lesson-complete').innerText(), /\+20 XP earned/, 'the reward survives a mid-unit reload');
  await page.getByRole('button', { name: /Back to path/ }).last().click();
  await page.getByText('1 / 22 lessons completed').waitFor();
  assert.equal(await page.locator('.node').nth(1).isDisabled(), false);
  await page.reload();
  await page.getByText('1 / 22 lessons completed').waitFor();
  assert.equal(await page.locator('.top-stats').innerText(), '✦ 20 XP');
  await page.getByRole('button', { name: 'Simulation & Practice' }).click();
  await page.getByRole('tab', { name: 'Unlimited practice' }).click();
  await page.getByRole('combobox', { name: 'Progress' }).selectOption('unattempted');
  await page.getByLabel('Search').fill('Error categories');
  assert.equal(await page.locator('.practice-row').count(), 0, 'an incorrect attempt still counts as attempted');
  await page.getByLabel('Search').fill('String repetition');
  assert.equal(await page.locator('.practice-row').count(), 1, 'untouched exercises remain available');
  await page.getByRole('combobox', { name: 'Progress' }).selectOption('all');
  await page.getByLabel('Search').fill('One-based user position');
  await page.getByRole('button', { name: /One-based user position/ }).click();
  await page.locator('.cm-content').fill('word = input()\nposition = int(input())\nprint(word[position - 1])');
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByText('Well reasoned.').waitFor({ timeout: 30000 });
  assert.match(await page.locator('.feedback').innerText(), /expected P/);
  await page.getByRole('button', { name: 'Return to practice' }).click();
  await page.getByRole('tab', { name: 'Simulation test' }).click();
  await page.getByRole('button', { name: /Untimed practice/ }).click();
  assert.equal(await page.getByText('That’s right.').count(), 0, 'exam must not reveal live feedback');

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  await phone.goto(base);
  await phone.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Settings' }).click();
  await phone.getByLabel('Reduce motion').check();
  assert.equal(await phone.locator('.app.reduce-motion').count(), 1);
  await phone.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Learning' }).click();
  await phone.getByRole('button', { name: /Continue learning/ }).click();
  const geometry = await phone.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.equal(geometry.width, geometry.viewport, 'phone has no horizontal overflow');
  await mobile.close();
  const tablet = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, colorScheme: 'dark', reducedMotion: 'reduce' });
  const ipadSized = await tablet.newPage();
  await ipadSized.goto(base);
  await ipadSized.getByRole('button', { name: /Continue learning/ }).click();
  const tabletGeometry = await ipadSized.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth,
    surface: getComputedStyle(document.querySelector('.lesson-screen')).backgroundColor,
    motion: getComputedStyle(document.querySelector('.lesson-screen')).animationDuration }));
  assert.equal(tabletGeometry.width, tabletGeometry.viewport);
  assert.notEqual(tabletGeometry.surface, 'rgb(255, 255, 255)', 'system dark theme reaches lesson surface');
  assert.equal(tabletGeometry.motion, '0s', 'OS reduced-motion preference disables lesson animation');
  await tablet.close();

  const assisted = await browser.newContext();
  const assistedPage = await assisted.newPage();
  await assistedPage.goto(base);
  await assistedPage.getByRole('button', { name: /Continue learning/ }).click();
  await assistedPage.getByRole('button', { name: /Continue to question 1/ }).click();
  await assistedPage.locator('.option').filter({ hasText: 'Syntax error' }).click();
  await assistedPage.getByRole('button', { name: /Check answer/ }).click();
  await assistedPage.getByRole('button', { name: /Continue to question 2/ }).click();
  await assistedPage.locator('.answer-label input').fill('SyntaxError');
  await assistedPage.getByRole('button', { name: /Check answer/ }).click();
  await assistedPage.getByRole('button', { name: /Continue to question 3/ }).click();
  await assistedPage.getByRole('button', { name: 'Move line 2 up' }).click();
  await assistedPage.getByRole('button', { name: /Check answer/ }).click();
  await assistedPage.getByRole('button', { name: /Review missed questions/ }).click();
  await assistedPage.getByRole('button', { name: 'Show answer' }).click();
  assert.match(await assistedPage.locator('.lesson-feedback.revealed').innerText(), /Semantic \(logic\) error/);
  await assistedPage.reload();
  await assistedPage.locator('.lesson-feedback.revealed').waitFor();
  await assistedPage.getByRole('button', { name: /Finish lesson/ }).click();
  await assistedPage.getByText(/1 answer was revealed with help/).waitFor();
  assert.equal(await assistedPage.locator('.top-stats').innerText(), '✦ 20 XP');
  await assisted.close();

  const legacy = await browser.newContext();
  const oldPage = await legacy.newPage();
  await oldPage.goto(base);
  await oldPage.evaluate(async () => {
    const profile = { version: 1, nickname: 'Returning student', confidence: 'beginner', xp: 25,
      completed: ['w1-error-categories', 'w1-syntax-diagnosis', 'w1-execution-order'],
      attempts: [], drafts: { 'w1-error-categories': 'saved draft' }, exams: {}, preferences: { reducedMotion: false } };
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('python-pathway');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('profiles', 'readwrite');
        transaction.objectStore('profiles').put({ id: 'learner', state: profile });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await oldPage.reload();
  await oldPage.getByText('1 / 22 lessons completed').waitFor();
  assert.equal(await oldPage.locator('.top-stats').innerText(), '✦ 25 XP');
  assert.equal(await oldPage.locator('.node').nth(1).isDisabled(), false);
  const migrated = await oldPage.evaluate(async () => new Promise((resolve, reject) => {
    const request = indexedDB.open('python-pathway');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('profiles', 'readonly');
      const get = tx.objectStore('profiles').get('learner');
      get.onsuccess = () => resolve(get.result.state);
      get.onerror = () => reject(get.error);
    };
    request.onerror = () => reject(request.error);
  }));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.drafts['w1-error-categories'], 'saved draft');
  await legacy.close();
  assert.deepEqual(errors, [], 'no uncaught page exceptions');
  console.log('PASS guided advance/review/reveal, persisted XP, unattempted filter, coding, exam, mobile/tablet, theme/motion and v1 migration');
  await context.close();
} finally {
  await browser.close();
}
