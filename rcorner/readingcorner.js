import { db, auth, collection, getDocs, query, orderBy, addDoc, serverTimestamp, onSnapshot } from '../firebaseconfig.js';

// Setup PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let currentBook = null; 
let currentCommentBookId = null; // Moved to global scope
let commentsUnsubscribe = null;  // Moved to global scope
let currentlyOpenBookId = null;

// --- SETUP AUDIO FEEDBACK ---
const flipSound = new Audio('pgflip.mp3'); 
flipSound.volume = 0.4; 

// --- MASTER INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    setupModalControls();
    setupCommentControls(); // Initialize comment buttons here!
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
                            <button class="cta-button outline-cta full-width read-btn ripple-parent" style="flex: 1;" data-pdf="${data.documentUrl}" data-id="${docId}">Read</button>
                            <button class="cta-button outline-cta comment-btn ripple-parent" style="padding: 0.5rem 1rem;" data-id="${docId}" title="Comments">💬</button>
                            <button class="cta-button outline-cta share-btn ripple-parent" style="padding: 0.5rem 1rem;" data-id="${docId}" title="Share this book">🔗</button>
                        </div>
                    </div>
                </article>
            `;
            grid.insertAdjacentHTML('beforeend', cardHtml);
        });

        document.querySelectorAll('.read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // currentTarget guarantees we grab the button, not the ripple effect
                const targetBtn = e.currentTarget; 
                const pdfUrl = targetBtn.getAttribute('data-pdf');
                const bookId = targetBtn.getAttribute('data-id'); 
                
                openBookViewer(pdfUrl, bookId); 
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
                openBookViewer(sharedPdfUrl, sharedBookId);
            }, 500); 
        }

    } catch (error) {
        console.error("Error loading library:", error);
        grid.innerHTML = '<p style="text-align: center; color: red; grid-column: 1/-1;">Error loading the library.</p>';
    }
}

// --- 2. THE 3D BOOK VIEWER LOGIC (WITH LAZY LOADING) ---
async function openBookViewer(pdfUrl, bookId) {
    currentlyOpenBookId = bookId;
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

        const renderedPages = new Set();
        const page1 = await pdf.getPage(1);
        const viewport1 = page1.getViewport({ scale: 1.5 });
        const baseWidth = viewport1.width;
        const baseHeight = viewport1.height;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.style.backgroundColor = '#fcfcfc'; 

            const loader = document.createElement('div');
            loader.className = 'lazy-loader';
            loader.innerText = 'Loading...';

            const canvas = document.createElement('canvas');
            canvas.className = `canvas-page-${pageNum}`;
            canvas.height = baseHeight;
            canvas.width = baseWidth;

            pageDiv.appendChild(loader);
            pageDiv.appendChild(canvas);
            flipbookContainer.appendChild(pageDiv);
        }

        if (totalPages % 2 !== 0) {
            const blankPage = document.createElement('div');
            blankPage.className = 'page';
            blankPage.style.backgroundColor = '#fcfcfc';
            flipbookContainer.appendChild(blankPage);
        }

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

        async function renderLazyPages(currentIndex) {
            const startPage = Math.max(1, currentIndex - 1); 
            const endPage = Math.min(totalPages, currentIndex + 4); 

            for (let i = startPage; i <= endPage; i++) {
                if (renderedPages.has(i)) continue; 
                renderedPages.add(i); 

                try {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = flipbookContainer.querySelector(`.canvas-page-${i}`);
                    if (!canvas) continue;

                    const ctx = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                    
                    const loader = canvas.parentElement.querySelector('.lazy-loader');
                    if (loader) loader.style.display = 'none';

                } catch(err) {
                    console.error(`Failed to load page ${i}`, err);
                    renderedPages.delete(i); 
                }
            }
        }

        renderLazyPages(0);

        currentBook.on('flip', (e) => {
            document.getElementById('page-counter').innerText = `Page ${e.data + 1} of ${totalPages}`;
            flipSound.currentTime = 0; 
            flipSound.play().catch(err => console.log("Audio play blocked", err));
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
    // --- UPDATED: IN-BOOK COMMENT LISTENER ---
    document.getElementById('in-book-comment-btn').addEventListener('click', () => {
        
        // Grab the ID from our memory instead of the URL
        if (currentlyOpenBookId) {
            currentCommentBookId = currentlyOpenBookId;
            openCommentsModal(currentlyOpenBookId);
        } else {
            console.error("No book ID found to comment on!");
        }
    });
} // <-- THIS CLOSING BRACKET WAS THE CULPRIT BEFORE! It is now properly closing the book controls.

// =========================================
// 🚀 COMMENTS SYSTEM 
// =========================================
function setupCommentControls() {
    // Attach listener to open comments (Event Delegation allows it to work on newly loaded cards)
    document.getElementById('library-grid').addEventListener('click', (e) => {
        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) {
            currentCommentBookId = commentBtn.getAttribute('data-id');
            openCommentsModal(currentCommentBookId);
        }
    });

    // Close Comments Modal
    document.getElementById('close-comments').addEventListener('click', () => {
        document.getElementById('comments-modal').classList.remove('active');
        if (commentsUnsubscribe) {
            commentsUnsubscribe(); // Stop downloading comments to save bandwidth when closed
        }
    });

    // Submit Comment
    document.getElementById('submit-comment').addEventListener('click', async () => {
        const textInput = document.getElementById('comment-text');
        const text = textInput.value.trim();
        
        if (!text || !currentCommentBookId) return;

        // Check if user is logged in
        let authorName = "Unknown";
        if (auth && auth.currentUser) {
            authorName = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
        }

        const submitBtn = document.getElementById('submit-comment');
        submitBtn.innerText = '...';
        submitBtn.disabled = true;

        try {
            // Save inside a subcollection: publications -> [bookId] -> comments
            await addDoc(collection(db, `publications/${currentCommentBookId}/comments`), {
                text: text,
                author: authorName,
                timestamp: serverTimestamp()
            });
            textInput.value = ''; // Clear the box
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("Failed to post comment. Check your connection.");
        } finally {
            submitBtn.innerText = 'Post';
            submitBtn.disabled = false;
        }
    });
}

// Fetch and display comments in real-time
function openCommentsModal(bookId) {
    const modal = document.getElementById('comments-modal');
    const list = document.getElementById('comments-list');
    
    modal.classList.add('active');
    list.innerHTML = '<p style="text-align:center; color:#888;">Loading people\'s thoughts...</p>';

    // Reference the specific book's comment subcollection
    const commentsRef = collection(db, `publications/${bookId}/comments`);
    const q = query(commentsRef, orderBy('timestamp', 'asc')); // Oldest at the top, newest at the bottom

    // onSnapshot listens for real-time changes instantly!
    commentsUnsubscribe = onSnapshot(q, (snapshot) => {
        list.innerHTML = ''; // Clear loading text
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; color:#888; margin-top:2rem;">Be the first to share your experience!</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Format the timestamp nicely
            let timeString = "Just now";
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                const date = data.timestamp.toDate();
                timeString = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            // SECURITY FIX: Use textContent instead of innerHTML to prevent XSS
            // This prevents malicious scripts in user comments from executing
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            
            const authorDiv = document.createElement('div');
            authorDiv.className = 'comment-author';
            authorDiv.textContent = data.author || 'Anonymous';
            
            const dateSpan = document.createElement('span');
            dateSpan.className = 'comment-date';
            dateSpan.textContent = timeString;
            
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'comment-body';
            bodyDiv.textContent = data.text || ''; // Use textContent to prevent XSS
            
            commentDiv.appendChild(authorDiv);
            commentDiv.appendChild(dateSpan);
            commentDiv.appendChild(bodyDiv);
            
            list.appendChild(commentDiv);
        });

        // Auto-scroll to the very bottom to see the newest comment
        list.scrollTop = list.scrollHeight;
    });
}