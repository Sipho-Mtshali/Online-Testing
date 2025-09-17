import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC8m_iv91L2EUEc6Xsg5DJHGWTdfUcxGZY",
  authDomain: "edutech-system.firebaseapp.com",
  projectId: "edutech-system",
  storageBucket: "edutech-system.firebasestorage.app",
  messagingSenderId: "1072073327476",
  appId: "1:1072073327476:web:5fdd0c76218a3a772ca221",
  measurementId: "G-6M9540ZEPE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);