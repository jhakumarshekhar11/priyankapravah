// src/pages/Admin.jsx
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('magazine');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF file.");
    setUploading(true);

    try {
      // 1. Upload to Cloudinary (Ensure preset is 'Unsigned')
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (!data.secure_url) throw new Error("Cloudinary upload failed");

      // 2. Save to Firestore
      await addDoc(collection(db, "publications"), {
        title,
        description,
        type,
        pdfUrl: data.secure_url,
        createdAt: new Date()
      });

      alert("Uploaded Successfully!");
      setTitle(''); setDescription(''); setFile(null);
    } catch (error) {
      console.error(error);
      alert("Upload failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-10 px-6 bg-[#2D0B31] text-white">
      <div className="max-w-3xl mx-auto backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif text-[#D13174]">Admin Dashboard</h1>
          <button onClick={handleLogout} className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition">Logout</button>
        </div>

        <form onSubmit={handleUpload} className="flex flex-col gap-6">
          <div>
            <label className="block mb-2 text-white/80">Title</label>
            <input type="text" required value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:border-[#D13174] outline-none" />
          </div>

          <div>
            <label className="block mb-2 text-white/80">Description</label>
            <textarea required value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:border-[#D13174] outline-none" rows="3"></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-white/80">Category</label>
              <select value={type} onChange={(e)=>setType(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:border-[#D13174] outline-none text-black">
                <option value="magazine">Magazine</option>
                <option value="ebook">E-Book</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-white/80">PDF File</label>
              <input type="file" accept="application/pdf" required onChange={(e)=>setFile(e.target.files[0])} className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:border-[#D13174] outline-none" />
            </div>
          </div>

          <button type="submit" disabled={uploading} className="w-full py-4 mt-4 bg-[#5D2A66] hover:bg-[#4a2252] rounded-xl font-bold transition-colors disabled:opacity-50">
            {uploading ? 'Uploading to Cloudinary...' : 'Publish'}
          </button>
        </form>
      </div>
    </div>
  );
}