// src/pages/About.jsx
import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-gradient-to-br from-[#2D0B31] to-[#5D2A66]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        
        {/* Decorative Portrait Section */}
        <div className="relative group">
          {/* Floral SVG Overlays (Top-Right & Bottom-Left) */}
          <div className="absolute -top-6 -right-6 w-24 h-24 text-[#D13174] opacity-80 group-hover:rotate-12 transition-transform">
             <svg viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 0C55 25 75 45 100 50C75 55 55 75 50 100C45 75 25 55 0 50C25 45 45 25 50 0Z" />
             </svg>
          </div>
          
          <div className="relative z-10 overflow-hidden rounded-[2rem] border-4 border-white/20 shadow-2xl">
            <img 
              src="/path-to-author-portrait.jpg" 
              alt="Priyanka" 
              className="w-full aspect-[3/4] object-cover"
            />
          </div>

          <div className="absolute -bottom-6 -left-6 w-32 h-32 text-[#D13174] opacity-80 group-hover:-rotate-12 transition-transform">
             {/* Matching Floral Motif */}
             <svg viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 0C55 25 75 45 100 50C75 55 55 75 50 100C45 75 25 55 0 50C25 45 45 25 50 0Z" />
             </svg>
          </div>
        </div>

        {/* About Text Glass Card */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="backdrop-blur-xl bg-white/10 border border-white/20 p-10 rounded-3xl text-white"
        >
          <h2 className="text-4xl font-serif mb-6 text-[#D13174]">Priyanka Pravah</h2>
          <p className="text-lg leading-relaxed opacity-90 italic mb-4">
             "Flow of Thoughts & Expression"
          </p>
          <p className="text-lg leading-relaxed mb-6">
            A Hindi poet, magazine writer, and composer dedicated to capturing the subtle nuances of human emotion through rhyme and rhythm.
          </p>
          {/* Social Icons / Badges here */}
        </motion.div>
      </div>
    </div>
  );
}