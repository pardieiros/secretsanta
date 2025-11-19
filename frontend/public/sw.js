/**
 * Service Worker for Secret Santa PWA
 * Handles push notifications and offline functionality
 */

// Workbox manifest will be injected here by VitePWA
// @ts-ignore
self.__WB_MANIFEST

const CACHE_NAME = 'secretsanta-v1'

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  return self.clients.claim()
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Secret Santa',
    body: 'Tem uma nova notificação',
    icon: '/src/assets/img/logo_128.png',
    badge: '/src/assets/img/logo_64.png',
    tag: 'secretsanta-notification',
    requireInteraction: false,
    data: {
      url: '/',
    },
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: {
          url: data.url || data.data?.url || '/',
          ...data.data,
        },
      }
    } catch (e) {
      // If not JSON, try as text
      const text = event.data.text()
      if (text) {
        notificationData.body = text
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Abrir',
        },
        {
          action: 'close',
          title: 'Fechar',
        },
      ],
    })
  )
})

// Notification click event - handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const notificationData = event.notification.data || {}

  if (action === 'close') {
    return
  }

  // Default action or 'open' action
  const urlToOpen = notificationData.url || '/'

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
