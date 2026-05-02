const CACHE_NAME = 'lastbook-v2';
const LOCAL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/launchericon-48x48.png',
  '/launchericon-72x72.png',
  '/launchericon-96x96.png',
  '/launchericon-144x144.png',
  '/launchericon-192x192.png',
  '/launchericon-512x512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

// 缓存第三方 CDN 资源的 helper（安装后首次请求时缓存）
function cacheFirstThenNetwork(req) {
  return caches.match(req).then(cached => {
    if (cached) return cached;
    return fetch(req).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return res;
    });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 本地资源：缓存优先 + 后台更新
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // CDN 资源（Font Awesome, Google Fonts, Sortable.js）：缓存优先，无网络时也不卡住
  event.respondWith(cacheFirstThenNetwork(req));
});
