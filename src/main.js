import './style.css';
import { demoData, importDataset } from './data.js';
import { exercises } from './exercises.js';
import { caseStudy } from './story.js';
import { readDrafts, draftStorageKey } from './drafts.js';

const icons = {
  leaf: '<path d="M20 4C9 2 3 7 5 14s13 8 15-10Z"/><path d="M4 21 15 10M9 16v-5m0 5h5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  book: '<path d="M12 5c-4-3-8-2-10-1v15c3-2 6-2 10 0 4-2 7-2 10 0V4c-3-1-6-2-10 1Zm0 0v14"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 3l-4 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  play: '<path d="m8 4 13 8-13 8Z"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.code}</svg>`;
const escape = value => String(value ?? 'NULL').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (selector) => document.querySelector(selector);
let data = demoData(), active = 0, view = 'lab', busy = false, ready = false;
let worker, serial = 0, pending = new Map(), drafts = {}, completed = new Set(), expectedResults = [];
try { drafts = readDrafts(localStorage); } catch { drafts = {}; }

function saveDraft() {
  drafts[exercises[active].id] = $('#sql-editor').value;
  try { localStorage.setItem(draftStorageKey, JSON.stringify(drafts)); } catch { /* Private browsing can disable storage. */ }
}
function rpc(message, timeout = 4000) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('查詢超過 4 秒，已停止執行。請減少連接範圍或檢查遞迴條件。'));
      restartWorker();
    }, timeout);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ ...message, id });
  });
}
function newWorker() {
  worker = new Worker(new URL('./sql.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data: response }) => {
    const item = pending.get(response.id); if (!item) return;
    clearTimeout(item.timer); pending.delete(response.id);
    response.error ? item.reject(new Error(response.error)) : item.resolve(response);
  };
  worker.onerror = () => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('資料庫載入失敗，請重新整理後再試。')); }
    pending.clear(); ready = false; syncRun();
    $('#db-status').textContent = '資料庫載入失敗';
  };
}
async function restartWorker() {
  ready = false; syncRun(); worker?.terminate();
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('資料庫已重新啟動，請再執行一次。')); } pending.clear();
  newWorker();
  try {
    const initialized = await rpc({ type: 'init', data }, 20000);
    expectedResults = initialized.expected; renderExpected();
    ready = true; $('#db-status').textContent = 'SQLite 已就緒';
  }
  catch (e) { $('#db-status').textContent = '資料庫無法載入'; showError(e.message); }
  syncRun();
}

