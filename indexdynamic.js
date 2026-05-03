// index-dynamic.js
import { db, collection, getDocs, query, orderBy, limit } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    loadHomePageData();
});

async function loadHomePageData() {
    try {
        // Fetch only the 10 most recent publications
        const q = query(collection(db, "publications"), orderBy("uploadedAt", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            document.getElementById('dynamic-marquee').innerHTML = '<p style="text-align:center; width:100%;">No publications available yet.</p>';
            document.getElementById('latest-release-container').innerHTML = `
                <h2 class="section-heading left-align">Latest Release</h2>
                <p>Coming soon!</p>
            `;
            return;
        }

        const publications = [];
        querySnapshot.forEach(doc => publications.push(doc.data()));

        // The very first item in the array is the newest one!
        renderLatestRelease(publications[0]);
        
        // Pass all fetched items to the marquee
        renderMarquee(publications);

    } catch (error) {
        console.error("Error loading home page data:", error);
    }
}

function renderLatestRelease(latestPub) {
    const container = document.getElementById('latest-release-container');
    
    const dateText = latestPub.publishDate || "Recently Published";
    const descText = latestPub.description || "Dive into this beautiful collection of poetry in the Reading Corner.";
    
    // Using 'contain' here to fix the zoom issue on the homepage too!
    const bgStyle = latestPub.coverImageUrl 
        ? `background: url('${latestPub.coverImageUrl}') center/contain no-repeat; background-color: #f4f0f5;` 
        : `background: linear-gradient(45deg, var(--berry-magenta), var(--royal-purple));`;

    container.innerHTML = `
        <h2 class="section-heading left-align">Latest Release</h2>
        <div class="recent-card">
            <div class="recent-cover" style="${bgStyle}"></div>
            <div class="recent-details">
                <h3>${latestPub.title}</h3>
                <p class="pub-date">Published: ${dateText}</p>
                <p class="pub-desc">${descText}</p>
                <a href="reading-corner.html" class="cta-button outline-cta">Read Now</a>
            </div>
        </div>
    `;
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

    let htmlString = '';
    displayPubs.forEach(pub => {
        // Using 'contain' here for the scrolling covers
        const bgStyle = pub.coverImageUrl 
            ? `background: url('${pub.coverImageUrl}') center/contain no-repeat; background-color: #f4f0f5;` 
            : `background: linear-gradient(135deg, var(--soft-amethyst), var(--royal-purple));`;

        htmlString += `
        <div class="pub-card">
            <div class="pub-cover" style="${bgStyle}"></div>
            <h3>${pub.title}</h3>
        </div>`;
    });

    // To make the infinite scroll CSS animation work seamlessly, 
    // we must put TWO identical copies of the list inside the track.
    track.innerHTML = htmlString + htmlString;

    // Dynamically adjust the track width based on how many items we injected
    const totalItems = displayPubs.length * 2;
    track.style.width = `calc(250px * ${totalItems})`;
    
    // Adjust animation speed so it doesn't go too fast if there are lots of books
    track.style.animationDuration = `${totalItems * 3}s`;
}