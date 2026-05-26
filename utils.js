// Security utilities for XSS prevention and safe HTML rendering

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - Escaped text safe for HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Safely create a WhatsApp URL without XSS
 * @param {string} phoneNumber - E164 format phone number (e.g., "918210576238")
 * @param {string} message - Message to send
 * @returns {string} - Safe WhatsApp URL
 */
function getWhatsAppUrl(phoneNumber, message) {
    if (!phoneNumber || !message) return '#';
    const encodedMessage = encodeURIComponent(message);
    // Ensure phone number is just digits
    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Safely set text content in an element (prevents XSS)
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to set
 */
function setSafeTextContent(element, text) {
    if (!element) return;
    element.textContent = text;
}

/**
 * Safely create an element with text (prevents XSS)
 * @param {string} tagName - HTML tag name
 * @param {object} options - {class, id, text}
 * @returns {HTMLElement} - Created element
 */
function createSafeElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    if (options.class) element.className = options.class;
    if (options.id) element.id = options.id;
    if (options.text) element.textContent = options.text;
    return element;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml, getWhatsAppUrl, setSafeTextContent, createSafeElement };
}
