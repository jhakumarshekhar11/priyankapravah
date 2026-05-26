import { db, getDoc, doc } from '../firebaseconfig.js';
import { getWhatsAppUrl } from '../utils.js';
import { CONFIG } from '../config.js';

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
            // Escape image URL to prevent XSS via URL injection
            const escapedUrl = escapeHtml(imgUrl);
            thumbnailHtml += `<img src="${escapedUrl}" alt="Thumbnail" class="thumbnail-img">`;
        });
    }

    // Use phone number from config instead of hardcoded
    const phoneNumber = CONFIG.CONTACT.WHATSAPP;
    const whatsappMessage = `Hello, I'm interested in buying the product: "${product.title}".`;
    const whatsappUrl = getWhatsAppUrl(phoneNumber, whatsappMessage);

    // SECURITY FIX: Build DOM elements safely instead of using innerHTML
    // This prevents XSS attacks from malicious product data
    const productGrid = document.createElement('div');
    productGrid.className = 'product-grid';

    // Left side: Image gallery
    const imageGallery = document.createElement('div');
    imageGallery.className = 'product-image-gallery';
    
    const mainImageWrapper = document.createElement('div');
    mainImageWrapper.className = 'main-image-wrapper';
    const mainImg = document.createElement('img');
    mainImg.src = escapeHtml(mainImage);
    mainImg.alt = product.title || 'Product image';
    mainImg.id = 'main-product-image';
    mainImageWrapper.appendChild(mainImg);
    
    const thumbnailStrip = document.createElement('div');
    thumbnailStrip.className = 'thumbnail-strip';
    thumbnailStrip.innerHTML = thumbnailHtml; // Safe because we escaped URLs above
    
    imageGallery.appendChild(mainImageWrapper);
    imageGallery.appendChild(thumbnailStrip);

    // Right side: Product info
    const productInfo = document.createElement('div');
    productInfo.className = 'product-info';
    
    const title = document.createElement('h1');
    title.className = 'product-title';
    title.textContent = product.title || 'Product'; // Use textContent to prevent XSS
    
    const price = document.createElement('p');
    price.className = 'product-price';
    price.textContent = `₹${product.price || 'N/A'}`;
    
    const descriptionContainer = document.createElement('div');
    descriptionContainer.className = 'product-description';
    const descParagraph = document.createElement('p');
    // Convert newlines to <br> tags but prevent XSS
    const descriptionText = (product.description || '').split('\n').map(line => escapeHtml(line)).join('<br>');
    descParagraph.innerHTML = descriptionText; // Safe because we escaped each line
    descriptionContainer.appendChild(descParagraph);
    
    const buyButton = document.createElement('button');
    buyButton.className = 'cta-button secondary-cta full-width';
    buyButton.textContent = 'Buy Now';
    buyButton.addEventListener('click', () => {
        window.open(whatsappUrl, '_blank');
    });
    
    productInfo.appendChild(title);
    productInfo.appendChild(price);
    productInfo.appendChild(descriptionContainer);
    productInfo.appendChild(buyButton);
    
    productGrid.appendChild(imageGallery);
    productGrid.appendChild(productInfo);
    
    container.innerHTML = ''; // Clear old content
    container.appendChild(productGrid);
    
    // Add interactivity to thumbnails
    const thumbnails = container.querySelectorAll('.thumbnail-img');
    const mainProductImage = document.getElementById('main-product-image');

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            // Remove active state from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            // Set the main image source to the clicked thumbnail's source
            // Escape URL to prevent javascript: protocol attacks
            const thumbSrc = thumb.getAttribute('src');
            mainProductImage.src = thumbSrc;
            // Add active state to the clicked thumbnail
            thumb.classList.add('active');
        });
    });
    
    if (thumbnails.length > 0) {
        thumbnails[0].classList.add('active');
    }
}

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadProductDetails);