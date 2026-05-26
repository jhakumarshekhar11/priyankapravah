import { auth, signOut, onAuthStateChanged, googleProvider, signInWithPopup, signInWithCredential } from '../firebaseconfig.js';
// NOTE: We need GoogleAuthProvider specifically to format the credential
import { GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// SECURITY FIX: Admin roles now verified via Firebase Custom Claims (server-side)
// DO NOT hardcode admin UIDs in client code
// Instead, use Firebase Security Rules to verify role: request.auth.token.admin == true

// YOUR GOOGLE CLIENT ID FOR ONE TAP (OK to keep public - OAuth handles security)
const GOOGLE_CLIENT_ID = "895455395916-4921fqvivmo6gj0aegeksnha1l4pefs2.apps.googleusercontent.com";

/**
 * Check if current user is admin by verifying custom claims
 * This requires Firebase Custom Claims to be set server-side
 * @param {object} user - Firebase Auth user object
 * @returns {boolean} - True if user has admin claim
 */
async function isUserAdmin(user) {
    if (!user) return false;
    try {
        // Get fresh token claims from Firebase
        const idTokenResult = await user.getIdTokenResult();
        return idTokenResult.claims.admin === true;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// --- TOAST NOTIFICATION LOGIC ---
function showToast(message, type = 'default') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navAdmin = document.getElementById('nav-admin');

    // =========================================
    // 1. ROUTE GUARDS & AUTH STATE LISTENER
    // =========================================
    onAuthStateChanged(auth, async (user) => {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('/login') || currentPath.includes('/signup');
        const isAdminPage = currentPath.includes('/admin');

        if (user) {
            // --- USER IS SIGNED IN ---
            if (isAuthPage) {
                window.location.replace("/rcorner/index.html"); 
                return; 
            }
            
            // Check admin status via Firebase Custom Claims
            const isAdmin = await isUserAdmin(user);
            
            if (isAdminPage && !isAdmin) {
                window.location.replace("/index.html"); 
                return;
            }

            if (navLogin) navLogin.classList.add('hidden');
            if (navLogout) navLogout.classList.remove('hidden');

            if (isAdmin) {
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

            // --- TRIGGER ONE TAP SIGN-IN ---
            // We wait a brief moment to ensure the Google script loaded via HTML is ready
            setTimeout(() => {
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleOneTapResponse,
                        auto_select: false, // Prevents auto-login loop if they explicitly sign out
                        cancel_on_tap_outside: false
                    });
                    
                    // Display the prompt
                    window.google.accounts.id.prompt();
                }
            }, 1000);
        }
    });

    // =========================================
    // 1.5 ONE TAP CALLBACK HANDLER
    // =========================================
    async function handleOneTapResponse(response) {
        try {
            // Take the secure token from Google and format it for Firebase
            const idToken = response.credential;
            const credential = GoogleAuthProvider.credential(idToken);
            
            // Sign in to Firebase using this credential
            await signInWithCredential(auth, credential);
            showToast("Welcome back!", "success");
            
            // Note: The onAuthStateChanged listener above will automatically 
            // trigger and redirect the user if they are on a login/signup page!
            
        } catch (error) {
            console.error("One Tap Sign-in Error:", error);
            showToast("Sign-in failed. Please try again.", "error");
        }
    }

    // =========================================
    // 2. STANDARD GOOGLE BUTTON LOGIC (Fallback)
    // =========================================
    const googleBtns = document.querySelectorAll('.google-btn');
    
    if (googleBtns.length > 0) {
        googleBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); 
                try {
                    await signInWithPopup(auth, googleProvider);
                } catch (error) {
                    console.error("Google Sign-In Error:", error);
                    if (error.code !== 'auth/popup-closed-by-user') {
                        showToast("Sign-in failed. Please try again.", "error");
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
                // Tell Google One Tap to forget the auto-login state for this session
                if (window.google) window.google.accounts.id.disableAutoSelect();
                
                await signOut(auth);
                console.log("User signed out successfully");
            } catch (error) {
                console.error("Error signing out:", error);
            }
        });
    }
});