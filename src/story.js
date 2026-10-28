import { exercises } from './exercises.js';

export function caseStudy(data, { escape, renderTable }) {
  const number = id => exercises.findIndex(e => e.id === id) + 1;
  const products = new Map(data.products.map(p => [p[0], p]));
  const customers = new Map(data.customers.map(c => [c[0], c]));
  const byOrder = new Map();
  for (const item of data.items) {
    if (!byOrder.has(item[1])) byOrder.set(item[1], []);
    byOrder.get(item[1]).push(item);
  }
  const order = data.orders.find(o => byOrder.get(o[0])?.length > 1) || data.orders[0];
  const customer = customers.get(order[2]);
  const items = byOrder.get(order[0]);
  const cups = items.reduce((sum, i) => sum + i[3], 0);
  const amount = items.reduce((sum, i) => sum + i[3] * i[4], 0);
  const money = cents => escape(`${data.currency} ${(cents / 100).toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const orderedCustomers = new Set(data.orders.map(o => o[2]));
  const noOrders = data.customers.filter(c => !orderedCustomers.has(c[0]));
  const variants = data.products.filter(p => p[1] === products.get(items[0][2])[1]).slice(0, 3);

  return `<div class="section-heading"><div><span class="eyebrow">CASE STUDY</span><h2>案例背景：手搖飲店營運分析</h2></div></div>
    <div class="content-card"><h3>這份資料要解決什麼問題？</h3>
      <p>本案例以手搖飲店的營運分析為情境。訂單記錄了顧客在什麼日期購買哪些飲品，以及各品項的數量與成交單價。店長可依這些紀錄安排備料、追蹤營收，並找出尚未購買的顧客。</p>
      <p>目前使用 <strong>${escape(data.label)}</strong>。以下例子的編號、數量與金額都取自目前載入的資料，切換資料來源時會同步更新。這些資料是模擬資料，不能當成真實市場調查。</p>
      ${renderTable({ columns: ['使用者', '要回答的問題', '相關資料表'], values: [
        ['店長', '哪個口味賣出最多杯？哪個口味營收最高？', 'products、order_items'],
        ['營運助理', '每月營收多少？統計有沒有混入不同年份？', 'orders、order_items'],
        ['顧客經營人員', '誰還沒有下單？哪些顧客累積消費較高？', 'customers、orders、order_items'],
      ] })}
      <p>銷售杯數可作為備料參考；資料沒有原料配方、庫存與損耗，無法直接算出實際需要採購多少原料。</p>
    </div>
    <div class="content-card"><h3>每張表的一列代表什麼？</h3>
      ${renderTable({ columns: ['資料表', '一列的意義', '連接方式'], values: [
        ['customers', '一位顧客的基本資料', 'customer_id 是主鍵'],
        ['products', '一種口味、甜度、配料與容量的商品組合', 'product_id 是主鍵'],
        ['orders', '一張訂單的日期與下單顧客', 'customer_id 連到 customers'],
        ['order_items', '某張訂單中的一筆商品明細與購買數量', 'order_id 連到 orders；product_id 連到 products'],
      ] })}
      <p>一張訂單可以購買多種商品，因而產生多筆明細。顧客姓名與訂單日期不必在每筆商品資料重複保存，查詢時再以編號連接。</p>
      <a href="#schema">查看 ERD、欄位型別與樣本資料 →</a>
    </div>
    <div class="content-card" id="case-example" data-order-id="${escape(order[0])}" data-cups="${cups}" data-total-cents="${amount}">
      <h3>實際例子：訂單 ${escape(order[0])}</h3>
      <ol class="case-steps">
        <li><strong>確認下單顧客</strong><p>在 customers 找到 ${escape(customer[0])}（${escape(customer[1])}），城市為 ${escape(customer[2])}。這一列代表顧客本人。</p></li>
        <li><strong>確認訂單日期與所屬顧客</strong><p>orders 的 ${escape(order[0])} 記錄日期 ${escape(order[1])}，其中 customer_id 為 ${escape(order[2])}，因此能對應到這位顧客。</p></li>
        <li><strong>連接明細與商品</strong><p>以 order_id 找出下列 ${items.length} 筆明細，再用 product_id 查到口味、甜度與容量。數量儲存在明細的 quantity 欄位。</p></li>
      </ol>
      ${renderTable({ columns: ['明細編號', '商品編號', '口味', '甜度', '容量', '數量', `成交單價（${data.currency}）`, `明細金額（${data.currency}）`], values: items.map(i => {
        const p = products.get(i[2]);
        return [i[0], p[0], p[1], p[2], p[4], i[3], (i[4] / 100).toFixed(2), (i[3] * i[4] / 100).toFixed(2)];
      }) })}
      <div class="info-callout">這張訂單共有 <strong>${items.length} 筆明細、${cups} 杯飲品、金額 ${money(amount)}</strong>。對明細使用 COUNT(*) 得到 ${items.length}；使用 SUM(quantity) 得到 ${cups}；計算 SUM(quantity × unit_price_cents) / 100.0 得到 ${money(amount)}。</div>
      <p>把 orders 連接 order_items 後，這張訂單的 order_id 會出現 ${items.length} 次。統計訂單數要使用 COUNT(DISTINCT order_id)，才能得到 1 張。</p>
      <div class="case-query-links"><a href="#lab" data-case-exercise="sales-volume">練習 ${number('sales-volume')}：杯數與明細筆數 →</a><a href="#lab" data-case-exercise="loyalty">練習 ${number('loyalty')}：訂單數與明細筆數 →</a></div>
    </div>
    <div class="content-card"><h3>同一口味，為什麼有不同商品編號？</h3>
      ${renderTable({ columns: ['商品編號', '口味', '甜度', '配料', '容量'], values: variants.map(p => p.slice(0, 5)) })}
      <p>上面每列的口味相同，但甜度、配料或容量組合不同，因此各有 product_id。按 product_id 分組會得到各商品組合的銷量；按 flavor 分組才會把同一口味的不同組合合計。</p>
    </div>
    <div class="content-card"><h3>這個案例採用的資料規則</h3>
      <ul class="reflection">
        <li>每張訂單屬於一位顧客；一位顧客可以有零張或多張訂單。</li>
        <li>每筆明細對應一張訂單和一種商品，quantity 必須是正整數。新增明細不會新增一位顧客。</li>
        <li>主鍵用於識別與連接資料。姓名或口味可能重複，不能只因名稱相同就認定是同一筆資料。</li>
        <li>目前所有資料欄位都有值。LEFT JOIN 找不到對應訂單時，查詢結果中的訂單欄位會產生 NULL，可用 IS NULL 判斷。</li>
        <li>日期以 YYYY-MM-DD 儲存；按月統計應保留年份，避免把不同年份的同月份合併。</li>
        <li>金額以整數分保存，轉為元時除以 100.0。營收使用明細的 unit_price_cents，不直接使用可能改價的商品菜單價格。</li>
        <li>${data.source === 'import' ? '原資料沒有歷史成交單價；匯入時以商品表單價建立明細價格，這是教學假設。金額保留原始 $ 符號，容量保留 oz。' : '示範資料建立訂單時，會把商品單價複製到明細；金額為新臺幣，容量為 ml。'}</li>
        <li>subscribed 只代表訂閱狀態，不能當成付費會員或實際回購紀錄。</li>
      </ul>
      <div class="info-callout">${noOrders.length ? `目前有 ${noOrders.length} 位顧客沒有訂單，例如 ${escape(noOrders[0][0])}。以 customers LEFT JOIN orders 後，該顧客的訂單欄位為 NULL；INNER JOIN 則不會保留這位顧客。` : '目前所有顧客都有訂單；查詢「沒有下單的顧客」會得到零列，這也是有效結果。'}</div>
      <div class="case-query-links"><a href="#lab" data-case-exercise="inactive">練習 ${number('inactive')}：找出沒有訂單的顧客 →</a></div>
    </div>
    <div class="content-card"><h3>這份資料無法回答的問題</h3><p>資料沒有實際成本、庫存、原料用量、退款或訂單取消狀態，也沒有真實顧客行為。因此可以計算樣本內的銷售金額與數量，不能據此判定實際利潤、庫存缺口或真實消費者偏好。</p></div>`;
}
