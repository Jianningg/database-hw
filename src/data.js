export function demoData() {
  let seed = 11465008;
  const random = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const flavors = ['經典奶茶', '黑糖珍珠', '抹茶拿鐵', '芋香奶茶', '芒果青茶', '草莓奶茶', '百香綠茶'];
  const products = [];
  for (let f = 0; f < flavors.length; f++) for (let s = 0; s < 3; s++) for (let t = 0; t < 3; t++) {
    products.push([`P${String(products.length + 1).padStart(3, '0')}`, flavors[f], ['無糖', '半糖', '全糖'][t], f === 1 ? '黑糖珍珠' : '無', `${[360, 500, 700][s]} ml`, (40 + f * 5 + s * 10) * 100]);
  }
  const customers = Array.from({ length: 100 }, (_, i) => [`C${String(i + 1).padStart(3, '0')}`, `顧客 ${String(i + 1).padStart(3, '0')}`, ['臺北', '新北', '桃園', '臺中'][i % 4], i % 3 ? 'Yes' : 'No']);
  const orders = [], items = [];
  for (let i = 0; i < 1200; i++) {
    const id = `T${String(i + 1).padStart(4, '0')}`;
    const date = new Date(Date.UTC(2024, 0, 1) + random(366) * 86400000).toISOString().slice(0, 10);
    orders.push([id, date, customers[random(95)][0]]);
    const selected = new Set();
    const count = random(3) + 1;
    for (let j = 0; j < count; j++) {
      let p; do { p = products[random(products.length)]; } while (selected.has(p[0]));
      selected.add(p[0]); items.push([items.length + 1, id, p[0], random(4) + 1, p[5]]);
    }
  }
  return { customers, products, orders, items, label: '原創模擬資料', currency: 'NT$', description: '使用固定種子產生的教學情境，不代表真實店家營運。', source: 'demo' };
}

// RFC 4180-style CSV parsing: handles BOM, escaped quotes and multiline cells.
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(value); value = '';
      if (c !== ',') { if (row.some(x => x !== '')) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else value += c;
  }
  if (quoted) throw new Error('CSV 引號未閉合，請確認檔案完整。');
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift();
  if (!headers) throw new Error('CSV 檔案是空的。');
  return rows.map((r, i) => {
    if (r.length !== headers.length) throw new Error(`CSV 第 ${i + 2} 列欄位數量不一致。`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}

export function importDataset(files) {
  function table(name, required) {
    if (!files[name]) throw new Error(`缺少 ${name}`);
    const rows = parseCSV(files[name]);
    if (!rows.length || required.some(k => !(k in rows[0]))) throw new Error(`${name} 缺少必要欄位或沒有資料。`);
    return rows;
  }
  const cs = table('customers_complete.csv', ['Customer ID', 'Name', 'City', 'Subscribed']);
  const ps = table('products_complete.csv', ['Product ID', 'Flavor', 'Sweetness Level', 'Pearl Type', 'Size (oz)', 'Unit Price ($)']);
  const os = table('orders_complete.csv', ['Order ID', 'Order Date', 'Customer ID', 'Product ID', 'Quantity']);
  const customers = cs.map(r => [r['Customer ID'], r.Name, r.City, r.Subscribed]);
  const products = ps.map(r => [r['Product ID'], r.Flavor, r['Sweetness Level'], r['Pearl Type'], `${r['Size (oz)']} oz`, Math.round(Number(r['Unit Price ($)']) * 100)]);
  const customerIDs = new Set(customers.map(r => r[0]));
  const productMap = new Map(products.map(r => [r[0], r]));
  if (customerIDs.size !== customers.length || productMap.size !== products.length) throw new Error('顧客或商品編號重複。');
  if (products.some(p => !Number.isSafeInteger(p[5]) || p[5] <= 0)) throw new Error('商品價格必須為正數。');
  const orderMap = new Map(), items = [];
  for (const r of os) {
    const id = r['Order ID'], customer = r['Customer ID'], product = productMap.get(r['Product ID']);
    const quantity = Number(r.Quantity), date = r['Order Date'];
    if (!id || !customerIDs.has(customer) || !product) throw new Error('訂單中有不存在的顧客或商品。');
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('訂單數量或日期無效。');
    const prev = orderMap.get(id);
    if (prev && (prev[1] !== date || prev[2] !== customer)) throw new Error(`訂單 ${id} 的日期或顧客不一致。`);
    orderMap.set(id, [id, date, customer]);
    items.push([items.length + 1, id, product[0], quantity, product[5]]);
  }
  return { customers, products, orders: [...orderMap.values()], items, label: 'Milk Tea Sales 原資料集', currency: '$', description: '作者產生的模擬交易；價格沿用原始 $ 符號，容量沿用 oz。', source: 'import' };
}
