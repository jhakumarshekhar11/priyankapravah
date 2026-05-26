import { db, collection, getDocs, query, orderBy } from '../firebaseconfig.js';
import { getWhatsAppUrl } from '../utils.js';
import { CONFIG } from '../config.js';

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '<div class="spinner"></div><p style="text-align:center; width:100%;">Loading products...</p>';

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        grid.innerHTML = '';

        if (snapshot.empty) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No products available right now. Check back soon!</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            
            // Grab the first image to use as the cover
            const coverImage = data.images && data.images.length > 0 ? data.images[0] : 'placeholder.jpg';

            // Use phone number from config instead of hardcoded
            const phoneNumber = CONFIG.CONTACT.WHATSAPP;
            const whatsappMessage = `Hello, I'm interested in buying the product: "${data.title}".`;
            const whatsappUrl = getWhatsAppUrl(phoneNumber, whatsappMessage);

            // SECURITY FIX: Build DOM elements safely to prevent XSS
            const card = document.createElement('article');
            card.className = 'library-card reveal delay-1 active';
            card.style.cursor = 'pointer';
            
            const img = document.createElement('img');
            img.src = escapeHtml(coverImage);
            img.alt = data.title || 'Product';
            img.style.width = '100%';
            img.style.height = '350px';
            img.style.objectFit = 'cover';
            img.style.borderBottom = '1px solid #eee';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'library-info';
            
            const titleH3 = document.createElement('h3');
            titleH3.className = 'library-title';
            titleH3.textContent = data.title || 'Product'; // Use textContent to prevent XSS
            
            const priceP = document.createElement('p');
            priceP.style.fontSize = '1.3rem';
            priceP.style.fontWeight = '700';
            priceP.style.color = 'var(--berry-magenta)';
            priceP.style.marginTop = '0.5rem';
            priceP.textContent = `₹${data.price || 'N/A'}`;
            
            const buyBtn = document.createElement('button');
            buyBtn.className = 'cta-button secondary-cta full-width';
            buyBtn.style.marginTop = '1rem';
            buyBtn.textContent = 'Buy Now';
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(whatsappUrl, '_blank');
            });
            
            infoDiv.appendChild(titleH3);
            infoDiv.appendChild(priceP);
            infoDiv.appendChild(buyBtn);
            
            card.appendChild(img);
            card.appendChild(infoDiv);
            
            // Navigate to product details on card click
            card.addEventListener('click', () => {
                window.location.href = `/product/index.html?id=${encodeURIComponent(docId)}`;
            });
            
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading shop:", error);
        grid.innerHTML = '<p style="text-align: center; color: red;">Failed to load products.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadShop);