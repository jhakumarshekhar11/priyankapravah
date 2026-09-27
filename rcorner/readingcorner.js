import { db, auth, collection, getDocs, query, orderBy, limit, startAfter, doc, getDoc, addDoc, serverTimestamp, onSnapshot } from '../firebaseconfig.js';

// Setup PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let currentBook = null; 
let currentCommentBookId = null; // Moved to global scope
let commentsUnsubscribe = null;  // Moved to global scope
let currentlyOpenBookId = null;
const publicationsCache = {}; // docId -> publication data, used by the text-poem reader

// --- PAGINATION STATE (for scroll-loading the library) ---
const PAGE_SIZE = 9;
let lastVisibleDoc = null;   // Firestore doc snapshot cursor for startAfter()
let isFetchingPage = false;  // guards against duplicate/overlapping fetches
let allBooksLoaded = false;  // true once a page comes back smaller than PAGE_SIZE
let scrollObserver = null;

// --- SETUP AUDIO FEEDBACK ---
const flipSound = new Audio('pgflip.mp3'); 
flipSound.volume = 0.4; 

// --- MASTER INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    setupLibraryGridDelegation();
    loadLibrary();
    setupModalControls();
    setupTextReaderControls();
    setupCommentControls(); // Initialize comment buttons here!
});

// --- 1. FETCH & RENDER LIBRARY (now with scroll-based pagination) ---
async function loadLibrary() {
    const grid = document.getElementById('library-grid');

    // Reset pagination state in case loadLibrary() is ever called again
    lastVisibleDoc = null;
    allBooksLoaded = false;

    grid.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;

    // Handle a deep link (?book=xyz) by fetching that specific document directly.
    // This has to be independent of pagination — the shared book might be far
    // older than whatever the first scroll page happens to contain.
    const urlParams = new URLSearchParams(window.location.search);
    const sharedBookId = urlParams.get('book');
    if (sharedBookId) {
        openSharedBookById(sharedBookId);
    }

    try {
        const firstBatch = await fetchPublicationsPage();

        grid.innerHTML = '';

        if (firstBatch.empty) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No publications available yet. Check back soon!</p>';
            return;
        }

        renderBooks(firstBatch.docs);
        setupScrollObserver(grid);

    } catch (error) {
        console.error("Error loading library:", error);
        grid.innerHTML = '<p style="text-align: center; color: red; grid-column: 1/-1;">Error loading the library.</p>';
    }
}

// Fetches one page of publications, starting after lastVisibleDoc if set.
async function fetchPublicationsPage() {
    const q = lastVisibleDoc
        ? query(collection(db, "publications"), orderBy("uploadedAt", "desc"), startAfter(lastVisibleDoc), limit(PAGE_SIZE))
        : query(collection(db, "publications"), orderBy("uploadedAt", "desc"), limit(PAGE_SIZE));

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
    }
    if (snapshot.size < PAGE_SIZE) {
        allBooksLoaded = true;
    }

    return snapshot;
}

// Renders a batch of publication docs into the grid (used for both the
// initial load and every subsequent scroll-triggered page).
function renderBooks(docSnaps) {
    const grid = document.getElementById('library-grid');

    docSnaps.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        publicationsCache[docId] = data;
        const isTextPoem = data.contentFormat === 'text';

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
                    <p class="library-type">${typeText}${isTextPoem ? ' • ✍️ Written' : ''}</p>

                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button class="cta-button outline-cta full-width read-btn ripple-parent" style="flex: 1;" data-format="${isTextPoem ? 'text' : 'file'}" data-pdf="${data.documentUrl || ''}" data-id="${docId}">Read</button>
                        <button class="cta-button outline-cta comment-btn ripple-parent" style="padding: 0.5rem 1rem;" data-id="${docId}" title="Comments">💬</button>
                        <button class="cta-button outline-cta share-btn ripple-parent" style="padding: 0.5rem 1rem;" data-id="${docId}" title="Share this book">🔗</button>
                    </div>
                </div>
            </article>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// Sets up (or re-verifies) the sentinel element + IntersectionObserver that
// triggers loading the next page as the user scrolls near the bottom of the grid.
function setupScrollObserver(grid) {
    let sentinel = document.getElementById('library-scroll-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'library-scroll-sentinel';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.textAlign = 'center';
        sentinel.style.padding = '1.5rem 0';
        sentinel.style.minHeight = '1px';
        grid.insertAdjacentElement('afterend', sentinel);
    }

    if (scrollObserver) {
        scrollObserver.disconnect();
    }

    if (allBooksLoaded) {
        sentinel.innerHTML = '';
        return;
    }

    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
                await loadNextPage(sentinel);
            }
        });
    }, { rootMargin: '400px' }); // start loading a bit before it's actually on-screen

    scrollObserver.observe(sentinel);
}