document.querySelector('#app').innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#lab" aria-label="茶序首頁"><span class="brand-mark">${icon('leaf')}</span><span>茶序<small>TEA QUERY LAB</small></span></a>
    <div class="sidebar-label">功能選單</div>
    <nav aria-label="主要導覽">
      <a href="#lab" data-view="lab" class="nav-link active">${icon('code')}查詢練習<span class="nav-count">${String(exercises.length).padStart(2, '0')}</span></a>
      <a href="#schema" data-view="schema" class="nav-link">${icon('db')}資料庫設計</a>
      <a href="#story" data-view="story" class="nav-link">${icon('book')}案例背景</a>
      <a href="#sources" data-view="sources" class="nav-link">${icon('grid')}資料與來源</a>
    </nav>
    <div class="sidebar-bottom"><div class="mini-leaf">${icon('leaf')}</div><p>手搖飲訂單分析<br>SQL 查詢練習</p></div>
  </aside>
  <main>
    <header class="topbar"><div class="breadcrumb">資料庫查詢 <span>/</span> <strong id="breadcrumb-current">查詢練習</strong></div><span class="status"><i></i><span id="db-status" role="status">正在載入 SQLite…</span></span></header>
    <div class="page">
      <section class="hero"><div><div class="eyebrow"><span></span> SQL PRACTICE</div><h1>手搖飲訂單<span>查詢練習</span></h1><p>查詢銷售排行、營收與顧客資料。<br class="desktop-break">選擇題目、修改 SQL，執行並比較結果。</p></div><div class="hero-illustration" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="floating-tag">SELECT * FROM tea;</span><div class="cup"><div class="straw"></div><div class="cup-lid"></div><div class="tea-liquid"></div><div class="cup-brand">茶<span>序</span></div><div class="pearls">● ● ●<br>● ● ● ●</div></div><span class="spark spark-one">＋</span><span class="spark spark-two">✳</span></div></section>
      <section class="metrics" aria-label="目前資料集統計"></section>
      <div class="dataset-strip"><span><i></i><strong id="dataset-name"></strong><span id="dataset-note"></span></span><button class="text-button" id="open-import">切換資料來源 ${icon('arrow')}</button></div>
      <section id="lab-view" class="view">
        <div class="section-heading"><div><span class="eyebrow">EXERCISES</span><h2>選擇練習題</h2></div><span class="progress-label" id="progress-label">已完成 0 / ${exercises.length} 道練習</span></div>
        <div class="workspace"><div class="exercise-list" role="group" aria-label="選擇練習題"></div><div class="exercise-panel">
          <div class="problem"><div class="problem-top"><span class="pill">練習 <span id="exercise-number"></span></span><div id="exercise-tags"></div></div><h3 id="exercise-title"></h3><p id="exercise-question"></p><div class="expected-hint"><strong>預期結果</strong><span id="expected-description"></span></div></div>
          <div class="editor-toolbar"><span>${icon('code')} SQL 編輯器 <small>SQLite</small></span><button class="text-button" id="reset-sql">${icon('reset')} 重設查詢</button></div>
          <div class="editor-area"><div class="line-numbers" aria-hidden="true"></div><textarea id="sql-editor" spellcheck="false" aria-label="SQL 查詢編輯器" autocapitalize="off" autocomplete="off"></textarea></div>
          <div class="editor-footer"><span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> 執行查詢</span><div><button class="secondary-button" id="load-alternate">試試修改版</button><button class="primary-button" id="run-sql" disabled>${icon('play')} 執行查詢</button></div></div>
          <div class="results"><div id="query-feedback" role="status" aria-live="polite"></div><div class="result-pair"><section class="result-pane expected-pane" aria-labelledby="expected-heading"><div class="result-heading"><h4 id="expected-heading">預期結果 <span id="expected-count"></span></h4></div><p class="result-note">依目前資料集與參考 SQL 計算。修改編輯器不會改變此表。</p><div id="expected-result" aria-live="polite"></div></section><section class="result-pane" aria-labelledby="actual-heading"><div class="result-heading"><h4 id="actual-heading">實際結果 <span id="result-count"></span></h4><span id="elapsed"></span></div><p class="result-note">執行編輯器中的 SQL 後顯示，可與左側預期結果比較。</p><div id="query-result"><div class="empty-state">${icon('db')}<p>尚未執行查詢。</p><span>按下「執行查詢」，查看實際結果。</span></div></div></section></div></div>
          <details class="comparison"><summary>理解差異：修改 SQL 後，發生了什麼？<span>＋</span></summary><p id="comparison-explanation"></p><div class="compare-actions"><button class="secondary-button" id="compare-queries">並排執行兩個版本</button><span>比較參考解答與修改版的實際結果</span></div><div id="comparison-result"></div></details>
          <details class="reference"><summary>查看參考 SQL</summary><pre id="reference-sql"></pre></details>
        </div></div>
      </section>
      <section id="schema-view" class="view" hidden></section>
      <section id="story-view" class="view" hidden></section>
      <section id="sources-view" class="view" hidden></section>
      <footer><span>茶序 TEA QUERY LAB</span><span>SQLite · 瀏覽器執行</span></footer>
    </div>
  </main>
  <dialog id="import-dialog"><form method="dialog"><button class="dialog-close" aria-label="關閉">×</button></form><span class="eyebrow">DATA SOURCE</span><h2>選擇資料來源</h2><p>預設資料為本作品獨立產生的教學資料。也可以在瀏覽器內匯入 Milk Tea Sales 的三個 CSV；檔案不會上傳伺服器。</p><div class="import-option"><strong>原創示範資料</strong><p>100 位顧客・63 種商品組合・1,202 張訂單<br>單位：新臺幣、ml。可直接開始練習。</p><button id="use-demo" class="secondary-button" type="button">使用示範資料</button></div><div class="import-option"><strong>Milk Tea Sales 原資料集</strong><p>請同時選取 customers_complete.csv、products_complete.csv、orders_complete.csv。保留原始 $ 與 oz 單位，不會換算為新臺幣。</p><label class="file-label">${icon('upload')} 選擇三個 CSV 檔案<input id="csv-files" type="file" accept=".csv,text/csv" multiple></label><p class="fine-print">原資料為作者以 Faker 等工具產生的模擬資料。公開再散布授權尚未確認，因此網站不內附原始檔。</p></div><p id="import-status" role="status" aria-live="polite"></p></dialog>
