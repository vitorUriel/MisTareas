/*
   

// Nombre y versión del caché 
/*
 IMPORTANTE: Al cambiar archivos del proyecto, incrementar la
 versión (v1 → v2) para que el SW instale un caché nuevo y
 descarte el anterior durante la fase de 'activate'.
 */
const CACHE_NAME = 'todo-pwa-cache-v2';

/*
 Lista de recursos que se guardarán en caché durante la
 instalación del Service Worker (Application Shell).
 Esto permite que la app funcione completamente sin red.
 */
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.png',
  // Si agregas más archivos al proyecto (imágenes, fuentes locales,
  // etc.), inclúyelos aquí para que también estén disponibles offline.
];

// Evento: install 
/*
  Se dispara cuando el navegador instala el Service Worker
  por primera vez (o cuando se detecta un SW actualizado).
 
  e.waitUntil() mantiene el SW en estado "installing" hasta
  que la promesa se resuelva (todos los recursos cacheados).
 */
self.addEventListener('install', (e) => {
  console.log('[SW] Instalando Service Worker...');

  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando recursos del Application Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );

  /*
    self.skipWaiting() hace que el SW nuevo tome control
    inmediatamente sin esperar a que se cierren las pestañas con el SW anterior activo.
   */
  self.skipWaiting();
});

// Evento: activate 
/*
 Se dispara cuando el Service Worker toma control de la página.
 Es el momento ideal para limpiar cachés de versiones anteriores
 y evitar que ocupen espacio de almacenamiento.
 */
self.addEventListener('activate', (e) => {
  console.log('[SW] Activando Service Worker...');

  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // Cacés que NO son el actual
          .map(name => {
            console.log('[SW] Eliminando caché obsoleto:', name);
            return caches.delete(name);
          })
      );
    })
  );

  /*
   clients.claim() hace que el SW tome control de todas las
   pestañas abiertas inmediatamente, sin necesidad de recargar.
   */
  return self.clients.claim();
});

// Evento: fetch 
/*
 Intercepta TODAS las peticiones de red que hace la página.
 Estrategia: Cache First (Caché Primero).

  1. Busca el recurso en el caché local.
  2a. Si existe → lo retorna inmediatamente (sin red).
  2b. Si NO existe → lo pide a la red, lo guarda en caché para futuras visitas y lo retorna.

  Esta estrategia garantiza:
   - Carga ultrarrápida para recursos ya cacheados.
   - Funcionamiento offline si el recurso fue visitado antes.
 */
self.addEventListener('fetch', (e) => {
  // Solo interceptamos peticiones GET (no POST, PUT, DELETE, etc.)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Recurso encontrado en caché
      if (cachedResponse) {
        return cachedResponse;
      }

      // Recurso no está en caché → buscar en red
      return fetch(e.request).then((networkResponse) => {
        // Guardamos una copia del recurso en caché para offline
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si la red falla y el recurso no está en caché,
        // se podría retornar una página de "sin conexión" personalizada.
        // Por ahora simplemente no se retorna nada (el navegador mostrará su error).
        console.warn('[SW] Sin caché y sin red para:', e.request.url);
      });
    })
  );
});