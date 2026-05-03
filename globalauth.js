import { auth, signOut, onAuthStateChanged, googleProvider, signInWithPopup } from '../firebaseconfig.js';

// THE UPGRADE: Make this an Array (list) of UIDs instead of just one!
const ADMIN_UIDS = [
    "oJIKlGUW0ca9Z21VIaIYn3Rsvre2", // Admin 1
    "xCROrNRjgrSmVh57NH84diZ0prT2"       // Admin 2 (Replace this with their actual UID)
]; 

document.addEventListener('DOMContentLoaded', () => {
    
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navAdmin = document.getElementById('nav-admin');

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
            
            // THE UPGRADE: Check if the user's UID is IN our list of admins
            if (isAdminPage && !ADMIN_UIDS.includes(user.uid)) {
                window.location.replace("/index.html"); 
                return;
            }

            if (navLogin) navLogin.classList.add('hidden');
            if (navLogout) navLogout.classList.remove('hidden');

            // THE UPGRADE: Show Admin link if they are in the list
            if (ADMIN_UIDS.includes(user.uid)) {
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