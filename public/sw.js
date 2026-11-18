/*
 * LucApp service worker: only shows push notifications (no offline cache).
 * The server sends JSON { title, body, url, tag } (see the notifications module).
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "LucApp", body: event.data.text(), url: "/" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "LucApp", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icon/192",
      badge: "/icon/192",
      data: { url: data.url || "/" },
    }),
  );
});

/** Opens the page of the notification, reusing an open LucApp window when there is one. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.navigate(url).then((client) => (client || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
