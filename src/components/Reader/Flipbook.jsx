// src/components/Reader/Flipbook.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';

// Point to the local or CDN worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Page = React.forwardRef(({ pageNumber, image }, ref) => {
  return (
    <div className="bg-white shadow-lg" ref={ref}>
      <img src={image} alt={`Page ${pageNumber}`} className="w-full h-full object-contain" />
    </div>
  );
});

export default function Flipbook({ pdfUrl }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const renderPages = useCallback(async () => {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const images = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
    }
    setPages(images);
    setLoading(false);
  }, [pdfUrl]);

  useEffect(() => {
    renderPages();
  }, [renderPages]);

  if (loading) return <div className="text-white text-center">प्रतीक्षा करें... (Loading Pages)</div>;

  return (
    <div className="flex justify-center items-center py-10 bg-stone-900 min-h-screen">
      <HTMLFlipBook width={500} height={700} size="stretch" maxShadowOpacity={0.5} showCover={true}>
        {pages.map((img, index) => (
          <Page key={index} pageNumber={index + 1} image={img} />
        ))}
      </HTMLFlipBook>
    </div>
  );
}