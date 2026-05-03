// global-auth.js
import { auth, signOut, onAuthStateChanged } from './firebaseconfig.js';

// The specific Firebase UID for the Admin
const ADMIN_UID = "oJIKlGUW0ca9Z21VIaIYn3Rsvre2"; 

document.addEventListener('DOMContentLoaded', () => {
    
    const navLogin = document.getElementById('nav-login');
    const navLogout = document.getElementById('nav-logout');
    const navAdmin = document.getElementById('nav-admin');

    // 1. Listen for Authentication State Changes
    onAuthStateChanged(auth, (user) => {
        
        // Check which page the user is currently on
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
        const isAdminPage = currentPath.includes('admin.html');

        if (user) {
            // --- USER IS SIGNED IN ---

            // 🛑 ROUTE GUARD 1: If on login/signup, kick them to the Reading Corner
            if (isAuthPage) {
                window.location.replace("reading-corner.html");
                return; // Stop running the rest of the script
            }

            // 🛑 ROUTE GUARD 2: If on Admin page but NOT the admin, kick them to Home
            if (isAdminPage && user.uid !== ADMIN_UID) {
                window.location.replace("index.html"); // Silent, immediate redirect
                return;
            }

            // Update Navbar UI
            if (navLogin) navLogin.classList.add('hidden');
            if (navLogout) navLogout.classList.remove('hidden');

            // Show/Hide Admin Nav Link
            if (user.uid === ADMIN_UID) {
                if (navAdmin) navAdmin.classList.remove('hidden');
            } else {
                if (navAdmin) navAdmin.classList.add('hidden');
            }
            
        } else {
            // --- USER IS NOT SIGNED IN ---

            // 🛑 ROUTE GUARD 3: If an unauthenticated user tries to open Admin, kick them to Home
            if (isAdminPage) {
                window.location.replace("index.html");
                return;
            }

            // Update Navbar UI
            if (navLogin) navLogin.classList.remove('hidden');
            if (navLogout) navLogout.classList.add('hidden');
            if (navAdmin) navAdmin.classList.add('hidden');
        }
    });

    // 2. Handle Logout Button Click
    if (navLogout) {
        navLogout.addEventListener('click', async (e) => {
            e.preventDefault(); 
            try {
                await signOut(auth);
                console.log("User signed out successfully");
                window.location.href = "index.html"; 
            } catch (error) {
                console.error("Error signing out:", error);
            }
        });
    }
});