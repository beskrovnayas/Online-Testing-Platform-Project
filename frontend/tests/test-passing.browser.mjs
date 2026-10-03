import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH ?? 'playwright');
const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5174';
const testData = {
  id: 1, title: 'Алгебра', description: 'Проверка знаний', time_limit: 30,
  questions: [
    { id: 10, text: '2 + 2?', question_type: 'single', options: [{ id: 20, text: '4' }, { id: 21, text: '5' }] },
    { id: 11, text: '3 + 3?', question_type: 'single', options: [{ id: 30, text: '6' }, { id: 31, text: '7' }] },
  ],
};
const resultData = {
  attempt_id: 5, test_id: 1, test_title: 'Алгебра', correct_answers: 2, total_questions: 2, percentage: 100,
  details: [{ question_id: 10, question_text: '2 + 2?', selected_option_text: '4', correct_option_text: '4', is_correct: true }],
};

async function scenario(options, run) {
  const browser = await chromium.launch({
    headless: true, ...(process.env.TEST_BROWSER_PATH ? { executablePath: process.env.TEST_BROWSER_PATH } : {}),
  });
  const context = await browser.newContext({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const requests = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const token = `e30.${btoa(JSON.stringify({ user_id: 42 }))}.signature`;
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', 'test-refresh');
  });
  await page.route('http://localhost:8000/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let status = 200;
    let body;
    if (path === '/api/tests/1/') {
      status = options.loadStatus ?? 200;
      body = options.loadBody ?? (status === 200 ? testData : { detail: 'Unavailable' });
    } else if (path === '/api/tests/1/start/') {
      const now = Date.now();
      body = { attempt_id: 5, server_now: new Date(now).toISOString(), expires_at: new Date(now + (options.timeout ?? 60000)).toISOString() };
    } else if (path === '/api/submit-answers/') {
      requests.push(route.request().postDataJSON());
      if (options.submitDelay) await new Promise((resolve) => setTimeout(resolve, options.submitDelay));
      status = options.submitStatus ?? 200;
      body = options.submitBody ?? resultData;
    } else if (path === '/api/attempts/5/') {
      status = options.historyStatus ?? 200;
      body = options.historyBody ?? resultData;
    } else if (path === '/api/token/refresh/') {
      status = options.refreshStatus ?? 401;
      body = { detail: 'Invalid token' };
    } else {
      status = 404;
      body = { detail: 'Not found' };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  try {
    await page.goto(`${baseURL}${options.url ?? '/take-test/1'}`);
    await run(page, requests);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test('manual submission validates unanswered questions and renders real details once', async () => {
  await scenario({}, async (page, requests) => {
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Ответьте на все вопросы' }).waitFor();
    assert.equal(requests.length, 0);
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('radio', { name: '6', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByRole('heading', { name: 'Результат теста' }).waitFor();
    assert.deepEqual(requests, [{ test_id: 1, attempt_id: 5, answers: { 10: 20, 11: 30 } }]);
    assert.equal(await page.getByText('Ваш ответ: 4', { exact: true }).count(), 1);
    assert.equal(await page.getByRole('radio').first().isDisabled(), true);
    await page.reload();
    await page.getByRole('heading', { name: 'Результат теста' }).waitFor();
    assert.equal(requests.length, 1);
    assert.equal(await page.getByText('Ваш ответ: 4', { exact: true }).count(), 1);
  });
});

test('404 unavailable test shows a clear message without an answer form', async () => {
  await scenario({ loadStatus: 404 }, async (page, requests) => {
    await page.getByRole('heading', { name: 'Тест недоступен' }).waitFor();
    assert.equal(await page.getByRole('radio').count(), 0);
    assert.equal(requests.length, 0);
  });
});

test('test hidden during submission locks the form', async () => {
  await scenario({ submitStatus: 403 }, async (page, requests) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('radio', { name: '6', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Тест или попытка недоступны' }).waitFor();
    assert.equal(await page.getByRole('radio').first().isDisabled(), true);
    assert.equal(requests.length, 1);
    await page.reload();
    await page.getByRole('alert').filter({ hasText: 'Тест или попытка недоступны' }).waitFor();
    assert.equal(requests.length, 1);
  });
});

test('timeout submits partial answers without requiring every question', async () => {
  await scenario({ timeout: 1400 }, async (page, requests) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('heading', { name: 'Время прохождения истекло' }).waitFor();
    await page.getByRole('heading', { name: 'Результат теста' }).waitFor();
    assert.deepEqual(requests, [{ test_id: 1, attempt_id: 5, answers: { 10: 20 } }]);
  });
});

test('timeout without answers closes locally and does not send an invalid empty payload', async () => {
  await scenario({ timeout: 500 }, async (page, requests) => {
    await page.getByRole('heading', { name: 'Время прохождения истекло' }).waitFor();
    assert.equal(await page.getByRole('radio').first().isDisabled(), true);
    assert.equal(requests.length, 0);
    await page.reload();
    await page.getByRole('heading', { name: 'Время прохождения истекло' }).waitFor();
  });
});

test('deadline and manual submit cannot create two concurrent requests', async () => {
  await scenario({ timeout: 1500, submitDelay: 2000 }, async (page, requests) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('radio', { name: '6', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByRole('heading', { name: 'Результат теста' }).waitFor();
    assert.equal(requests.length, 1);
  });
});

test('refresh preserves chosen answers and the original deadline', async () => {
  await scenario({}, async (page) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    const original = await page.evaluate(() => JSON.parse(sessionStorage.getItem('test-passing:42:1')));
    await page.reload();
    await page.getByRole('radio', { name: '4', exact: true }).waitFor();
    assert.equal(await page.getByRole('radio', { name: '4', exact: true }).isChecked(), true);
    const restored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('test-passing:42:1')));
    assert.equal(restored.timing.expiresAt, original.timing.expiresAt);
  });
});

test('server expiration message blocks editing without displaying a fabricated result', async () => {
  await scenario({ submitStatus: 403, submitBody: { code: 'attempt_expired' } }, async (page) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('radio', { name: '6', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByRole('heading', { name: 'Время прохождения истекло' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Результат теста' }).count(), 0);
    assert.equal(await page.getByRole('radio').first().isDisabled(), true);
    await page.reload();
    await page.getByRole('heading', { name: 'Время прохождения истекло' }).waitFor();
  });
});

test('history detail works through the existing route on a mobile screen', async () => {
  await scenario({ url: '/take-test/1?attempt=5', mobile: true }, async (page, requests) => {
    await page.getByRole('heading', { name: 'Результат теста' }).waitFor();
    assert.equal(await page.getByText('Попытка №5', { exact: true }).count(), 1);
    assert.equal(requests.length, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await mkdir('test-results.local', { recursive: true });
    await page.screenshot({ path: 'test-results.local/attempt-mobile.png', fullPage: true });
  });
});

test('invalid route identifier never opens or submits a test', async () => {
  await scenario({ url: '/take-test/abc' }, async (page, requests) => {
    await page.getByText('Некорректный номер теста.', { exact: true }).waitFor();
    assert.equal(requests.length, 0);
  });
});

test('failed automatic submission allows a deliberate retry with answers locked', async () => {
  await scenario({ timeout: 1400, submitStatus: 503 }, async (page, requests) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('alert').filter({ hasText: 'Не удалось получить ответ сервера' }).waitFor();
    assert.equal(requests.length, 1);
    assert.equal(await page.getByRole('radio').first().isDisabled(), true);
    await page.reload();
    await page.getByRole('button', { name: 'Повторить отправку выбранных ответов' }).waitFor();
    assert.equal(requests.length, 1);
    await page.getByRole('button', { name: 'Повторить отправку выбранных ответов' }).click();
    await page.getByRole('alert').filter({ hasText: 'Не удалось получить ответ сервера' }).waitFor();
    assert.equal(requests.length, 2);
  });
});

test('expired authorization asks for login without leaking an editable test', async () => {
  await scenario({ loadStatus: 401 }, async (page, requests) => {
    await page.getByRole('link', { name: 'Войти', exact: true }).waitFor();
    assert.equal(await page.getByRole('radio').count(), 0);
    assert.equal(requests.length, 0);
  });
});

test('temporary refresh failure preserves tokens and allows a retry', async () => {
  await scenario({ loadStatus: 401, refreshStatus: 503 }, async (page) => {
    await page.getByRole('button', { name: 'Попробовать снова', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('refresh_token')), 'test-refresh');
    assert.equal(await page.getByRole('link', { name: 'Войти', exact: true }).count(), 0);
  });
});

test('test without questions is rejected before starting an attempt', async () => {
  await scenario({ loadBody: { ...testData, questions: [] } }, async (page, requests) => {
    await page.getByText('Сервер вернул некорректные данные теста.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Завершить тест', exact: true }).count(), 0);
    assert.equal(requests.length, 0);
  });
});

test('malformed answer option cannot crash the passing page', async () => {
  await scenario({ loadBody: { ...testData, questions: [{ ...testData.questions[0], options: [null] }] } }, async (page) => {
    await page.getByRole('heading', { name: 'Не удалось открыть тест' }).waitFor();
    assert.equal(await page.getByRole('radio').count(), 0);
  });
});

test('authorization failure during submit does not mark the attempt as completed', async () => {
  await scenario({ submitStatus: 401 }, async (page, requests) => {
    await page.getByRole('radio', { name: '4', exact: true }).check();
    await page.getByRole('radio', { name: '6', exact: true }).check();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).click();
    await page.getByRole('link', { name: 'Войти', exact: true }).waitFor();
    assert.equal(await page.getByRole('radio').first().isDisabled(), true);
    assert.equal(requests.length, 1);
    await page.reload();
    await page.getByRole('button', { name: 'Завершить тест', exact: true }).waitFor();
    assert.equal(await page.getByRole('radio', { name: '4', exact: true }).isChecked(), true);
    assert.equal(await page.getByRole('radio').first().isDisabled(), false);
    assert.equal(requests.length, 1);
  });
});
