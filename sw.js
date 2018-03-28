const staticCacheName = 'restaurant-reviews-v51';
const contentImgsCache = 'restaurant-reviews-content-imgs';
const contentRestaurantCache = 'restaurant-reviews-content-restaurant';
const allCaches = [
  staticCacheName,
  contentImgsCache,
  contentRestaurantCache
];

/**
 * In the SW install event, cache static files
 */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll(
        [
            'index.html',
            'css/normalize.css',
            'css/styles.css',
            'data/restaurants.json',
            'fonts/breeserif-regular-webfont.eot',
            'fonts/breeserif-regular-webfont.svg',
            'fonts/breeserif-regular-webfont.ttf',
            'fonts/breeserif-regular-webfont.woff',
            'fonts/opensans-regular-webfont.eot',
            'fonts/opensans-regular-webfont.svg',
            'fonts/opensans-regular-webfont.ttf',
            'fonts/opensans-regular-webfont.woff',
            'js/dbhelper.js',
            'js/main.js',
            'js/restaurant_info.js'
        ]
      );
    })
  );
});

/**
 * Delete the old caches in the activate event
 */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurant-reviews-') &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

/**
 * Insert in the cache images and restaurant pages
 */
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);

  if(requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(servePhoto(event.request));
      return;
    }
  }

  if(requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith('/restaurant.html')) {
      event.respondWith(serveRestaurant(event.request));
      return;
    }
  }

    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
});

function servePhoto(request) {
  const storageUrl = request.url;
  return caches.open(contentImgsCache).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) return response;
      return fetch(request).then(function(networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

function serveRestaurant(request) {
  const storageUrl = request.url;
  return caches.open(contentRestaurantCache).then(function(cache) {
    return cache.match(storageUrl).then(function(response) {
      if (response) return response;
      return fetch(request).then(function(networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

/**
 * Message that serves to update the SW by the user
 */
self.addEventListener('message', function(event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});