`;

function renderMetrics() {
  const cupCount = data.items.reduce((n, r) => n + r[3], 0);
  $('.metrics').innerHTML = [['顧客', data.customers.length, '位顧客', 'book'], ['商品組合', data.products.length, '種選擇', 'leaf'], ['訂單', data.orders.length, '張訂單', 'grid'], ['銷售杯數', cupCount, '杯飲品', 'db']].map(([label, n, unit, glyph], i) => `<div class="metric"><div><span class="metric-label">${label}</span><strong>${n.toLocaleString()}<small>${unit}</small></strong></div><span class="metric-icon color-${i}">${icon(glyph)}</span></div>`).join('');
  $('#dataset-name').textContent = data.label;
  $('#dataset-note').textContent = `僅供教學 · 金額單位 ${data.currency} · 不代表真實營運`;
}
function renderExercises() {
  $('.exercise-list').innerHTML = exercises.map((e, i) => `<button class="exercise-card ${i === active ? 'selected' : ''}" data-exercise="${i}" data-exercise-id="${e.id}" aria-pressed="${i === active}"><span class="exercise-index">${completed.has(i) ? icon('check') : String(i + 1).padStart(2, '0')}</span><span><small>${e.category}</small><strong>${e.title}</strong><span class="card-tags">${e.tags.join(' · ')}</span></span><span class="card-arrow">↗</span></button>`).join('');
  $('#progress-label').textContent = `本次已完成 ${completed.size} / ${exercises.length} 道練習`;
}
function lineNumbers() { $('.line-numbers').textContent = Array.from({ length: $('#sql-editor').value.split('\n').length }, (_, i) => i + 1).join('\n'); }
function selectExercise(i) {
  if (busy) return;
  active = i; const e = exercises[i];
  renderExercises();
  $('#exercise-number').textContent = String(i + 1).padStart(2, '0');
  $('#exercise-title').textContent = e.title; $('#exercise-question').textContent = e.question;
  $('#exercise-tags').innerHTML = e.tags.map(t => `<span class="tag">${t}</span>`).join('');
  $('#expected-description').textContent = e.expected;
  $('#sql-editor').value = typeof drafts[e.id] === 'string' ? drafts[e.id] : e.sql; lineNumbers();
  $('#comparison-explanation').textContent = e.explanation; $('#reference-sql').textContent = e.sql;
  $('#comparison-result').innerHTML = ''; $('#query-feedback').textContent = ''; $('#elapsed').textContent = ''; $('#result-count').textContent = '';
  renderExpected();
  $('#query-result').innerHTML = '<div class="empty-state"><p>按下「執行查詢」，查看這道題的實際結果。</p></div>';
}
function renderTable(result) {
  const { columns, values, truncated } = result;
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="查詢資料表"><table><thead><tr><th scope="col" class="row-number">#</th>${columns.map(c => `<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${values.map((r, i) => `<tr><td class="row-number">${i + 1}</td>${r.map(v => `<td>${v === null ? '<span class="null-value">NULL</span>' : escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${!values.length ? '<p class="zero-rows">查詢成功，沒有符合條件的資料（0 列）。</p>' : ''}</div>${truncated ? '<p class="limit-note">結果超過顯示上限，僅顯示前 300 列。請加上 WHERE、彙總或 LIMIT 縮小範圍。</p>' : ''}`;
}
function renderExpected() {
  const result = expectedResults[active];
  $('#expected-count').textContent = result ? `${result.truncated ? '前 ' : ''}${result.values.length} 列` : '';
  $('#expected-result').innerHTML = result ? renderTable(result) : '<p class="result-note">正在載入參考結果…</p>';
}
function syncRun() {
  for (const id of ['run-sql', 'compare-queries', 'reset-sql', 'load-alternate', 'open-import']) if ($('#' + id)) $('#' + id).disabled = !ready || busy;
  document.querySelectorAll('[data-exercise]').forEach(b => b.disabled = busy);
  $('#run-sql').innerHTML = busy ? '執行中…' : `${icon('play')} 執行查詢`;
}
function showError(message) {
  $('#query-feedback').className = 'feedback error'; $('#query-feedback').textContent = `SQL 錯誤：${message}`;
  $('#query-result').innerHTML = '<div class="empty-state"><p>檢查資料表、欄位名稱與 SQL 語法後，再試一次。</p></div>';
  $('#result-count').textContent = ''; $('#elapsed').textContent = '';
}
async function execute() {
  if (!ready || busy) return;
  busy = true; syncRun(); saveDraft();
  try {
    const r = await rpc({ type: 'query', sql: $('#sql-editor').value, reference: exercises[active].sql });
    $('#query-result').innerHTML = renderTable(r.result);
    $('#result-count').textContent = `${r.result.truncated ? '前 ' : ''}${r.result.values.length} 列`;
    $('#elapsed').textContent = `${r.elapsed.toFixed(1)} ms`;
    $('#query-feedback').className = `feedback ${r.comparison ? 'success' : 'neutral'}`;
    $('#query-feedback').textContent = r.comparison ? '✓ 結果與預期結果一致（依列順序比對值）。' : '查詢執行成功。結果與預期結果不同，請對照欄位、排序或篩選條件。';
    if (r.comparison) { completed.add(active); renderExercises(); }
  } catch (e) { showError(e.message); }
  finally { busy = false; syncRun(); }
}

const fields = {
  customers: [['customer_id', 'TEXT · PK', '顧客唯一編號'], ['name', 'TEXT', '顧客顯示名稱'], ['city', 'TEXT', '居住城市'], ['subscribed', 'TEXT', '訂閱狀態 Yes / No']],
  products: [['product_id', 'TEXT · PK', '口味、甜度、珍珠、容量組合編號'], ['flavor', 'TEXT', '飲品口味'], ['sweetness', 'TEXT', '甜度'], ['pearl_type', 'TEXT', '珍珠或配料種類'], ['size_label', 'TEXT', '容量，附 ml 或 oz 單位'], ['price_cents', 'INTEGER', '菜單單價，以分儲存']],
  orders: [['order_id', 'TEXT · PK', '訂單唯一編號'], ['order_date', 'TEXT', '日期 YYYY-MM-DD'], ['customer_id', 'TEXT · FK', '對應 customers.customer_id']],
  order_items: [['item_id', 'INTEGER · PK', '明細唯一編號'], ['order_id', 'TEXT · FK', '對應 orders.order_id'], ['product_id', 'TEXT · FK', '對應 products.product_id'], ['quantity', 'INTEGER', '正整數杯數'], ['unit_price_cents', 'INTEGER', '成交單價，以分儲存']],
};
function renderSchema() {
  $('#schema-view').innerHTML = `<div class="section-heading"><div><span class="eyebrow">DATABASE SCHEMA</span><h2>資料表與關聯</h2></div></div><div class="content-card"><h3>實體關聯圖 ERD</h3><p>每位顧客可以有多張訂單，每張訂單可以有多筆明細，每種商品可以出現在多筆明細中。所有子表記錄都必須對應一筆父表記錄。</p><div class="erd">${['customers', 'orders', 'order_items', 'products'].map((name, i) => `${i ? `<div class="erd-link">${i === 3 ? 'N ← 1' : '1 → N'}</div>` : ''}<div class="erd-table"><strong>${icon('db')}${name}</strong>${fields[name].map(([f, type]) => `<span>${escape(f)}<small>${type.includes('PK') ? 'PK' : type.includes('FK') ? 'FK' : ''}</small></span>`).join('')}</div>`).join('')}</div><div class="info-callout">PK 為主鍵、FK 為外鍵。圖中 1 → N 表示一對多；實際上父表可有零筆子資料，例如沒有下單的顧客。</div></div><div class="content-card"><h3>為什麼訂單與明細要分開？</h3><p>同一張訂單可能買三種飲品。訂單日期與顧客只需記錄一次，每種飲品的數量放在明細，避免重複儲存。明細另外保存成交單價，確保未來菜單調價不會改寫歷史營收。</p><p>匯入原資料時，CSV 沒有提供歷史成交價，因此會以商品表的現有單價建立明細；這是教學假設，不能視為真實歷史價格。</p></div>${Object.entries(fields).map(([name, fs]) => `<div class="content-card"><h3 class="mono">${name}</h3><div class="table-scroll"><table><thead><tr><th>欄位</th><th>型別／鍵</th><th>說明</th></tr></thead><tbody>${fs.map(([f, t, d]) => `<tr><td class="mono">${f}</td><td>${t}</td><td>${d}</td></tr>`).join('')}</tbody></table></div><h4>目前資料的樣本（前 3 筆）</h4>${renderTable({ columns: fs.map(f => f[0]), values: (data[name === 'order_items' ? 'items' : name]).slice(0, 3) })}</div>`).join('')}`;
}
function renderStory() {
  $('#story-view').innerHTML = caseStudy(data, { escape, renderTable });
}

function renderSources() {
  $('#sources-view').innerHTML = `<div class="section-heading"><div><span class="eyebrow">DATA SOURCES</span><h2>資料來源與使用方式</h2></div></div><div class="content-card"><span class="pill">目前使用：${escape(data.label)}</span><h3>資料來源與使用限制</h3><p>${escape(data.description)}</p><h4>網站內附：原創示範資料</h4><p>本作品以固定種子獨立產生 100 位匿名顧客、63 種商品組合與 1,202 張訂單，並未複製 Milk Tea Sales 的顧客或交易資料。商品為教學用虛構菜單，金額使用新臺幣，容量使用 ml。五位顧客刻意沒有訂單，用於外連接練習；另外安排 2023 與 2024 年一月的訂單，展示跨年分組差異。</p><h4>可本機匯入：Milk Tea Sales</h4><p>作者：williamjowens。原始專案包含 1,000 位顧客、525 種商品組合、5,000 張訂單與 14,960 筆明細，日期範圍為 2023-10-29 至 2024-10-27。作者的程式使用 Faker 與隨機抽樣，屬於合成教學資料。</p><p><a href="https://github.com/williamjowens/excel-dashboard-milk-tea-sales" target="_blank" rel="noopener noreferrer">原始專案 ↗</a> · <a href="https://github.com/williamjowens/excel-dashboard-milk-tea-sales/tree/main/data/raw" target="_blank" rel="noopener noreferrer">三個原始 CSV ↗</a> · <a href="https://github.com/williamjowens/excel-dashboard-milk-tea-sales/blob/main/data/milk_tea_data_creation_and_validation.ipynb" target="_blank" rel="noopener noreferrer">資料產生方式 ↗</a></p><p>查閱日期：2026-10-28。未找到明確的公開再散布授權，因此網站不內附原始 CSV。使用者可自行取得檔案，在本機瀏覽器匯入；檔案不會上傳，也不會永久儲存，重新整理會回到示範資料。</p><button class="secondary-button" id="sources-import">${icon('upload')} 匯入已取得的 CSV</button></div><div class="content-card"><h3>單位與轉換方式</h3><ul class="reflection"><li>金額以整數「分」儲存；查詢除以 100.0 轉為元，避免整數除法。</li><li>原資料的 $ 符號與 oz 容量保持原樣，不逕自宣稱是新臺幣。</li><li>原始訂單明細拆分為 orders 與 order_items，不增加不存在的訂單。</li><li>匯入時只保留顧客編號、名稱、城市、訂閱狀態；不保留電話、地址與電子郵件。</li><li>訂閱欄位為原資料的訂閱狀態，不能直接解讀為付費會員。</li></ul></div><div class="content-card"><h3>查詢與隱私</h3><p>SQL.js 在瀏覽器內執行 SQLite，使用獨立工作執行緒。只允許單一 SELECT 或 WITH 查詢，資料庫為唯讀；查詢超過 4 秒會終止並重啟。結果最多顯示 300 列。SQL 草稿只存在這台裝置的 localStorage，匯入資料只留在當次分頁記憶體。</p><p>技術：Vite、SQL.js（MIT 授權）；不需要後端資料庫帳密。</p></div>`;
  $('#sources-import').onclick = () => $('#import-dialog').showModal();
}
function navigate() {
  const next = location.hash.slice(1) || 'lab'; view = ['lab', 'schema', 'story', 'sources'].includes(next) ? next : 'lab';
  for (const v of ['lab', 'schema', 'story', 'sources']) $(`#${v}-view`).hidden = v !== view;
  document.querySelectorAll('[data-view]').forEach(a => { a.classList.toggle('active', a.dataset.view === view); if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#breadcrumb-current').textContent = { lab: '查詢練習', schema: '資料庫設計', story: '案例背景', sources: '資料與來源' }[view];
}

$('.exercise-list').onclick = e => { const b = e.target.closest('[data-exercise]'); if (b) selectExercise(Number(b.dataset.exercise)); };
$('#sql-editor').oninput = () => { lineNumbers(); saveDraft(); };
$('#sql-editor').onscroll = () => { $('.line-numbers').scrollTop = $('#sql-editor').scrollTop; };
$('#sql-editor').onkeydown = e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); execute(); }
  if (e.key === 'Tab') { e.preventDefault(); const el = e.target, start = el.selectionStart; el.setRangeText('  ', start, el.selectionEnd, 'end'); lineNumbers(); saveDraft(); }
};
$('#run-sql').onclick = execute;
$('#reset-sql').onclick = () => { $('#sql-editor').value = exercises[active].sql; lineNumbers(); saveDraft(); };
$('#load-alternate').onclick = () => { $('#sql-editor').value = exercises[active].alternate; lineNumbers(); saveDraft(); $('#sql-editor').focus(); };
$('#open-import').onclick = () => $('#import-dialog').showModal();
$('#compare-queries').onclick = async () => {
  if (!ready || busy) return; busy = true; syncRun();
  try {
    const a = await rpc({ type: 'query', sql: exercises[active].sql }), b = await rpc({ type: 'query', sql: exercises[active].alternate });
    $('#comparison-result').innerHTML = `<div class="comparison-grid"><div><h4>參考版本 · ${a.result.values.length} 列</h4>${renderTable(a.result)}</div><div><h4>修改版本 · ${b.result.values.length} 列</h4><pre>${escape(exercises[active].alternate)}</pre>${renderTable(b.result)}</div></div>`;
  } catch (e) { $('#comparison-result').textContent = e.message; }
  finally { busy = false; syncRun(); }
};
async function changeData(next) {
  if (busy || !ready) throw new Error('請等目前的查詢或資料庫啟動完成後再試。');
  busy = true; syncRun();
  try {
    const initialized = await rpc({ type: 'init', data: next }, 20000);
    data = next; expectedResults = initialized.expected;
    completed.clear(); renderMetrics(); renderSchema(); renderStory(); renderSources();
    busy = false; selectExercise(active); $('#import-dialog').close(); $('#import-status').textContent = '';
  } finally { busy = false; syncRun(); }
}
$('#use-demo').onclick = async () => { try { await changeData(demoData()); } catch (e) { $('#import-status').textContent = e.message; } };
$('#csv-files').onchange = async e => {
  try {
    const files = [...e.target.files];
    if (files.length !== 3 || files.some(f => f.size > 20 * 1024 * 1024)) throw new Error('請選擇三個 CSV，每個檔案不得超過 20 MB。');
    $('#import-status').textContent = '正在檢查並建立資料庫…';
    const contents = Object.fromEntries(await Promise.all(files.map(async f => [f.name, await f.text()])));
    await changeData(importDataset(contents));
  } catch (e) { $('#import-status').textContent = `匯入失敗：${e.message} 原有資料仍保留。`; }
  finally { e.target.value = ''; }
};
$('#story-view').onclick = event => {
  const link = event.target.closest('[data-case-exercise]');
  if (!link) return;
  if (busy) { event.preventDefault(); return; }
  const index = exercises.findIndex(e => e.id === link.dataset.caseExercise);
  if (index >= 0) selectExercise(index);
};
window.addEventListener('hashchange', navigate);
renderMetrics(); renderSchema(); renderStory(); renderSources(); selectExercise(0); navigate(); restartWorker();
