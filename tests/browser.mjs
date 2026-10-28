import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const output = '/tmp/tea-query-lab'; await mkdir(output, { recursive: true });
try {
  await page.goto(process.env.TEA_TEST_URL || 'http://127.0.0.1:5173/');
  await page.getByText('SQLite 已就緒', { exact: true }).waitFor();
  for (let i = 0; i < 6; i++) {
    await page.locator(`[data-exercise="${i}"]`).click();
    await page.locator('#run-sql').click();
    await page.locator('#query-feedback.success').waitFor();
    assert.ok(await page.locator('#query-result table').count());
  }
  await page.locator('[data-exercise="2"]').click();
  await page.locator('#run-sql').click();
  await page.locator('#query-feedback.success').waitFor();
  assert.equal(await page.locator('#query-result tbody tr').count(), 5);
  await page.locator('.comparison summary').click();
  await page.locator('#compare-queries').click();
  await page.locator('.comparison-grid .zero-rows').waitFor();
  assert.equal(await page.locator('.comparison-grid').count(), 1);
  await page.locator('#sql-editor').fill('SELECT nonexistent FROM orders;');
  await page.locator('#run-sql').click();
  await page.locator('#query-feedback.error').waitFor();
  assert.match(await page.locator('#query-feedback').textContent(), /no such column/);
  await page.locator('#sql-editor').fill('DELETE FROM orders;');
  await page.locator('#run-sql').click();
  await page.waitForFunction(() => document.querySelector('#query-feedback').textContent.includes('SELECT'));
  await page.locator('#sql-editor').fill("SELECT '<img src=x onerror=alert(1)>' AS test;");
  await page.locator('#run-sql').click();
  await page.locator('#query-feedback.neutral').waitFor();
  assert.equal(await page.locator('#query-result img').count(), 0);
  assert.match(await page.locator('#query-result').textContent(), /<img/);
  // A runaway query must terminate without freezing the page; the dataset must survive.
  await page.locator('#sql-editor').fill('WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n) SELECT SUM(x) FROM n;');
  await page.locator('#run-sql').click();
  await page.waitForFunction(() => document.querySelector('#query-feedback').textContent.includes('超過 4 秒'), { timeout: 12000 });
  await page.locator('#run-sql').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#run-sql').disabled);
  await page.locator('#reset-sql').click();
  await page.locator('#run-sql').click();
  await page.locator('#query-feedback.success').waitFor();
  assert.equal(await page.locator('#query-result tbody tr').count(), 5);
  for (const view of ['schema', 'story', 'sources', 'lab']) {
    await page.locator(`[data-view="${view}"]`).click();
    assert.equal(await page.locator(`#${view}-view`).isVisible(), true);
  }
  if (process.env.TEA_SOURCE_DIR) {
    await page.locator('#open-import').click();
    await page.locator('#csv-files').setInputFiles(['customers_complete.csv', 'products_complete.csv', 'orders_complete.csv'].map(f => path.join(process.env.TEA_SOURCE_DIR, f)));
    await page.waitForFunction(() => document.querySelector('#dataset-name').textContent.includes('原資料集'));
    assert.match(await page.locator('.metrics').textContent(), /1,000/);
    assert.match(await page.locator('.metrics').textContent(), /5,000/);
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-exercise="${i}"]`).click();
      await page.locator('#run-sql').click();
      await page.locator('#query-feedback.success').waitFor();
    }
    assert.equal(await page.locator('#query-result tbody tr').count(), 20);
    await page.locator('[data-exercise="2"]').click();
    await page.locator('#run-sql').click();
    await page.locator('#query-feedback.success').waitFor();
    assert.equal(await page.locator('#query-result tbody tr').count(), 5);
    await page.locator('[data-exercise="3"]').click();
    await page.locator('#run-sql').click();
    await page.locator('#query-feedback.success').waitFor();
    assert.equal(await page.locator('#query-result tbody tr').count(), 13);
    await page.locator('#open-import').click();
    await page.locator('#use-demo').click();
    await page.waitForFunction(() => document.querySelector('#dataset-name').textContent === '原創模擬資料');
  }
  await page.locator('[data-exercise="0"]').click();
  await page.locator('#run-sql').click();
  await page.locator('#query-feedback.success').waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ['lab', 'schema', 'story', 'sources']) {
    await page.locator(`[data-view="${view}"]`).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} has horizontal overflow`);
  }
  await page.locator('[data-view="lab"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${output}/mobile.png`, fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: six exercises, live comparisons, SQL errors, read-only protection, escaping, timeout recovery, navigation, desktop and mobile layouts' + (process.env.TEA_SOURCE_DIR ? ', original 3-CSV import and dataset switching' : ''));
} finally { await browser.close(); }
