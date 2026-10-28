export const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE customers (customer_id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, subscribed TEXT NOT NULL);
CREATE TABLE products (product_id TEXT PRIMARY KEY, flavor TEXT NOT NULL, sweetness TEXT NOT NULL, pearl_type TEXT NOT NULL, size_label TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents > 0));
CREATE TABLE orders (order_id TEXT PRIMARY KEY, order_date TEXT NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(customer_id));
CREATE TABLE order_items (item_id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(order_id), product_id TEXT NOT NULL REFERENCES products(product_id), quantity INTEGER NOT NULL CHECK(quantity > 0), unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents > 0));
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_items_product ON order_items(product_id);
`;
export function createDatabase(SQL, data) {
  const db = new SQL.Database();
  try {
    db.run(schema); db.run('BEGIN');
    for (const [name, rows] of [['customers', data.customers], ['products', data.products], ['orders', data.orders], ['order_items', data.items]]) {
      const stmt = db.prepare(`INSERT INTO ${name} VALUES (${rows[0].map(() => '?').join(',')})`);
      try { for (const row of rows) stmt.run(row); } finally { stmt.free(); }
    }
    db.run('COMMIT'); db.run('PRAGMA query_only = ON;'); return db;
  } catch (e) { db.close(); throw e; }
}

export function query(db, sql, limit = 300) {
  // Reject multiple statements through SQLite's own statement parser.
  let count = 0;
  for (const stmt of db.iterateStatements(sql)) { stmt.free(); count++; }
  if (count !== 1 || !/^\s*(?:SELECT|WITH)\b/i.test(sql)) throw new Error('請輸入一個 SELECT 或 WITH 查詢；此練習室不開放修改資料。');
  const stmt = db.prepare(sql);
  try {
    const columns = stmt.getColumnNames(), values = [];
    while (values.length <= limit && stmt.step()) values.push(stmt.get());
    const truncated = values.length > limit;
    return { columns, values: values.slice(0, limit), truncated };
  } finally { stmt.free(); }
}
