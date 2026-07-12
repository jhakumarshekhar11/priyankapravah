// ============================================================
//  firebaseconfig.js — Priyanka Pravah
//  Central Firebase initialisation & export hub.
//  Import anything Firebase-related from here, never directly
//  from the CDN URLs, so the app ID and config stay in one place.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    updateProfile,
    updateEmail,
    updatePassword,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    query,
    orderBy,
    doc,
    deleteDoc,
    updateDoc,
    getDoc,
    setDoc,
    limit,
    where,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    increment,
    writeBatch,
    runTransaction,
    collectionGroup,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── Firebase project configuration ──────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyARFNSg6Mh_DyG_eVbkVDam59nBJG40jx4",
    authDomain:        "auth.priyankapravah.live",
    projectId:         "priyankapravah",
    storageBucket:     "priyankapravah.firebasestorage.app",
    messagingSenderId: "895455395916",
    appId:             "1:895455395916:web:d0e3e5def0c0d00643f4e9",
};

// ── Initialise ───────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Auth providers ───────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
// Prompt the Google account chooser every time (prevents silent auto-select)
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Exports ──────────────────────────────────────────────────────────────────
export {
    // ── Instances ──────────────────────────────────────────
    app,
    auth,
    db,

    // ── Auth: providers & sign-in methods ──────────────────
    googleProvider,
    GoogleAuthProvider,          // needed by globalauth.js for GoogleAuthProvider.credential()
    signInWithPopup,
    signInWithCredential,

    // ── Auth: email / password ─────────────────────────────
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,

    // ── Auth: phone / OTP ──────────────────────────────────
    RecaptchaVerifier,
    signInWithPhoneNumber,

    // ── Auth: session persistence ──────────────────────────
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,

    // ── Auth: state & session ──────────────────────────────
    onAuthStateChanged,
    signOut,

    // ── Auth: account management ───────────────────────────
    updateProfile,
    updateEmail,
    updatePassword,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,

    // ── Firestore: document helpers ────────────────────────
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,

    // ── Firestore: collection helpers ──────────────────────
    collection,
    collectionGroup,
    getDocs,

    // ── Firestore: queries ─────────────────────────────────
    query,
    orderBy,
    where,
    limit,

    // ── Firestore: real-time ───────────────────────────────
    onSnapshot,

    // ── Firestore: write helpers ───────────────────────────
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment,
    writeBatch,
    runTransaction,
};