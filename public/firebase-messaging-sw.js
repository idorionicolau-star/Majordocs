// Service worker das notificações push (Firebase Cloud Messaging).
// A versão compat deve acompanhar a versão major do pacote "firebase" (package.json).
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyB4HFV5VZ9FU3vQ3bu04KV_sHhioECJqNo",
    authDomain: "atrevamoneytracker.firebaseapp.com",
    projectId: "atrevamoneytracker",
    storageBucket: "atrevamoneytracker.appspot.com",
    messagingSenderId: "882443102074",
    appId: "1:882443102074:web:17ba3de56b34350bd718c3"
});

const messaging = firebase.messaging();

// Mensagens "data-only" (o servidor envia assim para controlar ícone e link no Android).
messaging.onBackgroundMessage((payload) => {
    const d = payload.data || {};
    const title = d.title || payload.notification?.title || 'MajorStockX';
    self.registration.showNotification(title, {
        body: d.body || payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: d.tag || undefined,
        renotify: !!d.tag,
        data: { link: d.link || '/dashboard' },
    });
});

// Tocar na notificação abre (ou foca) a app na página certa.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || '/dashboard';
    event.waitUntil((async () => {
        const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of all) {
            if ('focus' in c) {
                await c.focus();
                if ('navigate' in c) return c.navigate(link);
                return;
            }
        }
        return clients.openWindow(link);
    })());
});
