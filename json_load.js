const DB_NAME = 'NannoolDB';
const STORE_NAME = 'json_cache';
const DB_VERSION = 1;

// Bump this ONLY when your underlying JSON corpus data changes
const CURRENT_CORPUS_VERSION = 1;

// ==========================================
// Global Service Worker Registration
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[SW] Registered successfully, scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });

  // Globally handle silent page reloads when a new worker takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}


// ==========================================
// Open IndexDB Corpus database for Nannool
// ==========================================
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}


// ==========================================
// IndexDB Corpus Version Handshake
// ==========================================

// Prevents duplicate checks *within* the exact same page view
let  versionCheckedForThisPage = false;

// Version Handshake
async function versionHandshake(db) {
  if (versionCheckedForThisPage) return;
  versionCheckedForThisPage = true;

  const t0 = performance.now();
  const cachedVersion = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('app_version');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

  if (cachedVersion !== CURRENT_CORPUS_VERSION) {
    console.log("New version detected. Purging old cache...");
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(CURRENT_CORPUS_VERSION, 'app_version');
      tx.oncomplete = () => resolve();
    });
  }

  const t1 = performance.now();
  console.log(`[Perf] loadJSON -> versionHandshake by in ${(t1 - t0).toFixed(2)} ms`);
}

// ============================================================
// Load from ownloaded, decompressed, parsed, cached JSON store
// ============================================================

async function loadJSON(filename) {
  const t0 = performance.now();
  const db = await openDatabase();

  // 1. Version Handshake
  await versionHandshake(db);

  // 2. Check IndexedDB cache for the requested file
  const cachedData = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(filename);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (cachedData !== undefined) {
    const t1 = performance.now();
    console.log(`[Perf] loadJSON ${filename} by cache hit in ${(t1 - t0).toFixed(2)} ms`);
    return cachedData; // Instant retrieval from local DB
  }

  // 3. Fetch fresh if not cached or cache was just cleared
  const r0 = performance.now();
  const response = await fetch(filename);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.statusText}`);
  }

  let data;
  if (filename.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = response.body.pipeThrough(ds);
    data = await new Response(decompressedStream).json();
  } else {
    data = await response.json();
  }
  const r1 = performance.now();
  console.log(`[Perf] loadJSON ${filename} network read in ${(r1 - r0).toFixed(2)} ms`);

  // 4. Save to IndexedDB
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, filename);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  const t1 = performance.now();
  console.log(`[Perf] loadJSON ${filename} without cache hit in ${(t1 - t0).toFixed(2)} ms`);

  return data;
}
