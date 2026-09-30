import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBUbv49U4oKwkJ20rEpnUoEfunlGzh1dAc",
  authDomain: "skillswap-9436a.firebaseapp.com",
  projectId: "skillswap-9436a",
  storageBucket: "skillswap-9436a.firebasestorage.app",
  messagingSenderId: "299252690920",
  appId: "1:299252690920:web:22a4bb3dc7085663393e5d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, db, doc, setDoc, getDoc, updateDoc, collection, getDocs };

console.log("Firebase conectado correctamente ✅");