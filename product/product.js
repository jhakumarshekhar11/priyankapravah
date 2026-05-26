import { db, getDoc, doc } from '../firebaseconfig.js';

async function loadProductDetails() {
    const container = document.getElementById('product-details-container');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        container.innerHTML = '<p class="error-message">No product specified. Please go back to the shop and select a product.</p>';
        return;
    }

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            container.innerHTML = '<p class="error-message">Sorry, we could not find this product. It may have been removed.</p>';
            return;
        }

        const product = docSnap.data();
        renderProduct(product);

    } catch (error) {
        console.error("Error fetching product:", error);
        container.innerHTML = '<p class="error-message">There was an error loading the product details. Please try again later.</p>';
    }
}

function renderProduct(product) {
    const container = document.getElementById('product-details-container');

    // Use the first image as the main image by default
    const mainImage = product.images && product.images.length > 0 ? product.images[0] : 'placeholder.jpg';
    
    // Create thumbnails from all images
    let thumbnailHtml = '';
    if (product.images && product.images.length > 1) {
        product.images.forEach(imgUrl => {
            thumbnailHtml += `<img src="${imgUrl}" alt="Thumbnail" class="thumbnail-img">`;
        });
    }

    // Construct the WhatsApp message URL. Replace the phone number with your own.
    const whatsappMessage = encodeURIComponent(`Hello, I'm interested in buying the product: "${product.title}".`);
    const whatsappUrl = `https://wa.me/910000000000?text=${whatsappMessage}`; // <-- TODO: REPLACE PHONE NUMBER

    const productHtml = `
        <div class="product-grid">
            <div class="product-image-gallery">
                <div class="main-image-wrapper">
                    <img src="${mainImage}" alt="${product.title}" id="main-product-image">
                </div>
                <div class="thumbnail-strip">
                    ${thumbnailHtml}
                </div>
            </div>
            <div class="product-info">
                <h1 class="product-title">${product.title}</h1>
                <p class="product-price">₹${product.price}</p>
                <div class="product-description">
                    <p>${product.description.replace(/\n/g, '<br>')}</p>
                </div>
                <button onclick="window.open('${whatsappUrl}', '_blank');" class="cta-button secondary-cta full-width">Buy Now</button>
            </div>
        </div>
    `;

    container.innerHTML = productHtml;
    
    // Add interactivity to thumbnails
    const thumbnails = container.querySelectorAll('.thumbnail-img');
    const mainProductImage = document.getElementById('main-product-image');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // Remove active state from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            // Set the main image source to the clicked thumbnail's source
            mainProductImage.src = thumb.src;
            // Add active state to the clicked thumbnail
            thumb.classList.add('active');
        });
    });

    // Set the first thumbnail as active by default
    if (thumbnails.length > 0) {
        thumbnails[0].classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', loadProductDetails);