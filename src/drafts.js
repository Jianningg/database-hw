const legacyIDs = ['sales-volume', 'revenue', 'inactive', 'monthly', 'sweetness', 'loyalty'];
export const draftStorageKey = 'tea-drafts-by-id';

export function readDrafts(storage) {
  function read(key) {
    try {
      const value = JSON.parse(storage.getItem(key));
      return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch { return null; }
  }
  const current = read(draftStorageKey);
  if (current) return Object.fromEntries(Object.entries(current).filter(([, value]) => typeof value === 'string'));
  const old = read('tea-drafts') || {};
  // Previous versions stored drafts by array index. Keep each draft attached to
  // its original problem when a new exercise is inserted at the beginning.
  return Object.fromEntries(legacyIDs.flatMap((id, index) => typeof old[index] === 'string' ? [[id, old[index]]] : []));
}
