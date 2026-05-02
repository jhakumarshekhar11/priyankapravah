// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Navigation } from 'swiper/modules';
import Hero from '../components/Home/Hero';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';
import 'swiper/css/navigation';

export default function Home() {
  const [publications, setPublications] = useState([]);

  useEffect(() => {
    const fetchPubs = async () => {
      const q = query(collection(db, "publications"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setPublications(items);
    };
    fetchPubs();
  }, []);

  // Trick: Cloudinary auto-converts the first page of a PDF to a JPG if we change the extension
  const pdfToImage = (pdfUrl) => pdfUrl.replace(/\.pdf$/i, '.jpg');

  return (
    <div className="bg-[#1a0520] min-h-screen text-white">
      <Hero /> 

      <div className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-4xl font-serif text-center mb-16 text-[#D13174]">Latest Publications</h2>
        
        {publications.length === 0 ? (
          <p className="text-center text-white/50">No publications uploaded yet.</p>
        ) : (
          <div className="max-w-xs md:max-w-md mx-auto">
            <Swiper
              effect={'cards'}
              grabCursor={true}
              modules={[EffectCards, Navigation]}
              navigation={true}
              className="mySwiper"
            >
              {publications.map((pub) => (
                <SwiperSlide key={pub.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
                  <img 
                    src={pdfToImage(pub.pdfUrl)} 
                    alt={pub.title} 
                    className="w-full h-80 object-cover rounded-xl shadow-md mb-4"
                  />
                  <h3 className="text-xl font-bold mb-2 text-center">{pub.title}</h3>
                  <p className="text-sm text-white/70 text-center mb-4 line-clamp-2">{pub.description}</p>
                  
                  {/* Pass the PDF URL to the Reader page */}
                  <Link 
                    to={`/read/${pub.id}`} 
                    state={{ pdfUrl: pub.pdfUrl }}
                    className="mt-auto px-6 py-2 bg-[#D13174] hover:bg-magenta-600 rounded-full font-medium transition"
                  >
                    Read Now
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </div>
  );
}