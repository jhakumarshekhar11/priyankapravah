// admin-upload.js
import { db, collection, addDoc, serverTimestamp } from './firebaseconfig.js';

// --- CLOUDINARY CONFIGURATION ---
// Replace these with your actual Cloudinary details
const CLOUD_NAME = 'dghjvaonc'; 
const UPLOAD_PRESET = 'priyankapravah'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Make File Inputs Interactive (Show selected file names)
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

    // 2. Main Upload Form Logic
    const uploadForm = document.querySelector('.admin-form');
    const submitBtn = uploadForm ? uploadForm.querySelector('button[type="submit"]') : null;

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stop page refresh

            // Gather DOM elements
            const title = document.getElementById('pub-title').value;
            const type = document.getElementById('pub-type').value;
            const date = document.getElementById('pub-date').value;
            const desc = document.getElementById('pub-desc').value;
            const coverFile = coverInput.files[0];
            const docFile = docInput.files[0];

            // Validation check
            if (!coverFile || !docFile) {
                alert("Please select both a cover image and a document file.");
                return;
            }

            // UI Feedback: Change button state
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Uploading... Please wait";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            try {
                // Step A: Upload Cover Image to Cloudinary
                const coverUrl = await uploadToCloudinary(coverFile, 'image');
                
                // Step B: Upload Document (PDF/EPUB) to Cloudinary
                const documentUrl = await uploadToCloudinary(docFile, 'raw');

                // Step C: Save Metadata & URLs to Firebase Firestore
                await addDoc(collection(db, 'publications'), {
                    title: title,
                    type: type,
                    publishDate: date,
                    description: desc,
                    coverImageUrl: coverUrl,
                    documentUrl: documentUrl,
                    uploadedAt: serverTimestamp() // Tracks exact upload time
                });

                // Success! Reset UI
                alert("Publication uploaded successfully!");
                uploadForm.reset();
                
                // Reset drop zone text
                document.querySelectorAll('.file-drop-zone p').forEach(p => {
                    p.innerHTML = `Drag & drop file here or <span>browse</span>`;
                });
                document.querySelectorAll('.file-drop-zone').forEach(zone => {
                    zone.style.borderColor = '#ccc';
                });

            } catch (error) {
                console.error("Upload failed:", error);
                alert("An error occurred during upload. Please try again.");
            } finally {
                // Restore button state
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
            }
        });
    }
});

// Helper Function: Uploads a single file to Cloudinary via REST API
async function uploadToCloudinary(file, resourceType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // Cloudinary endpoint
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Cloudinary upload failed for ${file.name}`);
    }

    const data = await response.json();
    return data.secure_url; // This is the permanent HTTPS link to the file
}