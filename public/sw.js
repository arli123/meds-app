// Service Worker for medication reminders
const CACHE_NAME = 'meds-app-v1';
const APP_SHELL = ['/', '/index.html', '/src/main.jsx'];

// Map of pending reminder timeouts per scheduleId
const pendingReminders = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Silently fail if shell files aren't available yet
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  const { type, scheduleId, medicationName, scheduledTime } = event.data || {};

  if (type === 'SCHEDULE_REMINDER') {
    scheduleHourlyReminder(scheduleId, medicationName, scheduledTime);
  }

  if (type === 'CANCEL_REMINDER') {
    cancelReminder(scheduleId);
  }

  if (type === 'CANCEL_ALL_REMINDERS') {
    pendingReminders.forEach((_, id) => cancelReminder(id));
  }
});

function scheduleHourlyReminder(scheduleId, medicationName, scheduledTime) {
  // Cancel any existing reminder for this schedule
  cancelReminder(scheduleId);

  const sendNotification = () => {
    self.registration.showNotification('תזכורת תרופות 💊', {
      body: `שכחת לקחת: ${medicationName} (${scheduledTime})`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `med-${scheduleId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'taken', title: 'לקחתי ✓' },
        { action: 'snooze', title: 'תזכור לי בעוד שעה' },
      ],
      data: { scheduleId, medicationName, scheduledTime },
    });
  };

  // Send immediately
  sendNotification();

  // Chain timeouts to repeat every hour
  function scheduleNext() {
    const timeoutId = setTimeout(() => {
      sendNotification();
      scheduleNext();
    }, 60 * 60 * 1000); // 1 hour

    pendingReminders.set(scheduleId, timeoutId);
  }

  scheduleNext();
}

function cancelReminder(scheduleId) {
  if (pendingReminders.has(scheduleId)) {
    clearTimeout(pendingReminders.get(scheduleId));
    pendingReminders.delete(scheduleId);
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const { action } = event;
  const { scheduleId } = event.notification.data || {};

  event.notification.close();

  if (action === 'taken' && scheduleId) {
    cancelReminder(scheduleId);
    // Notify all clients that user marked as taken from notification
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'MARK_TAKEN_FROM_NOTIFICATION', scheduleId });
      });
    });
  }

  if (action === 'snooze' && scheduleId) {
    // The hourly interval already handles this, just close
    return;
  }

  // Default: focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('notificationclose', () => {
  // User dismissed the notification — do nothing, reminder will fire again next hour
});
