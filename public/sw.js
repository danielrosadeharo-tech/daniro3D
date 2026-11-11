// Service worker de Daniro 3D: enseña los avisos de pedidos nuevos en el móvil del administrador.
// Solo se instala cuando el administrador activa los avisos en /admin; los clientes no lo cargan.
// Los avisos llegan por Firebase Cloud Messaging (los manda /api/avisar-pedido) como mensajes de "data".

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch { msg = { data: { cuerpo: e.data && e.data.text() } }; }
  const d = msg.data || {};
  const n = msg.notification || {};
  const titulo = d.titulo || n.title || 'Nuevo pedido';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.cuerpo || n.body || 'Ábrelo en el panel para verlo.',
    icon: '/iconos/icon-192.png',
    badge: '/iconos/badge-96.png',
    tag: d.id || undefined, // el mismo pedido no se repite si llega dos veces
    renotify: Boolean(d.id),
    lang: 'es-ES',
    data: { url: d.url || '/admin' },
  }));
});

// Al tocar el aviso: si el panel ya está abierto se trae delante; si no, se abre
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/admin', self.location.origin).href;
  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const panel = abiertas.find((c) => new URL(c.url).pathname === '/admin');
    if (panel) { await panel.focus(); return panel.navigate(url).catch(() => {}); }
    return self.clients.openWindow(url);
  })());
});
