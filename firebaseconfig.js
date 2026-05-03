// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyARFNSg6Mh_DyG_eVbkVDam59nBJG40jx4",
  authDomain: "priyankapravah.firebaseapp.com",
  databaseURL: "https://priyankapravah-default-rtdb.firebaseio.com",
  projectId: "priyankapravah",
  storageBucket: "priyankapravah.firebasestorage.app",
  messagingSenderId: "895455395916",
  appId: "1:895455395916:web:d0e3e5def0c0d00643f4e9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, doc, setDoc, getDoc, collection, addDoc, serverTimestamp };