import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH ?? 'playwright');
const baseURL = 'http://127.0.0.1:5173';
const databaseState = async () => (await fetch('http://127.0.0.1:8000/__test_state__/')).json();

async function withStudent(run) {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.TEST_BROWSER_PATH ? { executablePath: process.env.TEST_BROWSER_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseURL}/login`);
    await page.locator('input[type="text"]').fill('test');
    await page.locator('input[type="password"]').fill('Local-check-2026!');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await page.waitForURL('**/tests');
    await page.goto(`${baseURL}/take-test/1`);
    await page.getByRole('heading', { name: 't1', exact: true }).waitFor();
    await run(page);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test('real JWT, CORS, API scoring, DB persistence and reload work together', async () => {
  const before = await databaseState();
  await withStudent(async (page) => {
    await page.locator('fieldset').nth(0).getByRole('radio', { name: '5', exact: true }).check();
    await page.locator('fieldset').nth(1).getByRole('radio', { name: '7', exact: true }).check();
    await page.locator('fieldset').nth(2).getByRole('radio', { name: '2', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByText('3 из 3 · 100%', { exact: true }).waitFor();
    let state = await databaseState();
    assert.equal(state.attempts, before.attempts + 1);
    assert.equal(state.answers, before.answers + 3);
    assert.equal(await page.getByText('Ваш ответ: 5', { exact: true }).count(), 1);
    await page.reload();
    await page.getByText('3 из 3 · 100%', { exact: true }).waitFor();
    state = await databaseState();
    assert.equal(state.attempts, before.attempts + 1);
    await mkdir('test-results.local', { recursive: true });
    await page.screenshot({ path: 'test-results.local/real-api-result.png', fullPage: true });
  });
});

test('real API result for one wrong answer is rendered as 2/3 and 66 percent', async () => {
  await withStudent(async (page) => {
    await page.locator('fieldset').nth(0).getByRole('radio', { name: '6', exact: true }).check();
    await page.locator('fieldset').nth(1).getByRole('radio', { name: '7', exact: true }).check();
    await page.locator('fieldset').nth(2).getByRole('radio', { name: '2', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByText('2 из 3 · 66%', { exact: true }).waitFor();
    assert.equal(await page.getByText('Неверно', { exact: true }).count(), 1);
  });
});

test('real refresh token restores access and preserves selected answers', async () => {
  await withStudent(async (page) => {
    await page.locator('fieldset').nth(0).getByRole('radio', { name: '5', exact: true }).check();
    await page.evaluate(() => localStorage.setItem('access_token', 'invalid-access-token'));
    const refresh = page.waitForResponse((response) => response.url().endsWith('/api/token/refresh/') && response.status() === 200);
    await page.reload();
    await refresh;
    await page.getByRole('heading', { name: 't1', exact: true }).waitFor();
    assert.equal(await page.locator('fieldset').nth(0).getByRole('radio', { name: '5', exact: true }).isChecked(), true);
  });
});
