import React, { useState, useEffect } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

function ImageViewerModal({ isOpen, onClose, images, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.stopPropagation();
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.stopPropagation();
        e.preventDefault();
        handleNext();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown, { capture: true });
    }
    
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, currentIndex, images.length]);

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${currentImage.messageId || Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      {/* Header with close and download */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent z-10">
        <div className="text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors text-white"
            aria-label="Download image"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="relative w-full h-full flex items-center justify-center p-16">
        <img
          src={currentImage.url}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors text-white"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors text-white"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Thumbnail strip at bottom */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex gap-2 justify-center overflow-x-auto max-w-4xl mx-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex
                    ? "border-cyan-500 scale-110"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={img.url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click background to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}

export default ImageViewerModal;
