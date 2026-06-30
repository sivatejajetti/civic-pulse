import { initializeApp, applicationDefault } from 'firebase-admin/app';

try {
  initializeApp({
    credential: applicationDefault()
  });
  console.log("Admin initialized successfully");
} catch (e) {
  console.error("Admin init failed:", e);
}
