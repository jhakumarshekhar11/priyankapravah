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
            e.preventDefault(); 

            // Gather DOM elements
            const title = document.getElementById('pub-title').value;
            const type = document.getElementById('pub-type').value;
            const date = document.getElementById('pub-date').value;
            const desc = document.getElementById('pub-desc').value;
            const coverFile = coverInput.files[0];
            const docFile = docInput.files[0];

            // Validation checks
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

            // UI Feedback
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Uploading... Please wait";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            try {
                // Step A: Upload the main Document to Cloudinary
                // We upload PDFs as 'image' type so Cloudinary can process its pages. EPUBs go as 'raw'.
                const docResourceType = isPdf ? 'image' : 'raw';
                const documentUrl = await uploadToCloudinary(docFile, docResourceType);
                
                let coverUrl = "";

                // Step B: Determine the Cover Image URL
                if (coverFile) {
                    // 1. User provided a custom cover, upload it normally
                    coverUrl = await uploadToCloudinary(coverFile, 'image');
                } else if (isPdf) {
                    // 2. User left cover empty AND it's a PDF. Let's auto-generate!
                    // Cloudinary trick: take the PDF url, replace .pdf with .jpg, and add a page 1 (pg_1) transformation
                    
                    // Example Original: https://res.cloudinary.com/.../upload/v123/book.pdf
                    // Example Wanted:   https://res.cloudinary.com/.../upload/w_600,pg_1/v123/book.jpg
                    
                    coverUrl = documentUrl
                        .replace('.pdf', '.jpg')
                        .replace('/upload/', '/upload/w_600,c_fill,pg_1/'); // Sets width to 600px and targets page 1
                }

                // Step C: Save Metadata & URLs to Firebase Firestore
                await addDoc(collection(db, 'publications'), {
                    title: title,
                    type: type,
                    publishDate: date,
                    description: desc,
                    coverImageUrl: coverUrl,
                    documentUrl: documentUrl,
                    uploadedAt: serverTimestamp() 
                });

                // Success! Reset UI
                alert("Publication uploaded successfully!");
                uploadForm.reset();
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