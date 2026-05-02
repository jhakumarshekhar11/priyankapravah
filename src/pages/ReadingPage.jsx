import React, { useEffect, useState, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

const Page = React.forwardRef(({ image }, ref) => (
  <div className="bg-white shadow-lg" ref={ref}>
    <img src={image} alt="page" className="w-full h-full object-contain" />
  </div>
));

export default function ReadingPage() {
  const [pages, setPages] = useState([]);

  const renderPDF = async (url) => {
    const loadingTask = pdfjsLib.getDocument(url);
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
      images.push(canvas.toDataURL());
    }
    setPages(images);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-stone-200 p-4">
      {pages.length > 0 && (
        <HTMLFlipBook width={500} height={700} size="stretch" minWidth={315} maxWidth={1000} minHeight={400} maxHeight={1533}>
          {pages.map((img, index) => (
            <Page key={index} image={img} />
          ))}
        </HTMLFlipBook>
      )}
    </div>
  );
}