// Fetches and renders the next page, called when the sentinel scrolls into view.
async function loadNextPage(sentinel) {
    if (isFetchingPage || allBooksLoaded) return;
    isFetchingPage = true;
    sentinel.innerHTML = '<div class="skeleton-card" style="height: 120px; margin: 0 auto; max-width: 300px;"></div>';

    try {
        const nextBatch = await fetchPublicationsPage();
        if (!nextBatch.empty) {
            renderBooks(nextBatch.docs);
        }
    } catch (error) {
        console.error("Error loading more publications:", error);
        sentinel.innerHTML = '<p style="color: red;">Failed to load more publications.</p>';
        isFetchingPage = false;
        return;
    }

    isFetchingPage = false;

    if (allBooksLoaded) {
        if (scrollObserver) scrollObserver.disconnect();
        sentinel.innerHTML = '';
    } else {
        sentinel.innerHTML = '';
    }
}

// Fetches one specific publication directly by ID (for ?book= deep links),
// independent of whatever page of the library has been scrolled into view.
async function openSharedBookById(bookId) {
    try {
        const docSnap = await getDoc(doc(db, "publications", bookId));
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        publicationsCache[bookId] = data;
        const isTextPoem = data.contentFormat === 'text';

        setTimeout(() => {
            if (isTextPoem) {
                openTextReader(data.poemText, data.title, bookId);
            } else {
                openBookViewer(data.documentUrl, bookId);
            }
        }, 500);
    } catch (error) {
        console.error("Error opening shared book:", error);
    }
}

// Event delegation for Read/Share buttons — attached once, works for every
// card rendered now or later via scroll pagination, no re-binding needed.
function setupLibraryGridDelegation() {
    const grid = document.getElementById('library-grid');

    grid.addEventListener('click', (e) => {
        const readBtn = e.target.closest('.read-btn');
        if (readBtn) {
            const bookId = readBtn.getAttribute('data-id');
            const format = readBtn.getAttribute('data-format');

            if (format === 'text') {
                const data = publicationsCache[bookId];
                openTextReader(data ? data.poemText : '', data ? data.title : 'Poem', bookId);
            } else {
                const pdfUrl = readBtn.getAttribute('data-pdf');
                openBookViewer(pdfUrl, bookId);
            }
            return;
        }

        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            handleShareClick(shareBtn, shareBtn.getAttribute('data-id'));
        }
    });
}

async function handleShareClick(btnEl, bookId) {
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
        const originalText = btnEl.innerText;
        btnEl.innerText = "✓ Copied";
        setTimeout(() => btnEl.innerText = originalText, 2000);
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

// --- 2b. PLAIN TEXT POEM READER (for poems written directly, no PDF) ---
function openTextReader(text, title, bookId) {
    currentlyOpenBookId = bookId;
    const modal = document.getElementById('text-reader-modal');
    const titleEl = document.getElementById('text-reader-title');
    const bodyEl = document.getElementById('text-reader-body');

    titleEl.innerText = title || 'Poem';
    // Using innerText (not innerHTML) keeps it as plain, safe text while
    // CSS white-space: pre-wrap preserves the poem's line breaks.
    bodyEl.innerText = text || '';
    bodyEl.scrollTop = 0;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const url = new URL(window.location);
    url.searchParams.set('book', bookId);
    window.history.replaceState({}, '', url);
}

function setupTextReaderControls() {
    const modal = document.getElementById('text-reader-modal');

    document.getElementById('close-text-reader').addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';

        const url = new URL(window.location);
        url.searchParams.delete('book');
        window.history.replaceState({}, '', url);
    });

    document.getElementById('text-reader-comment-btn').addEventListener('click', () => {
        if (currentlyOpenBookId) {
            currentCommentBookId = currentlyOpenBookId;
            openCommentsModal(currentlyOpenBookId);
        }
    });

    document.getElementById('text-reader-share-btn').addEventListener('click', async () => {
        if (!currentlyOpenBookId) return;
        const shareUrl = `${window.location.origin}${window.location.pathname}?book=${currentlyOpenBookId}`;
        const btn = document.getElementById('text-reader-share-btn');

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Priyanka Pravah',
                    text: 'Read this poem on Priyanka Pravah!',
                    url: shareUrl
                });
            } catch (err) {
                console.log("User cancelled share");
            }
        } else {
            navigator.clipboard.writeText(shareUrl);
            const originalText = btn.innerText;
            btn.innerText = "✓ Copied";
            setTimeout(() => btn.innerText = originalText, 2000);
        }
    });
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
            if (data.timestamp) {
                const date = data.timestamp.toDate();
                timeString = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            const commentHtml = `
                <div class="comment-item">
                    <div class="comment-author">${data.author}</div>
                    <span class="comment-date">${timeString}</span>
                    <div class="comment-body">${data.text}</div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', commentHtml);
        });

        // Auto-scroll to the very bottom to see the newest comment
        list.scrollTop = list.scrollHeight;
    });
}
