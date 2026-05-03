// admin-upload.js
import { db, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from './firebaseconfig.js';

// --- CLOUDINARY CONFIGURATION ---
const CLOUD_NAME = 'dghjvaonc'; 
const UPLOAD_PRESET = 'priyankapravah'; 

// --- FETCH RECENT UPLOADS LOGIC ---
async function loadRecentUploads() {
    const listContainer = document.getElementById('recent-uploads-list');
    if (!listContainer) return;

    // Show loading state
    listContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem 0;">Loading publications...</p>';

    try {
        // Query Firestore: Get 'publications' collection, order by newest first
        const q = query(collection(db, "publications"), orderBy("uploadedAt", "desc"));
        const querySnapshot = await getDocs(q);

        listContainer.innerHTML = ''; // Clear loading text

        // Empty State Check
        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem 0;">No publications found. Publish one!</p>';
            return;
        }

        // Loop through the results and build the HTML
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            
            // Determine dot color based on type
            let dotClass = 'dot-ebook'; // default magenta
            if (data.type === 'magazine') dotClass = 'dot-mag'; // gold

            // Format type text
            const typeText = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : "Unknown";
            const dateText = data.publishDate || "Unknown Date";

            const itemHtml = `
                <div class="manage-item" data-id="${docId}">
                    <div class="manage-info">
                        <div class="manage-dot ${dotClass}"></div>
                        <div>
                            <h4>${data.title}</h4>
                            <p>${typeText} • ${dateText}</p>
                        </div>
                    </div>
                    <div class="manage-actions">
                        <button class="action-btn edit-btn" title="Edit coming soon">✎</button>
                        <button class="action-btn delete-btn" title="Delete coming soon">🗑</button>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHtml);
        });

    } catch (error) {
        console.error("Error fetching publications:", error);
        listContainer.innerHTML = '<p style="text-align: center; color: #ff4d4d; padding: 2rem 0;">Error loading publications.</p>';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Load publications immediately on page load
    loadRecentUploads();

    // 2. Make File Inputs Interactive
    const coverInput = document.getElementById('cover-image');
    const docInput = document.getElementById('doc-file');

    const updateFileName = (inputElement) => {
        const dropZone = inputElement.closest('.file-drop-zone');
        const textElement = dropZone.querySelector('p');
        
        inputElement.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                textElement.innerHTML = `Selected: <span style="color: var(--berry-magenta);">${fileName}</span>`;
                dropZone.style.borderColor = 'var(--elegant-gold)';
            }
        });
    };

    if(coverInput) updateFileName(coverInput);
    if(docInput) updateFileName(docInput);

    // 3. Main Upload Form Logic
    const uploadForm = document.querySelector('.admin-form');
    const submitBtn = uploadForm ? uploadForm.querySelector('button[type="submit"]') : null;

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const title = document.getElementById('pub-title').value;
            const type = document.getElementById('pub-type').value;
            const date = document.getElementById('pub-date').value;
            const desc = document.getElementById('pub-desc').value;
            const coverFile = coverInput.files[0];
            const docFile = docInput.files[0];

            if (!docFile) {
                alert("Please select a Document file (PDF or EPUB).");
                return;
            }

            const isPdf = docFile.name.toLowerCase().endsWith('.pdf');
            const isEpub = docFile.name.toLowerCase().endsWith('.epub');

            if (isEpub && !coverFile) {
                alert("For EPUB files, a custom cover image is required.");
                return;
            }

            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Uploading... Please wait";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            try {
                const docResourceType = isPdf ? 'image' : 'raw';
                const documentUrl = await uploadToCloudinary(docFile, docResourceType);
                
                let coverUrl = "";

                if (coverFile) {
                    coverUrl = await uploadToCloudinary(coverFile, 'image');
                } else if (isPdf) {
                    coverUrl = documentUrl
                        .replace('.pdf', '.jpg')
                        .replace('/upload/', '/upload/w_600,c_fill,pg_1/'); 
                }

                await addDoc(collection(db, 'publications'), {
                    title: title,
                    type: type,
                    publishDate: date,
                    description: desc,
                    coverImageUrl: coverUrl,
                    documentUrl: documentUrl,
                    uploadedAt: serverTimestamp() 
                });

                alert("Publication uploaded successfully!");
                uploadForm.reset();
                document.querySelectorAll('.file-drop-zone p').forEach(p => {
                    p.innerHTML = `Drag & drop file here or <span>browse</span>`;
                });
                document.querySelectorAll('.file-drop-zone').forEach(zone => {
                    zone.style.borderColor = '#ccc';
                });

                // REFRESH THE LIST DYNAMICALLY AFTER UPLOAD
                loadRecentUploads();

            } catch (error) {
                console.error("Upload failed:", error);
                alert("An error occurred during upload. Please try again.");
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
            }
        });
    }
});

// Helper Function: Uploads a single file to Cloudinary
async function uploadToCloudinary(file, resourceType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Cloudinary upload failed for ${file.name}`);
    }

    const data = await response.json();
    return data.secure_url;
}