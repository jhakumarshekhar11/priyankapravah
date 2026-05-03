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
        
        // THE FIX: Check for the folder names instead of the hidden .html files
        const isAuthPage = currentPath.includes('/login') || currentPath.includes('/signup');
        const isAdminPage = currentPath.includes('/admin');

        if (user) {
            // --- USER IS SIGNED IN ---

            // 🛑 ROUTE GUARD 1: Prevent signed-in users from seeing login/signup
            if (isAuthPage) {
                window.location.replace("/rcorner/index.html"); 
                return; 
            }

            // 🛑 ROUTE GUARD 2: Prevent non-admins from seeing the admin folder
            if (isAdminPage && user.uid !== ADMIN_UID) {
                window.location.replace("/index.html"); 
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

            // 🛑 ROUTE GUARD 3: Prevent unauthenticated users from seeing the admin folder
            if (isAdminPage) {
                window.location.replace("/index.html");
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
                // Sign out the user
                await signOut(auth);
                console.log("User signed out successfully");
            } catch (error) {
                console.error("Error signing out:", error);
            }
        });
    }
});