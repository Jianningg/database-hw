import test from 'node:test';
import assert from 'node:assert/strict';
import { readDrafts, draftStorageKey } from '../src/drafts.js';

test('old numbered SQL drafts remain attached to their original exercises', () => {
  const previous = JSON.stringify({ 0: 'SELECT flavor FROM products;', 3: 'SELECT order_date FROM orders;', 5: 'SELECT 42;' });
  const storage = { getItem: key => key === 'tea-drafts' ? previous : null };
  assert.deepEqual(readDrafts(storage), {
    'sales-volume': 'SELECT flavor FROM products;',
    monthly: 'SELECT order_date FROM orders;',
    loyalty: 'SELECT 42;',
  });
});

test('saved drafts with stable IDs take precedence over legacy drafts', () => {
  const storage = { getItem: key => key === draftStorageKey ? JSON.stringify({ budget: 'SELECT 1;', monthly: 'SELECT 2;' }) : JSON.stringify({ 0: 'SELECT 99;' }) };
  assert.deepEqual(readDrafts(storage), { budget: 'SELECT 1;', monthly: 'SELECT 2;' });
  assert.deepEqual(readDrafts({ getItem: () => { throw new Error('Storage disabled'); } }), {});
});
