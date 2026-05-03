// globalauth.js
// ADDED: googleProvider and signInWithPopup to the imports
import { auth, signOut, onAuthStateChanged, googleProvider, signInWithPopup } from './firebaseconfig.js';

// The specific Firebase UID for the Admin
const ADMIN_UID = "xCROrNRjgrSmVh57NH84diZ0prT2"; 

document.addEventListener('DOMContentLoaded', () => {
    
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navAdmin = document.getElementById('nav-admin');

    // =========================================
    // 1. ROUTE GUARDS & AUTH STATE LISTENER
    // =========================================
    onAuthStateChanged(auth, (user) => {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('/login') || currentPath.includes('/signup');
        const isAdminPage = currentPath.includes('/admin');

        if (user) {
            // --- USER IS SIGNED IN ---
            if (isAuthPage) {
                window.location.replace("/rcorner/index.html"); 
                return; 
            }
            if (isAdminPage && user.uid !== ADMIN_UID) {
                window.location.replace("/index.html"); 
                return;
            }

            if (navLogin) navLogin.classList.add('hidden');
            if (navLogout) navLogout.classList.remove('hidden');

            if (user.uid === ADMIN_UID) {
                if (navAdmin) navAdmin.classList.remove('hidden');
            } else {
                if (navAdmin) navAdmin.classList.add('hidden');
            }
            
        } else {
            // --- USER IS NOT SIGNED IN ---
            if (isAdminPage) {
                window.location.replace("/index.html");
                return;
            }

            if (navLogin) navLogin.classList.remove('hidden');
            if (navLogout) navLogout.classList.add('hidden');
            if (navAdmin) navAdmin.classList.add('hidden');
        }
    });

    // =========================================
    // 2. GOOGLE SIGN-IN LOGIC (The Missing Piece!)
    // =========================================
    const googleBtns = document.querySelectorAll('.google-btn');
    
    if (googleBtns.length > 0) {
        googleBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); 
                try {
                    // Trigger the Google Popup
                    await signInWithPopup(auth, googleProvider);
                    
                    // Notice we don't redirect here! 
                    // The onAuthStateChanged listener above will instantly detect 
                    // the successful login and trigger the Route Guard to redirect them safely.
                } catch (error) {
                    console.error("Google Sign-In Error:", error);
                    // Only alert if the user didn't intentionally close the popup
                    if (error.code !== 'auth/popup-closed-by-user') {
                        alert("Sign-in failed. Please try again.");
                    }
                }
            });
        });
    }

    // =========================================
    // 3. LOGOUT LOGIC
    // =========================================
    if (navLogout) {
        navLogout.addEventListener('click', async (e) => {
            e.preventDefault(); 
            try {
                await signOut(auth);
                console.log("User signed out successfully");
            } catch (error) {
                console.error("Error signing out:", error);
            }
        });
    }
});