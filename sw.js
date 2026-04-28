// Service Worker for offline PWA functionality

const CACHE_NAME = 'farmers-survey-v1';
const APP_SHELL_CACHE = 'app-shell-v1';
const DATA_CACHE = 'survey-data-v1';

// Files to cache for app shell
const APP_SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './assets/styles.css',
  './modules/app.js',
  './modules/state.js',
  './modules/survey.js',
  './modules/db.js',
  './modules/csv.js',
  './modules/share.js',
  './modules/utils.js'
];

// Files to cache for data
const DATA_FILES = [
  './config/survey.json'
];

// Install event - cache app shell and data
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(APP_SHELL_CACHE).then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      }),
      
      // Cache data files
      caches.open(DATA_CACHE).then((cache) => {
        console.log('Service Worker: Caching data files');
        return cache.addAll(DATA_FILES);
      })
    ])
    .then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== APP_SHELL_CACHE && 
              cacheName !== DATA_CACHE && 
              cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
    .catch((error) => {
      console.error('Service Worker: Activation failed', error);
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.origin === self.location.origin) {
    // Same origin requests
    
    // App shell files - cache first, then network
    if (APP_SHELL_FILES.some(file => url.pathname === file || url.pathname === '/')) {
      event.respondWith(
        caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request).then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(APP_SHELL_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            
            return response;
          }).catch(() => {
            // Return cached version if network fails
            return caches.match(request);
          });
        })
      );
      return;
    }
    
    // Data files - cache first, then network with update
    if (DATA_FILES.some(file => url.pathname === file)) {
      event.respondWith(
        caches.match(request).then((response) => {
          // Always try to fetch from network to update cache
          const networkFetch = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DATA_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          });
          
          // Return cached version immediately, update in background
          if (response) {
            networkFetch.catch(() => {}); // Don't let network errors break anything
            return response;
          }
          
          // No cached version, wait for network
          return networkFetch;
        })
      );
      return;
    }
    
    // Icon files - cache first
    if (url.pathname.startsWith('/assets/icons/')) {
      event.respondWith(
        caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(APP_SHELL_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          });
        })
      );
      return;
    }
  }
  
  // External CDN requests (Alpine.js) - network first, cache fallback
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }
  
  // Default: network first, cache fallback
  event.respondWith(
    fetch(request).then((response) => {
      // Cache successful responses for offline use
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    }).catch(() => {
      // Try cache if network fails
      return caches.match(request);
    })
  );
});

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'FORCE_UPDATE':
      // Force update of data files
      updateDataFiles();
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

// Update data files from network
async function updateDataFiles() {
  try {
    const cache = await caches.open(DATA_CACHE);
    
    for (const file of DATA_FILES) {
      try {
        const response = await fetch(file);
        if (response.status === 200) {
          await cache.put(file, response);
          console.log('Service Worker: Updated file:', file);
        }
      } catch (error) {
        console.error('Service Worker: Failed to update file:', file, error);
      }
    }
    
    // Notify all clients about the update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DATA_UPDATED',
        files: DATA_FILES
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Failed to update data files', error);
  }
}

// Background sync for when app comes back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      updateDataFiles()
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-update') {
    event.waitUntil(
      updateDataFiles()
    );
  }
});

// Handle notification clicks (for future features)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});

// Push notification handler (for future features)
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have a new survey update',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/icon-72x72.png',
    tag: 'survey-update'
  };
  
  event.waitUntil(
    self.registration.showNotification('Farmers Survey Update', options)
  );
});
