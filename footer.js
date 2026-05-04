// footer.js
import { db, collection, query, orderBy, limit, getDocs } from './firebaseconfig.js'; // Adjust this path if your footer.js is in a subfolder

async function updateFooterPublications() {
    // 1. Target the exact list in the footer
    const pubList = document.getElementById('footer-latest-pubs');
    
    // Safety check: If the footer isn't on this specific page, stop running
    if (!pubList) return; 

    try {
        // 2. Fetch the 3 absolute newest publications
        const q = query(
            collection(db, "publications"), 
            orderBy("uploadedAt", "desc"), 
            limit(3)
        );
        const querySnapshot = await getDocs(q);

        // 3. Handle empty database
        if (querySnapshot.empty) {
            pubList.innerHTML = '<li><a href="#">No publications yet</a></li>';
            return;
        }

        // 4. Wipe out the "Loading..." placeholder text
        pubList.innerHTML = '';

        // 5. Loop through the data and build the HTML links
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const title = data.title || "Untitled Publication";
            
            // Build the deep link that automatically opens the book in the reader!
            const readLink = `/rcorner/index.html?book=${docId}`; 

            // Create the list item and inject it
            const li = document.createElement('li');
            li.innerHTML = `<a href="${readLink}">${title}</a>`;
            pubList.appendChild(li);
        });

    } catch (error) {
        console.error("Error fetching footer publications:", error);
        pubList.innerHTML = '<li><a href="#">Unable to load titles</a></li>';
    }
}

// Run the script as soon as the HTML has finished loading
document.addEventListener('DOMContentLoaded', updateFooterPublications);