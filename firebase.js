import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

/* 🔥 CHAVES DO SEU FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyAN0YMEj_f-Kfg-eCXC9KI2Ic1olKQuw_g",
  authDomain: "fluxo-caixa-2d797.firebaseapp.com",
  projectId: "fluxo-caixa-2d797",
  storageBucket: "fluxo-caixa-2d797.firebasestorage.app",
  messagingSenderId: "940749287088",
  appId: "1:940749287088:web:484d9ccbacaead4e535575",
};

const app = initializeApp(firebaseConfig);

/* FIRESTORE */
const db = getFirestore(app);

/* AUTH */
const auth = getAuth(app);

/* STORAGE (FOTOS) */
const storage = getStorage(app);

export {
  db,
  auth,
  storage,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  ref,
  uploadBytes,
  getDownloadURL,
};
