// AUTO-GENERATED CLEAN CONFIG FOR EXPO + FIREBASE WEB SDK
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Replace with your Firebase Web config values
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPuJNwVjR5VOzVIWeJ8QMcVBZs6vcsnDc",
  authDomain: "smart-gate-pass-system-d35b9.firebaseapp.com",
  databaseURL: "https://smart-gate-pass-system-d35b9-default-rtdb.firebaseio.com",
  projectId: "smart-gate-pass-system-d35b9",
  storageBucket: "smart-gate-pass-system-d35b9.firebasestorage.app",
  messagingSenderId: "739095518994",
  appId: "1:739095518994:web:4e39711b78d05ed592ddcb",
  measurementId: "G-HL1FR92JKP"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
