import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { demoData, parseCSV, importDataset } from '../src/data.js';
import { createDatabase, query } from '../src/database.js';
import { exercises } from '../src/exercises.js';

const SQL = await initSqlJs();
const data = demoData();
const db = createDatabase(SQL, data);
test.after(() => db.close());

test('repeatable dataset preserves relationships and five customers without orders', () => {
  assert.deepEqual(demoData(), data);
  assert.equal(data.products.length, 63);
  assert.equal(data.orders.length, 1200);
  assert.equal(query(db, 'SELECT COUNT(*) FROM pragma_foreign_key_check').values[0][0], 0);
  assert.equal(query(db, exercises[2].sql).values.length, 5);
  assert.equal(query(db, exercises[2].alternate).values.length, 0);
});

test('all six reference and alternate queries execute against the real database', () => {
  for (const e of exercises) {
    assert.ok(query(db, e.sql).columns.length > 0, e.title);
    assert.ok(query(db, e.alternate).columns.length > 0, e.title);
  }
  const cups = query(db, exercises[0].sql).values.reduce((n, r) => n + r[1], 0);
  assert.equal(cups, data.items.reduce((n, r) => n + r[3], 0));
  const money = query(db, exercises[1].sql).values.reduce((n, r) => n + r[1], 0);
  assert.equal(money, data.items.reduce((n, r) => n + r[3] * r[4], 0) / 100);
  assert.equal(query(db, exercises[3].sql).values.length, 12);
});

test('read only boundary, single statement enforcement, errors and output cap', () => {
  assert.throws(() => query(db, 'DELETE FROM orders;'));
  assert.throws(() => query(db, 'WITH x AS (SELECT 1) DELETE FROM orders;'));
  assert.throws(() => query(db, 'PRAGMA query_only=OFF;'));
  assert.throws(() => query(db, 'SELECT 1; SELECT 2;'));
  assert.throws(() => query(db, 'SELECT missing FROM orders;'));
  assert.equal(query(db, "SELECT ';' AS punctuation;").values[0][0], ';');
  const limited = query(db, 'SELECT * FROM order_items');
  assert.equal(limited.values.length, 300);
  assert.equal(limited.truncated, true);
  assert.equal(query(db, 'SELECT COUNT(*) FROM orders').values[0][0], 1200);
});

const files = {
  'customers_complete.csv': 'Customer ID,Name,City,Subscribed\r\nC1,"A, B",Taipei,Yes\r\nC2,C,Taipei,No',
  'products_complete.csv': 'Product ID,Flavor,Sweetness Level,Pearl Type,Size (oz),Unit Price ($)\nP1,Classic,50%,Classic,16,4.25',
  'orders_complete.csv': 'Order ID,Order Date,Customer ID,Product ID,Quantity\nO1,2024-02-29,C1,P1,3\nO1,2024-02-29,C1,P1,2',
};
test('CSV quoting, BOM, multiline and malformed rows', () => {
  assert.deepEqual(parseCSV('\uFEFFA,B\r\n"hi,\nthere","say ""yes"""\r\n'), [{ A: 'hi,\nthere', B: 'say "yes"' }]);
  assert.throws(() => parseCSV('a,b\n"unfinished,b'));
  assert.throws(() => parseCSV('a,b\n1,2,3'));
});
test('imports source format, splits order headers, preserves price units, omits contact data', () => {
  const imported = importDataset(files);
  assert.equal(imported.orders.length, 1);
  assert.equal(imported.items.length, 2);
  assert.equal(imported.items[0][4], 425);
  assert.equal(imported.products[0][4], '16 oz');
  assert.equal(imported.currency, '$');
  const other = createDatabase(SQL, imported);
  try {
    assert.equal(query(other, exercises[1].sql).values[0][1], 21.25);
    assert.equal(query(other, exercises[2].sql).values[0][0], 'C2');
  } finally { other.close(); }
});
test('rejects missing references, invalid quantities, conflicting order headers and invalid dates', () => {
  const change = s => ({ ...files, 'orders_complete.csv': s });
  const header = 'Order ID,Order Date,Customer ID,Product ID,Quantity\n';
  for (const row of ['O1,2024-01-01,C9,P1,1', 'O1,2024-01-01,C1,P1,-1', 'O1,2024-02-30,C1,P1,1', 'O1,2024-01-01,C1,P1,1\nO1,2024-01-02,C1,P1,1']) {
    assert.throws(() => importDataset(change(header + row)));
  }
});
