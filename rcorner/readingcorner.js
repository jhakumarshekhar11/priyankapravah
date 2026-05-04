// readingcorner.js
import { db, collection, getDocs, query, orderBy } from '../firebaseconfig.js';

// Setup PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let currentBook = null; 

// --- SETUP AUDIO FEEDBACK ---
const flipSound = new Audio('pgflip.mp3'); 
flipSound.volume = 0.4; 

document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    setupModalControls();
});

// --- 1. FETCH & RENDER LIBRARY ---
async function loadLibrary() {
    const grid = document.getElementById('library-grid');
    
    grid.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;

    try {
        const q = query(collection(db, "publications"), orderBy("uploadedAt", "desc"));
        const querySnapshot = await getDocs(q);

        grid.innerHTML = ''; 

        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No publications available yet. Check back soon!</p>';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const sharedBookId = urlParams.get('book');
        let sharedPdfUrl = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id; 
            
            if (sharedBookId && docId === sharedBookId) {
                sharedPdfUrl = data.documentUrl;
            }
            
            const typeText = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : "Publication";
            const dateText = data.publishDate || "Unknown Date";
            const defaultBg = data.type === 'magazine' ? 'linear-gradient(135deg, var(--elegant-gold), var(--royal-purple))' : 'linear-gradient(135deg, var(--royal-purple), var(--soft-amethyst))';
            
            const coverStyle = data.coverImageUrl ? `background: url('${data.coverImageUrl}') center/contain no-repeat; background-color: #f4f0f5;` : `background: ${defaultBg};`;

            const cardHtml = `
                <article class="library-card reveal delay-1 active">
                    <div class="library-cover" style="${coverStyle}"></div>
                    <div class="library-info">
                        <h3 class="library-title">${data.title}</h3>
                        <p class="library-date">Published: ${dateText}</p>
                        <p class="library-type">${typeText}</p>
                        
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="cta-button outline-cta full-width read-btn" style="flex: 1;" data-pdf="${data.documentUrl}">Read Online</button>
                            <button class="cta-button outline-cta share-btn" style="padding: 0.5rem 1rem;" data-id="${docId}" title="Share this book">🔗</button>
                        </div>
                    </div>
                </article>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        });

        document.querySelectorAll('.read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pdfUrl = e.target.getAttribute('data-pdf');
                openBookViewer(pdfUrl);
            });
        });

        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bookId = e.currentTarget.getAttribute('data-id');
                const shareUrl = `${window.location.origin}${window.location.pathname}?book=${bookId}`;
                
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'Priyanka Pravah',
                            text: 'Read this publication on Priyanka Pravah!',
                            url: shareUrl
                        });
                    } catch (err) {
                        console.log("User cancelled share");
                    }
                } else {
                    navigator.clipboard.writeText(shareUrl);
                    const originalText = e.currentTarget.innerText;
                    e.currentTarget.innerText = "✓ Copied";
                    setTimeout(() => e.currentTarget.innerText = originalText, 2000);
                }
            });
        });

        if (sharedPdfUrl) {
            setTimeout(() => {
                openBookViewer(sharedPdfUrl);
            }, 500); 
        }

    } catch (error) {
        console.error("Error loading library:", error);
        grid.innerHTML = '<p style="text-align: center; color: red; grid-column: 1/-1;">Error loading the library.</p>';
    }
}

// --- 2. THE 3D BOOK VIEWER LOGIC (WITH LAZY LOADING) ---
async function openBookViewer(pdfUrl) {
    const modal = document.getElementById('book-modal');
    const loadingScreen = document.getElementById('book-loading');
    const controls = document.getElementById('book-controls');
    
    const flipbookWrapper = document.querySelector('.flipbook-container');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
    
    flipbookWrapper.innerHTML = '<div id="flipbook"></div>';
    const flipbookContainer = document.getElementById('flipbook'); 

    controls.style.display = 'none';
    loadingScreen.style.display = 'block';

    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        // Track which pages have already been rendered to save memory
        const renderedPages = new Set();

        // Load JUST Page 1 to establish the exact dimensions of the book
        const page1 = await pdf.getPage(1);
        const viewport1 = page1.getViewport({ scale: 1.5 });
        const baseWidth = viewport1.width;
        const baseHeight = viewport1.height;

        // Step 1: Instantly build the physical structure of the book (Empty Pages)
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.style.backgroundColor = '#fcfcfc'; // Keeps the 3D paper illusion intact!

            // Add the loading text
            const loader = document.createElement('div');
            loader.className = 'lazy-loader';
            loader.innerText = 'Loading...';

            // Add the empty canvas
            const canvas = document.createElement('canvas');
            canvas.className = `canvas-page-${pageNum}`;
            canvas.height = baseHeight;
            canvas.width = baseWidth;

            pageDiv.appendChild(loader);
            pageDiv.appendChild(canvas);
            flipbookContainer.appendChild(pageDiv);
        }

        // Add a blank page to the very end if the PDF has an odd number of pages
        if (totalPages % 2 !== 0) {
            const blankPage = document.createElement('div');
            blankPage.className = 'page';
            blankPage.style.backgroundColor = '#fcfcfc';
            flipbookContainer.appendChild(blankPage);
        }

        // Step 2: Initialize StPageFlip immediately (Fraction of a second!)
        loadingScreen.style.display = 'none';
        controls.style.display = 'flex';

        currentBook = new St.PageFlip(flipbookContainer, {
            width: 400, 
            height: 600, 
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            showCover: true, 
            maxShadowOpacity: 0.5, 
            showPageCorners: true,
            disableFlipByClick: false 
        });

        currentBook.loadFromHTML(flipbookContainer.querySelectorAll('.page'));

        // =========================================
        // 🚀 THE LAZY LOADER ENGINE
        // =========================================
        async function renderLazyPages(currentIndex) {
            // Calculate safety buffer: Load previous 2 pages, and next 4 pages
            const startPage = Math.max(1, currentIndex - 1); 
            const endPage = Math.min(totalPages, currentIndex + 4); 

            for (let i = startPage; i <= endPage; i++) {
                if (renderedPages.has(i)) continue; // Skip if already painted
                renderedPages.add(i); // Mark as rendering

                try {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = flipbookContainer.querySelector(`.canvas-page-${i}`);
                    if (!canvas) continue;

                    const ctx = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Paint the actual PDF onto the blank canvas
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    
                    // Hide the "Loading..." text once painted
                    const loader = canvas.parentElement.querySelector('.lazy-loader');
                    if (loader) loader.style.display = 'none';

                } catch(err) {
                    console.error(`Failed to load page ${i}`, err);
                    renderedPages.delete(i); // Allow the engine to retry if it fails
                }
            }
        }

        // Fire the lazy loader immediately to paint the Cover and first few pages
        renderLazyPages(0);

        // --- PLAY AUDIO & TRIGGER LAZY LOADER ON FLIP ---
        currentBook.on('flip', (e) => {
            document.getElementById('page-counter').innerText = `Page ${e.data + 1} of ${totalPages}`;
            
            flipSound.currentTime = 0; 
            flipSound.play().catch(err => console.log("Audio play blocked", err));

            // Tell the engine to paint the upcoming pages!
            renderLazyPages(e.data); 
        });

    } catch (error) {
        console.error("Error generating book:", error);
        loadingScreen.innerHTML = '<p style="color: #ff4d4d;">Failed to load the document. It might be corrupted or blocking access.</p>';
    }
}

// --- 3. MODAL CONTROLS (Close, Next, Prev) ---
function setupModalControls() {
    const modal = document.getElementById('book-modal');
    const flipbookWrapper = document.querySelector('.flipbook-container');
    
    document.getElementById('close-book').addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; 
        
        if (currentBook) {
            currentBook.destroy(); 
            currentBook = null;
        }

        flipbookWrapper.innerHTML = '';
        
        document.getElementById('book-loading').innerHTML = `
            <div class="spinner"></div>
            <p>Binding pages... please wait.</p>
        `;
        document.getElementById('page-counter').innerText = `Page 1`;
        
        const url = new URL(window.location);
        url.searchParams.delete('book');
        window.history.replaceState({}, '', url);
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (currentBook) currentBook.flipNext();
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentBook) currentBook.flipPrev();
    });
}