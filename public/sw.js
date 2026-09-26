self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: "/icon-192x192.png", // fallback icon
        badge: "/icon-192x192.png",
        data: {
          url: data.url || "/",
        },
      };

      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error("Error parsing push payload", e);
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url;
  
  if (!urlToOpen) return;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
