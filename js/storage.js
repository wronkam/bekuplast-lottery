/* Persistence: lottery progress + preferences in localStorage, uploaded files in IndexedDB. */
(function (L) {
  'use strict';
  const cfg = window.LOTTERY_CONFIG;
  const K = (s) => `${cfg.storageKey}:${s}`;

  function getJSON(key, fallback) {
    try {
      const v = localStorage.getItem(K(key));
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function setJSON(key, value) {
    try { localStorage.setItem(K(key), JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function remove(key) {
    try { localStorage.removeItem(K(key)); } catch (e) { /* ignore */ }
  }

  /* ---- tiny IndexedDB key/value store (holds uploaded CSVs + image Files) ---- */
  function db() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(cfg.storageKey, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  L.store = {
    loadState: () => (cfg.persist ? getJSON('state', null) : null),
    saveState: (s) => cfg.persist && setJSON('state', s),
    clearState: () => remove('state'),
    loadPrefs: () => getJSON('prefs', {}),
    savePrefs: (p) => setJSON('prefs', p),
    async getUpload() {
      try { return (await idb('readonly', (s) => s.get('upload'))) || null; } catch (e) { return null; }
    },
    setUpload: (u) => idb('readwrite', (s) => s.put(u, 'upload')),
    async clearUpload() {
      try { await idb('readwrite', (s) => s.delete('upload')); } catch (e) { /* ignore */ }
    },
  };
})((window.Lottery = window.Lottery || {}));
