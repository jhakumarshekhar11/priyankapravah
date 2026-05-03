import { auth, googleProvider, signInWithPopup, onAuthStateChanged } from './firebaseconfig.js';

// The specific Firebase UID for the Admin (You get this from the Firebase Console after she signs up)
const ADMIN_UID = "oJIKlGUW0ca9Z21VIaIYn3Rsvre2"; 

// Google Login Handler
const googleBtn = document.querySelector('.google-btn');
if(googleBtn) {
    googleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Scrutiny: Check if the person logging in is the Admin
            if(user.uid === ADMIN_UID) {
                window.location.href = "https://priyankapravah.onrender.com/admin/"; // Redirect Admin to dashboard
            } else {
                window.location.href = "https://priyankapravah.onrender.com/rcorner/"; // Redirect regular users to reading corner
            }
        } catch (error) {
            console.error("Login failed:", error.message);
            alert("Login failed: " + error.message);
        }
    });
}

// Admin Page Protection (Run this specifically on admin.html)
if(window.location.pathname.includes('admin.html')) {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Not logged in at all
            window.location.href = "login.html";
        } else if (user.uid !== ADMIN_UID) {
            // Logged in, but NOT the admin. Kick them out.
            alert("Unauthorized access. You are not the administrator.");
            window.location.href = "https://priyankapravah.onrender.com/";
        } else {
            // It is the Admin! Let them stay.
            console.log("Welcome Admin!");
        }
    });
}