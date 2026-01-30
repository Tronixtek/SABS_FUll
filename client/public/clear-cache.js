// Clear all caches and unregister service workers
(function() {
  console.log('🔄 Clearing cache and service workers...');
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        registration.unregister().then(function() {
          console.log('✅ Service worker unregistered');
        });
      }
    });
  }
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        caches.delete(cacheName).then(function() {
          console.log('✅ Cache deleted:', cacheName);
        });
      });
    });
  }
  
  // Force reload after clearing
  setTimeout(function() {
    console.log('🔄 Reloading page...');
    window.location.reload(true);
  }, 1000);
})();
