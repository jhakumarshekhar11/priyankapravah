// reading-corner.js
import { db, collection, getDocs, query, orderBy } from './firebaseconfig.js';

// Setup PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let currentBook = null; // Holds the StPageFlip instance

document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    setupModalControls();
});

// --- 1. FETCH & RENDER LIBRARY ---
async function loadLibrary() {
    const grid = document.getElementById('library-grid');
    
    try {
        const q = query(collection(db, "publications"), orderBy("uploadedAt", "desc"));
        const querySnapshot = await getDocs(q);

        grid.innerHTML = ''; // Clear loading text

        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No publications available yet. Check back soon!</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Format text
            const typeText = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : "Publication";
            const dateText = data.publishDate || "Unknown Date";
            // Use cover image if it exists, otherwise use a default gradient based on type
            const defaultBg = data.type === 'magazine' ? 'linear-gradient(135deg, var(--elegant-gold), var(--royal-purple))' : 'linear-gradient(135deg, var(--royal-purple), var(--soft-amethyst))';
            const coverStyle = data.coverImageUrl ? `background: url('${data.coverImageUrl}') center/contain no-repeat; background-color: #f4f0f5;` : `background: ${defaultBg};`;

            // Build HTML
            const cardHtml = `
                <article class="library-card reveal delay-1 active">
                    <div class="library-cover" style="${coverStyle}"></div>
                    <div class="library-info">
                        <h3 class="library-title">${data.title}</h3>
                        <p class="library-date">Published: ${dateText}</p>
                        <p class="library-type">${typeText}</p>
                        <button class="cta-button outline-cta full-width read-btn" data-pdf="${data.documentUrl}">Read Online</button>
                    </div>
                </article>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        });

        // Attach event listeners to all new "Read Online" buttons
        document.querySelectorAll('.read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pdfUrl = e.target.getAttribute('data-pdf');
                openBookViewer(pdfUrl);
            });
        });

    } catch (error) {
        console.error("Error loading library:", error);
        grid.innerHTML = '<p style="text-align: center; color: red; grid-column: 1/-1;">Error loading the library.</p>';
    }
}

// --- 2. THE 3D BOOK VIEWER LOGIC ---
async function openBookViewer(pdfUrl) {
    const modal = document.getElementById('book-modal');
    const loadingScreen = document.getElementById('book-loading');
    const flipbookContainer = document.getElementById('flipbook');
    const controls = document.getElementById('book-controls');

    // Show Modal & Loading State
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    flipbookContainer.innerHTML = ''; // Clear previous book
    controls.style.display = 'none';
    loadingScreen.style.display = 'block';

    try {
        // Step A: Load PDF via PDF.js
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        const pagesHTML = [];

        // Step B: Loop through PDF and convert each page to an HTML Canvas
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            // Scale dictates the crispness. 1.5 to 2.0 is usually good for reading.
            const viewport = page.getViewport({ scale: 1.5 }); 
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // Wrap canvas in a div required by StPageFlip
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.appendChild(canvas);
            
            flipbookContainer.appendChild(pageDiv);
        }

        // Step C: Initialize StPageFlip on the populated container
        loadingScreen.style.display = 'none';
        controls.style.display = 'flex';

        currentBook = new St.PageFlip(flipbookContainer, {
            width: 400, // Base width (it scales automatically)
            height: 600, // Base height
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            showCover: true, // Makes page 1 act as a single cover
            maxShadowOpacity: 0.5, // Realistic spine shadow
            showPageCorners: true,
            disableFlipByClick: false // Allows clicking to turn page
        });

        currentBook.loadFromHTML(document.querySelectorAll('.page'));

        // Update page counter when pages turn
        currentBook.on('flip', (e) => {
            document.getElementById('page-counter').innerText = `Page ${e.data + 1} of ${totalPages}`;
        });

    } catch (error) {
        console.error("Error generating book:", error);
        loadingScreen.innerHTML = '<p style="color: red;">Failed to load the document. It might be corrupted or blocking access.</p>';
    }
}

// --- 3. MODAL CONTROLS (Close, Next, Prev) ---
function setupModalControls() {
    const modal = document.getElementById('book-modal');
    
    // Close Button
    document.getElementById('close-book').addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore background scroll
        if (currentBook) {
            currentBook.destroy(); // Free up memory
            currentBook = null;
        }
    });

    // Next Page
    document.getElementById('next-page').addEventListener('click', () => {
        if (currentBook) currentBook.flipNext();
    });

    // Previous Page
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentBook) currentBook.flipPrev();
    });
}