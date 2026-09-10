/* Notifications persistantes : aucun cache des API ni des sessions du jeu. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let message;
  try { message = event.data.json(); } catch { message = {}; }
  event.waitUntil(self.registration.showNotification(message.title || 'Destiny Rugby', {
    body: message.body || 'Un événement important de ton club vient de se produire.',
    icon:'/icons/icon-192.png', badge:'/icons/badge-96.png', tag:message.tag,
    data:{url:message.url || '/'}, vibrate:[160,80,160],
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let cible = new URL(event.notification.data?.url || '/', self.location.origin);
    if (cible.origin !== self.location.origin) cible = new URL('/',self.location.origin);
    const fenetres = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for (const fenetre of fenetres) {
      if (new URL(fenetre.url).origin !== self.location.origin) continue;
      // Évite de recharger une partie solo ouverte : l'application gère le lien.
      fenetre.postMessage({type:'ouvrir-match',url:cible.href});
      await fenetre.focus(); return;
    }
    await self.clients.openWindow(cible.href);
  })());
});
