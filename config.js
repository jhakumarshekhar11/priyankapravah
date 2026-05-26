// Configuration file for sensitive values
// For production: Use Render environment variables

const CONFIG = {
    // IMPORTANT: Firebase API key is PUBLIC by design - security is enforced by Firestore Rules
    // DO NOT put private keys here
    
    // Contact Information (Update these in one place)
    CONTACT: {
        PHONE: process.env.CONTACT_PHONE || "+91-8210576238",
        WHATSAPP: process.env.CONTACT_WHATSAPP || "918210576238"
    },

    // Social Media Links
    SOCIAL: {
        FACEBOOK: "https://www.facebook.com/priyankapravah",
        INSTAGRAM: "https://www.instagram.com/priyankapravah",
        WHATSAPP: "https://wa.me/918210576238"
    },

    // Admin verification is now handled server-side via Firebase Custom Claims
    // See globalauth.js for how this is implemented
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
