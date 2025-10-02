// Service Worker for MediGuide PWA
const CACHE_NAME = 'mediguide-cache-v1';
const urlsToCache = [
    '/', // Caches the root, which typically resolves to index.html
    'index.html',
    'manifest.json',
    // External resources that should be cached
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    'https://res.cloudinary.com/dowhvdkjh/image/upload/v1758017228/image_puig4p.png' // The logo image
];

// Install event: Caches the initial assets
self.addEventListener('install', event => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-caching all required assets');
                // Attempt to cache all, but handle failures gracefully, especially for external CDNs
                return cache.addAll(urlsToCache).then(() => {
                    console.log('[Service Worker] All core assets cached successfully.');
                }).catch(error => {
                    // Log errors but don't fail installation for non-critical assets
                    console.error('[Service Worker] Failed to cache some resources:', error);
                    // Critical local assets must be cached, non-critical external assets can be skipped if failed
                });
            })
    );
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker
});

// Activate event: Cleans up old caches (important for updates)
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of clients immediately
    return self.clients.claim();
});

// Fetch event: Intercepts network requests and serves from cache first
self.addEventListener('fetch', event => {
    // Strategy: Cache-First for static assets, Network-First for API calls
    
    // Check if the request is for the Gemini API (using a simple heuristic for demonstration)
    const isApiCall = event.request.url.includes('generativelanguage.googleapis.com');
    
    if (isApiCall) {
        // Network-First for dynamic/API content
        event.respondWith(
            fetch(event.request).catch(error => {
                // If API call fails, just throw the error or return a fallback
                console.error('API request failed:', error);
                return new Response(JSON.stringify({ error: "Network connection required for AI analysis." }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
    } else {
        // Cache-First for all other static assets (HTML, CSS, Fonts, Images)
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    // No match in cache - fetch from network
                    return fetch(event.request);
                })
        );
    }
});
