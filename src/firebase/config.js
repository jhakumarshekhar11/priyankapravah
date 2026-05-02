import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARFNSg6Mh_DyG_eVbkVDam59nBJG40jx4",
  authDomain: "priyankapravah.firebaseapp.com",
  databaseURL: "https://priyankapravah-default-rtdb.firebaseio.com",
  projectId: "priyankapravah",
  storageBucket: "priyankapravah.firebasestorage.app",
  messagingSenderId: "895455395916",
  appId: "1:895455395916:web:d0e3e5def0c0d00643f4e9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();