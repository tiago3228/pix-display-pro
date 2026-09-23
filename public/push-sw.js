self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? "Você recebeu uma atualização." };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Novo pedido | Vitrini", {
      body: payload.body ?? "Um novo pedido chegou na sua loja.",
      icon: payload.icon ?? "/favicon.ico",
      badge: payload.badge ?? "/favicon.ico",
      tag: payload.tag ?? "vitrini-order",
      renotify: true,
      data: { url: payload.url ?? "/pedidos" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url ?? "/pedidos", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
