// adminupload.js
// ADDED: 'where' to the imports
import { db, collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, deleteDoc, updateDoc, getDoc, limit, where} from '../firebaseconfig.js';

const CLOUD_NAME = 'dghjvaonc'; 
const UPLOAD_PRESET = 'priyankapravah'; 

// --- STATE VARIABLES FOR EDITING ---
let editingDocId = null;
let existingCoverUrl = "";
let existingDocUrl = "";

// --- TOAST & MODAL LOGIC ---
function showToast(message, type = 'default') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showConfirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';
    
    overlay.innerHTML = `
        <div class="confirm-modal">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="modal-btn btn-cancel" id="cancel-btn">Cancel</button>
                <button class="modal-btn btn-confirm-delete" id="confirm-btn">Yes, Delete</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);

    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('confirm-btn').addEventListener('click', () => {
        onConfirm();
        closeModal();
    });
}

// --- FETCH RECENT UPLOADS LOGIC ---
async function loadRecentUploads() {
    const listContainer = document.getElementById('recent-uploads-list');
    const showMoreBtn = document.getElementById('show-more-btn');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
    `;

    try {
        // INCREASED LIMIT TO 50 so the search bar is actually useful!
        const q = query(collection(db, "publications"), orderBy("uploadedAt", "desc"), limit(50));
        const querySnapshot = await getDocs(q);

        listContainer.innerHTML = ''; 

        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p style="text-align: center; color: #888; padding: 2rem 0;">No publications found. Publish one!</p>';
            if (showMoreBtn) showMoreBtn.style.display = 'none';
            return;
        }

        let index = 0; 

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const typeText = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : "Unknown";

            // Hide anything after the first 4 items
            const hiddenClass = index >= 4 ? 'hidden-item' : '';
            
            // Use their cover image, or a blank placeholder if they didn't upload one
            const coverSrc = data.coverImageUrl || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

            // ADDED: data-title attribute to make searching super fast
            const itemHtml = `
                <div class="manage-item ${hiddenClass}" data-id="${docId}" data-title="${data.title.toLowerCase()}">
                    <div class="manage-info">
                        <img src="${coverSrc}" class="manage-thumb" alt="Cover">
                        <div>
                            <h4>${data.title}</h4>
                            <p>${typeText} • ${data.publishDate}</p>
                        </div>
                    </div>
                    <div class="manage-actions">
                        <button class="action-btn edit-btn" title="Edit">✎</button>
                        <button class="action-btn delete-btn" title="Delete">🗑</button>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHtml);
            index++;
        });

        if (showMoreBtn) {
            if (index > 4) {
                showMoreBtn.style.display = 'block';
            } else {
                showMoreBtn.style.display = 'none';
            }
        }

    } catch (error) {
        console.error("Error fetching:", error);
        showToast("Failed to load recent uploads.", "error");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    loadRecentUploads();

    // UI Elements
    const showMoreBtn = document.getElementById('show-more-btn');
    const searchInput = document.getElementById('admin-search'); // NEW
    const uploadForm = document.querySelector('.admin-form');
    const submitBtn = uploadForm ? uploadForm.querySelector('button[type="submit"]') : null;
    const formHeading = document.querySelector('.admin-heading');
    const coverInput = document.getElementById('cover-image');
    const docInput = document.getElementById('doc-file');
    const cancelEditBtn = document.getElementById('cancel-edit-btn'); 

    // --- LIVE SEARCH LOGIC ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const allItems = document.querySelectorAll('.manage-item');
            
            allItems.forEach(item => {
                const title = item.getAttribute('data-title');
                
                if (title.includes(searchTerm)) {
                    // Show matching items and FORCE them to ignore the hidden-item class
                    item.style.display = 'flex'; 
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide the "Show More" button if they are actively typing a search
            if (searchTerm.length > 0) {
                if (showMoreBtn) showMoreBtn.style.display = 'none';
            } else {
                // If they clear the search, reset everything back to normal
                allItems.forEach(item => item.style.display = ''); 
                if (showMoreBtn && allItems.length > 4) showMoreBtn.style.display = 'block';
            }
        });
    }

    // Handle "Show More" Button Click
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Find all hidden items and remove the class so they appear
            document.querySelectorAll('.hidden-item').forEach(item => {
                item.classList.remove('hidden-item');
            });
            showMoreBtn.style.display = 'none'; // Hide button after clicking
        });
    }

    // --- EVENT DELEGATION FOR EDIT & DELETE ---
    document.getElementById('recent-uploads-list').addEventListener('click', async (e) => {
        const item = e.target.closest('.manage-item');
        if (!item) return;
        const targetId = item.dataset.id;

        // DELETE LOGIC
        if (e.target.classList.contains('delete-btn')) {
            showConfirmModal(
                "Delete Publication?", 
                "Are you sure you want to delete this publication? This action cannot be undone.",
                async () => {
                    try {
                        await deleteDoc(doc(db, "publications", targetId));
                        showToast("Publication deleted.", "success");
                        loadRecentUploads();
                    } catch (error) {
                        console.error(error);
                        showToast("Error deleting publication.", "error");
                    }
                }
            );
        }

        // EDIT LOGIC
        if (e.target.classList.contains('edit-btn')) {
            try {
                const docRef = doc(db, "publications", targetId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    // Populate Form
                    document.getElementById('pub-title').value = data.title;
                    document.getElementById('pub-type').value = data.type;
                    document.getElementById('pub-date').value = data.publishDate;
                    document.getElementById('pub-desc').value = data.description || "";
                    
                    // Set State
                    editingDocId = targetId;
                    existingCoverUrl = data.coverImageUrl;
                    existingDocUrl = data.documentUrl;

                    // Update UI to "Edit Mode"
                    formHeading.innerText = "Edit Publication";
                    submitBtn.innerText = "Publish Changes";
                    if (cancelEditBtn) cancelEditBtn.style.display = 'block'; 
                    
                    document.querySelectorAll('.file-drop-zone p').forEach(p => {
                        p.innerHTML = `(Leave blank to keep existing file) or <span>browse</span> new`;
                    });

                    // Scroll up to form smoothly
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (error) {
                console.error(error);
                showToast("Error loading publication data.", "error");
            }
        }
    });

    // --- CANCEL EDIT LOGIC ---
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            uploadForm.reset();
            editingDocId = null;
            existingCoverUrl = "";
            existingDocUrl = "";
            formHeading.innerText = "Upload New Publication";
            submitBtn.innerText = "Publish to Reading Corner";
            cancelEditBtn.style.display = 'none'; 
            
            document.querySelectorAll('.file-drop-zone p').forEach(p => {
                p.innerHTML = `Drag & drop file here or <span>browse</span>`;
            });
            document.querySelectorAll('.file-drop-zone').forEach(zone => {
                zone.style.borderColor = '#ccc';
            });
        });
    }

    // Make File Inputs Interactive
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

    // --- MAIN UPLOAD / UPDATE LOGIC ---
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const title = document.getElementById('pub-title').value.trim();
            const type = document.getElementById('pub-type').value;
            const date = document.getElementById('pub-date').value;
            const desc = document.getElementById('pub-desc').value;
            const coverFile = coverInput.files[0];
            const docFile = docInput.files[0];

            // Validation: Require doc file ONLY if it's a new upload
            if (!editingDocId && !docFile) {
                showToast("Please select a Document file.", "error");
                return;
            }

            // Save original button state
            const originalBtnText = submitBtn.innerText;
            const originalBg = submitBtn.style.background;
            
            submitBtn.classList.add('uploading');
            submitBtn.disabled = true;

            try {
                // ==========================================
                // 🛑 NEW DUPLICATE PREVENTION LOGIC
                // ==========================================
                submitBtn.innerText = "Checking library...";

                // 1. Check for Duplicate Title
                const qTitle = query(collection(db, "publications"), where("title", "==", title));
                const titleSnap = await getDocs(qTitle);
                let isDuplicateTitle = false;
                
                titleSnap.forEach(d => {
                    if (d.id !== editingDocId) isDuplicateTitle = true; // Ignore if we are editing the same document
                });

                if (isDuplicateTitle) {
                    showToast(`A publication titled "${title}" already exists.`, "error");
                    return; // Abort upload (the 'finally' block handles resetting the button)
                }

                // 2. Check for Duplicate Filename (Only if a new file is provided)
                if (docFile) {
                    const allPubs = await getDocs(collection(db, "publications"));
                    let isDuplicateFile = false;
                    
                    allPubs.forEach(d => {
                        if (d.id !== editingDocId) {
                            const data = d.data();
                            // Check our new originalFileName field OR decode the Cloudinary URL as a fallback
                            if (data.originalFileName === docFile.name || (data.documentUrl && decodeURIComponent(data.documentUrl).includes(docFile.name))) {
                                isDuplicateFile = true;
                            }
                        }
                    });

                    if (isDuplicateFile) {
                        showToast(`The file "${docFile.name}" has already been uploaded.`, "error");
                        return; // Abort upload
                    }
                }
                // ==========================================

                const updateButtonProgress = (percent) => {
                    submitBtn.innerText = `Uploading... ${Math.round(percent)}%`;
                    submitBtn.style.background = `linear-gradient(to right, var(--elegant-gold) ${percent}%, var(--royal-purple) ${percent}%)`;
                };

                let finalDocUrl = existingDocUrl;
                let finalCoverUrl = existingCoverUrl;

                // 1. Handle New Document Upload (if selected)
                if (docFile) {
                    const isPdf = docFile.name.toLowerCase().endsWith('.pdf');
                    const docResourceType = isPdf ? 'image' : 'raw';
                    
                    finalDocUrl = await uploadToCloudinaryXHR(docFile, docResourceType, (progress) => {
                        updateButtonProgress(coverFile ? 20 + (progress * 0.80) : progress); 
                    });

                    // Auto-generate cover if PDF and no cover provided
                    if (isPdf && !coverFile && !existingCoverUrl) {
                        finalCoverUrl = finalDocUrl.replace('.pdf', '.jpg').replace('/upload/', '/upload/w_600,c_fill,pg_1/'); 
                    }
                }

                // 2. Handle New Cover Upload (if selected)
                if (coverFile) {
                    finalCoverUrl = await uploadToCloudinaryXHR(coverFile, 'image', (progress) => {
                        updateButtonProgress(progress * 0.20); 
                    });
                }

                submitBtn.innerText = "Saving to Library...";
                submitBtn.style.background = 'var(--berry-magenta)';

                // 3. Save to Firestore (Update or Add)
                const publicationData = {
                    title: title,
                    type: type,
                    publishDate: date,
                    description: desc,
                    coverImageUrl: finalCoverUrl,
                    documentUrl: finalDocUrl,
                    // Store the raw filename to make future duplicate checks super accurate
                    ...(docFile ? { originalFileName: docFile.name } : {}), 
                    // Only update timestamp if it's a brand new upload
                    ...(editingDocId ? {} : { uploadedAt: serverTimestamp() })
                };

                if (editingDocId) {
                    // Update existing
                    await updateDoc(doc(db, 'publications', editingDocId), publicationData);
                    showToast("Changes published successfully!", "success");
                } else {
                    // Create new
                    await addDoc(collection(db, 'publications'), publicationData);
                    showToast("Publication uploaded successfully!", "success");
                }

                // Reset Form & UI State
                uploadForm.reset();
                editingDocId = null;
                existingCoverUrl = "";
                existingDocUrl = "";
                formHeading.innerText = "Upload New Publication";
                if (cancelEditBtn) cancelEditBtn.style.display = 'none'; 
                
                document.querySelectorAll('.file-drop-zone p').forEach(p => {
                    p.innerHTML = `Drag & drop file here or <span>browse</span>`;
                });
                document.querySelectorAll('.file-drop-zone').forEach(zone => {
                    zone.style.borderColor = '#ccc';
                });

                loadRecentUploads();

            } catch (error) {
                console.error("Upload/Update failed:", error);
                showToast("Operation failed. Please try again.", "error");
            } finally {
                // Because we used 'return' earlier, this block safely resets the UI 
                // even if the upload was cancelled due to a duplicate!
                submitBtn.classList.remove('uploading');
                submitBtn.disabled = false;
                submitBtn.innerText = "Publish to Reading Corner"; // Default back to original
                submitBtn.style.background = originalBg || '';
            }
        });
    }
});

// Helper Function
function uploadToCloudinaryXHR(file, resourceType, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

        xhr.open('POST', url, true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response.secure_url);
            } else {
                reject(new Error('Cloudinary upload failed'));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        xhr.send(formData);
    });
}