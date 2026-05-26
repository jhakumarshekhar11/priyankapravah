import { db, collection, getDocs, query, orderBy } from '../firebaseconfig.js';

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

            // Construct the WhatsApp message URL. Replace the phone number with your own.
            const whatsappMessage = encodeURIComponent(`Hello, I'm interested in buying the product: "${data.title}".`);
            const whatsappUrl = `https://wa.me/910000000000?text=${whatsappMessage}`; // <-- TODO: REPLACE PHONE NUMBER

            const cardHtml = `
                <article class="library-card reveal delay-1 active" style="cursor: pointer;" onclick="window.location.href='/product/index.html?id=${docId}'">
                    <img src="${coverImage}" alt="${data.title}" style="width: 100%; height: 350px; object-fit: cover; border-bottom: 1px solid #eee;">
                    <div class="library-info">
                        <h3 class="library-title">${data.title}</h3>
                        <p style="font-size: 1.3rem; font-weight: 700; color: var(--berry-magenta); margin-top: 0.5rem;">₹${data.price}</p>
                        <button onclick="event.stopPropagation(); window.open('${whatsappUrl}', '_blank');" class="cta-button secondary-cta full-width" style="margin-top: 1rem;">Buy Now</button>
                    </div>
                </article>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        });
    } catch (error) {
        console.error("Error loading shop:", error);
        grid.innerHTML = '<p style="text-align: center; color: red;">Failed to load products.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadShop);