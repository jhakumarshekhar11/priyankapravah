// index-dynamic.js
import { db, collection, getDocs, query, orderBy, limit } from './firebaseconfig.js';

document.addEventListener('DOMContentLoaded', () => {
    loadHomePageData();
});

async function loadHomePageData() {
    const marqueeContainer = document.getElementById('dynamic-marquee');
    const latestReleaseContainer = document.getElementById('latest-release-container');

    // 1. INJECT SKELETONS INSTANTLY
    // The browser paints these gray boxes immediately while waiting for Firebase.
    if (marqueeContainer) {
        marqueeContainer.innerHTML = `
            <div class="pub-card skeleton-card" style="height: 300px; margin: 0 1rem;"></div>
            <div class="pub-card skeleton-card" style="height: 300px; margin: 0 1rem;"></div>
            <div class="pub-card skeleton-card" style="height: 300px; margin: 0 1rem;"></div>
            <div class="pub-card skeleton-card" style="height: 300px; margin: 0 1rem;"></div>
        `;
    }
    
    if (latestReleaseContainer) {
        latestReleaseContainer.innerHTML = `
            <h2 class="section-heading left-align">Latest Release</h2>
            <div class="skeleton-card" style="max-width: 100%; height: 400px;"></div>
        `;
    }

    try {
        // 2. FETCH DATA
        // Fetch only the 10 most recent publications
        const q = query(collection(db, "publications"), orderBy("uploadedAt", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        // 3. HANDLE EMPTY STATE
        // Overwrite the skeletons with "Coming soon" text if the database is empty
        if (querySnapshot.empty) {
            if (marqueeContainer) {
                marqueeContainer.innerHTML = '<p style="text-align:center; width:100%;">No publications available yet.</p>';
            }
            if (latestReleaseContainer) {
                latestReleaseContainer.innerHTML = `
                    <h2 class="section-heading left-align">Latest Release</h2>
                    <p>Coming soon!</p>
                `;
            }
            return;
        }

        // 4. RENDER REAL DATA
        const publications = [];
        querySnapshot.forEach(doc => publications.push(doc.data()));

        // The very first item in the array is the newest one!
        // These functions will automatically overwrite the skeleton HTML with the real books.
        renderLatestRelease(publications[0]);
        renderMarquee(publications);

    } catch (error) {
        console.error("Error loading home page data:", error);
        if (marqueeContainer) {
            marqueeContainer.innerHTML = '<p style="text-align:center; width:100%; color: red;">Failed to load library.</p>';
        }
    }
}

function renderLatestRelease(latestPub) {
    const container = document.getElementById('latest-release-container');
    
    const dateText = latestPub.publishDate || "Recently Published";
    const descText = latestPub.description || "Dive into this beautiful collection of poetry in the Reading Corner.";
    
    // Using 'contain' here to fix the zoom issue on the homepage too!
    const bgStyle = latestPub.coverImageUrl 
        ? `background: url('${escapeHtml(latestPub.coverImageUrl)}') center/contain no-repeat; background-color: #f4f0f5;` 
        : `background: linear-gradient(45deg, var(--berry-magenta), var(--royal-purple));`;

    // SECURITY FIX: Build DOM elements safely to prevent XSS
    const heading = document.createElement('h2');
    heading.className = 'section-heading left-align';
    heading.textContent = 'Latest Release';
    
    const recentCard = document.createElement('div');
    recentCard.className = 'recent-card';
    
    const recentCover = document.createElement('div');
    recentCover.className = 'recent-cover';
    recentCover.style.cssText = bgStyle;
    
    const recentDetails = document.createElement('div');
    recentDetails.className = 'recent-details';
    
    const title = document.createElement('h3');
    title.textContent = latestPub.title || 'New Release'; // Use textContent to prevent XSS
    
    const pubDate = document.createElement('p');
    pubDate.className = 'pub-date';
    pubDate.textContent = `Published: ${escapeHtml(dateText)}`;
    
    const pubDesc = document.createElement('p');
    pubDesc.className = 'pub-desc';
    pubDesc.textContent = escapeHtml(descText); // Use textContent to prevent XSS
    
    const readLink = document.createElement('a');
    readLink.href = 'https://priyankapravah.live/rcorner/';
    readLink.className = 'cta-button outline-cta';
    readLink.textContent = 'Read Now';
    
    recentDetails.appendChild(title);
    recentDetails.appendChild(pubDate);
    recentDetails.appendChild(pubDesc);
    recentDetails.appendChild(readLink);
    
    recentCard.appendChild(recentCover);
    recentCard.appendChild(recentDetails);
    
    container.innerHTML = ''; // Clear skeletons
    container.appendChild(heading);
    container.appendChild(recentCard);
}

function renderMarquee(pubs) {
    const track = document.getElementById('dynamic-marquee');
    track.innerHTML = ''; 

    // MARQUEE MAGIC: If there are only 1 or 2 books, the marquee will look empty.
    // We duplicate the array until we have at least 6 items to fill the screen width.
    let displayPubs = [...pubs];
    while (displayPubs.length < 6 && displayPubs.length > 0) {
        displayPubs = displayPubs.concat(pubs); 
    }

    // SECURITY FIX: Build DOM elements safely to prevent XSS from titles
    displayPubs.forEach(pub => {
        // Using 'contain' here for the scrolling covers
        const bgStyle = pub.coverImageUrl 
            ? `background: url('${escapeHtml(pub.coverImageUrl)}') center/contain no-repeat; background-color: #f4f0f5;` 
            : `background: linear-gradient(135deg, var(--soft-amethyst), var(--royal-purple));`;

        const pubCard = document.createElement('div');
        pubCard.className = 'pub-card';
        
        const pubCover = document.createElement('div');
        pubCover.className = 'pub-cover';
        pubCover.style.cssText = bgStyle;
        
        const title = document.createElement('h3');
        title.textContent = pub.title || 'Publication'; // Use textContent to prevent XSS
        
        pubCard.appendChild(pubCover);
        pubCard.appendChild(title);
        
        track.appendChild(pubCard);
        
        // For infinite scroll, we need to duplicate the content
        // Since we're using DOM elements, we need to clone them
        const clonedCard = pubCard.cloneNode(true);
        track.appendChild(clonedCard);
    });

    // Dynamically adjust the track width based on how many items we injected
    const totalItems = displayPubs.length * 2;
    track.style.width = `calc(250px * ${totalItems})`;
    
    // Adjust animation speed so it doesn't go too fast if there are lots of books
    track.style.animationDuration = `${totalItems * 3}s`;
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