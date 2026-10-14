// This is service worker script for offline app support

// update this cache name if site content (js/html/css) changes
const PROJECT_PREFIX = 'nannool-shell';
const CACHE_NAME = 'nannool-shell-v10';
const ASSETS = [
  // html files, directories
  './',
  './concordance.html',
  './index.html',
  './search.html',

  // css files
  './common.css',

  // all js files
  './json_load.js',
  './concordance_utils.js',
  './mobile_detect.js',
];

// Install: Cache static app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Force the waiting service worker to become active right away
  self.skipWaiting();
});

// Activate: Clean up old shells if you bump version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Only touch caches belonging to THIS project, and delete old versions of it
          if (key.startsWith(PROJECT_PREFIX) && key !== CACHE_NAME) {
            console.log(`[SW] Deleting obsolete project cache: ${key}`);
            return caches.delete(key);
          }
        })
      )
    }).then(() => {
      // Take control of all open pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch: Serve app shell from cache when offline, network otherwise
// Intercept requests and ignore query strings for cache matching
// because all our query param handling is by JS in the respective pages.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const scope = self.registration.scope;

  const isAppShell = ASSETS.some(asset => {
    const resolvedPath = new URL(asset, scope).pathname;
    return url.pathname === resolvedPath;
  });

  const isRoot =
    url.pathname.endsWith('/') ||
    url.pathname === new URL('./index.html', scope).pathname;

  if (event.request.mode === 'navigate' || isRoot || isAppShell) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cached => {
        return cached || fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(
              new URL('./index.html', scope).href,
              { ignoreSearch: true }
            );
          }
        });
      })
    );
  }
});