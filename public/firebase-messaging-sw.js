importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyB4HFV5VZ9FU3vQ3bu04KV_sHhioECJqNo",
    authDomain: "atrevamoneytracker.firebaseapp.com",
    projectId: "atrevamoneytracker",
    storageBucket: "atrevamoneytracker.appspot.com",
    messagingSenderId: "882443102074",
    appId: "1:882443102074:web:17ba3de56b34350bd718c3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
