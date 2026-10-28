import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { demoData, parseCSV, importDataset } from '../src/data.js';
import { createDatabase, query } from '../src/database.js';
import { exercises } from '../src/exercises.js';

const SQL = await initSqlJs();
const data = demoData();
const byID = Object.fromEntries(exercises.map(e => [e.id, e]));
const db = createDatabase(SQL, data);
test.after(() => db.close());

test('repeatable dataset preserves relationships and five customers without orders', () => {
  assert.deepEqual(demoData(), data);
  assert.equal(data.products.length, 63);
  assert.equal(data.orders.length, 1202);
  assert.equal(query(db, 'SELECT COUNT(*) FROM pragma_foreign_key_check').values[0][0], 0);
  assert.equal(query(db, byID['inactive'].sql).values.length, 5);
  assert.equal(query(db, byID['inactive'].alternate).values.length, 0);
});

test('all seven reference and alternate queries execute against the real database', () => {
  assert.equal(exercises.length, 7);
  assert.equal(new Set(exercises.map(e => e.id)).size, 7);
  for (const e of exercises) {
    assert.ok(query(db, e.sql).columns.length > 0, e.title);
    assert.ok(query(db, e.alternate).columns.length > 0, e.title);
  }
  const cups = query(db, byID['sales-volume'].sql).values.reduce((n, r) => n + r[1], 0);
  assert.equal(cups, data.items.reduce((n, r) => n + r[3], 0));
  const money = query(db, byID['revenue'].sql).values.reduce((n, r) => n + r[1], 0);
  assert.equal(money, data.items.reduce((n, r) => n + r[3] * r[4], 0) / 100);
  assert.equal(query(db, byID['monthly'].sql).values.length, 13);
});

test('budget filter includes the 60-unit boundary, preserves half-sugar condition and sorts prices', () => {
  const result = query(db, byID.budget.sql).values;
  assert.deepEqual(result.map(r => r[0]), ['P002', 'P011', 'P005', 'P020', 'P014', 'P029', 'P008', 'P023', 'P038']);
  assert.ok(result.every(r => r[2] === '半糖' && r[4] <= 60));
  assert.equal(query(db, byID.budget.alternate).values.length, 21);
});

test('month-only grouping merges January across years without changing total revenue', () => {
  const byYear = query(db, byID.monthly.sql).values;
  const byMonth = query(db, byID.monthly.alternate).values;
  assert.equal(byYear.length, 13);
  assert.equal(byMonth.length, 12);
  const january2023 = byYear.find(r => r[0] === '2023-01');
  const january2024 = byYear.find(r => r[0] === '2024-01');
  assert.equal(january2023[1], 80);
  assert.ok(january2024[1] > 0);
  assert.equal(byMonth.find(r => r[0] === '01')[1], january2023[1] + january2024[1]);
  assert.equal(byYear.reduce((sum, r) => sum + r[1], 0), byMonth.reduce((sum, r) => sum + r[1], 0));
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
  assert.equal(query(db, 'SELECT COUNT(*) FROM orders').values[0][0], 1202);
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
    assert.equal(query(other, byID['revenue'].sql).values[0][1], 21.25);
    assert.equal(query(other, byID['inactive'].sql).values[0][0], 'C2');
  } finally { other.close(); }
});
test('rejects missing references, invalid quantities, conflicting order headers and invalid dates', () => {
  const change = s => ({ ...files, 'orders_complete.csv': s });
  const header = 'Order ID,Order Date,Customer ID,Product ID,Quantity\n';
  for (const row of ['O1,2024-01-01,C9,P1,1', 'O1,2024-01-01,C1,P1,-1', 'O1,2024-02-30,C1,P1,1', 'O1,2024-01-01,C1,P1,1\nO1,2024-01-02,C1,P1,1']) {
    assert.throws(() => importDataset(change(header + row)));
  }
});
