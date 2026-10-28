import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { createDatabase, query } from './database.js';
let db, SQL;
self.onmessage = async ({ data: message }) => {
  try {
    if (message.type === 'init') {
      SQL ||= await initSqlJs({ locateFile: () => wasmUrl });
      const next = createDatabase(SQL, message.data);
      db?.close(); db = next;
      self.postMessage({ id: message.id, ready: true });
    } else {
      const start = performance.now();
      const result = query(db, message.sql);
      let comparison = null;
      if (message.reference) {
        const expected = query(db, message.reference);
        comparison = !expected.truncated && !result.truncated && JSON.stringify(result.values) === JSON.stringify(expected.values);
      }
      self.postMessage({ id: message.id, result, comparison, elapsed: performance.now() - start });
    }
  } catch (e) { self.postMessage({ id: message.id, error: e.message }); }
};
