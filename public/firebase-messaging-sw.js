importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Dynamically fetch config or use placeholder since it's just the SW
// Usually we need the config here. We'll try to get it from query params or hardcode it.
// The easiest is to hardcode it from firebase-applet-config.json
const firebaseConfig = {
  projectId: "wise-focus-409p9",
  appId: "1:383900506261:web:2b836fb75b2317f14f639c",
  apiKey: "AIzaSyCjHN5ZoQCd3FUQjVeSw_-Ruvqi-TeGms0",
  authDomain: "wise-focus-409p9.firebaseapp.com",
  messagingSenderId: "383900506261"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
