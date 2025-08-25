import React, { useState, useEffect } from 'react';
import { GalleryImage } from '../../types/gallery';
import { Heart, Download, Trash2, Eye, Image, Share2 } from 'lucide-react';
import { toggleImageFavorite, deleteGalleryImage, setGalleryCoverImage } from '../../lib/gallery-api';

interface ImageGridProps {
  images: GalleryImage[];
  galleryId: string;
  isAdmin?: boolean;
  isPublic?: boolean;
  authToken?: string;
  downloadEnabled?: boolean;
  onImageDeleted?: () => void;
  onSetCover?: () => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  galleryId,
  isAdmin = false,
  isPublic = false,
  authToken = '',
  downloadEnabled = true,
  onImageDeleted,
  onSetCover
}) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Images updated - no additional layout initialization needed for CSS grid
  }, [images]);

  // Keyboard support for lightbox
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (event.key === 'Escape') {
        closeLightbox();
      } else if (event.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (event.key === 'ArrowRight') {
        navigateImage('next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

  const openLightbox = (image: GalleryImage, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
    setIsLightboxOpen(true);
    
    // Log view action if public
    if (isPublic && authToken) {
      // This would be implemented to log a VIEW action
      // console.log removed
    }
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'next' | 'prev') => {
    if (images.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % images.length;
    } else {
      newIndex = (currentIndex - 1 + images.length) % images.length;
    }
    
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleFavoriteToggle = async (image: GalleryImage, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!isPublic || !authToken) return;
    
    try {
      setLoading(true);
      await toggleImageFavorite(image.id, authToken);
      
      // Update local state
      image.isFavorite = !image.isFavorite;
      setLoading(false);
    } catch (error) {
      // console.error removed
      setLoading(false);
    }
  };

  const handleDownload = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!downloadEnabled) return;
    
    try {
      // Fetch the image blob to handle CORS and authentication issues
      const response = await fetch(image.displayUrl, {
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`,
        } : {}
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      // Log download action if public
      if (isPublic && authToken) {
        // console.log removed
      }
    } catch (error) {
      // console.error removed
      // Fallback to direct link if blob method fails
      const link = document.createElement('a');
      link.href = image.displayUrl;
      link.download = image.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        setLoading(true);
        await deleteGalleryImage(image.id);
        setLoading(false);
        
        if (onImageDeleted) {
          onImageDeleted();
        }
      } catch (error) {
        // console.error removed
        setLoading(false);
      }
    }
  };

  const handleSetCover = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      await setGalleryCoverImage(galleryId, image.id);
      setLoading(false);
      
      if (onSetCover) {
        onSetCover();
      }
    } catch (error) {
      // console.error removed
      setLoading(false);
    }
  };

  const handleShareToJpegWriter = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      // Update the shared_to_togninja flag
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/gallery_images?id=eq.${image.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          shared_to_togninja: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image status');
      }
      
      // Update local state
      image.sharedToTogninja = true;
      setLoading(false);
      
      alert('Image shared to JpegWriter successfully!');
    } catch (error) {
      // console.error removed
      setLoading(false);
      alert('Failed to share image to JpegWriter. Please try again.');
    }
  };

  return (
    <div>
      {images.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Yet</h3>
          <p className="text-gray-500">
            {isAdmin 
              ? 'Upload images to get started.' 
              : 'This gallery is empty. Check back later.'}
          </p>
        </div>
      ) : (
        <div className="gallery-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className="gallery-item relative group cursor-pointer"
              onClick={() => openLightbox(image, index)}
            >
              <div className="aspect-square overflow-hidden rounded-lg">
                <img 
                  src={image.thumbUrl} 
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  {isPublic && (
                    <button
                      onClick={(e) => handleFavoriteToggle(image, e)}
                      className={`p-2 rounded-full ${
                        image.isFavorite 
                          ? 'bg-red-500 text-white' 
                          : 'bg-white text-gray-800 hover:text-red-500'
                      }`}
                      disabled={loading}
                    >
                      <Heart size={16} className={image.isFavorite ? 'fill-current' : ''} />
                    </button>
                  )}
                  
                  {downloadEnabled && (
                    <button
                      onClick={(e) => handleDownload(image, e)}
                      className="p-2 rounded-full bg-white text-gray-800 hover:text-blue-500"
                      disabled={loading}
                    >
                      <Download size={16} />
                    </button>
                  )}
                  
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => handleSetCover(image, e)}
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-purple-500"
                        title="Set as Cover Image"
                        disabled={loading}
                      >
                        <Image size={16} />
                      </button>
                      <button
                        onClick={(e) => handleShareToJpegWriter(image, e)}
                        className={`p-2 rounded-full bg-white text-gray-800 ${
                          image.sharedToTogninja ? 'text-green-500' : 'hover:text-green-500'
                        }`}
                        title={image.sharedToTogninja ? "Shared to JpegWriter" : "Share to JpegWriter"}
                        disabled={loading || image.sharedToTogninja}
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(image, e)}
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-red-500"
                        title="Delete Image"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {isPublic && image.isFavorite && (
                <div className="absolute top-2 right-2">
                  <Heart size={16} className="text-red-500 fill-current" />
                </div>
              )}
              
              {isAdmin && image.sharedToTogninja && (
                <div className="absolute top-2 left-2">
                  <Share2 size={16} className="text-green-500" />
                </div>
              )}
              
              {isAdmin && (
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white bg-black bg-opacity-50 p-1 rounded truncate">
                    {image.filename}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Lightbox */}
      {isLightboxOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Close Button */}
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full p-2"
              onClick={closeLightbox}
              title="Close (ESC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Back to Gallery Button */}
            <button
              className="absolute top-4 left-4 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full p-2 flex items-center space-x-2"
              onClick={closeLightbox}
              title="Back to Gallery"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm hidden sm:block">Back to Gallery</span>
            </button>
            
            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            <img 
              src={selectedImage.displayUrl} 
              alt={selectedImage.filename}
              className="max-w-[95vw] max-h-[90vh] mx-auto object-contain"
            />
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              {isPublic && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavoriteToggle(selectedImage);
                  }}
                  className={`p-2 rounded-full ${
                    selectedImage.isFavorite 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white text-gray-800 hover:text-red-500'
                  }`}
                  disabled={loading}
                >
                  <Heart size={20} className={selectedImage.isFavorite ? 'fill-current' : ''} />
                </button>
              )}
              
              {downloadEnabled && (
                <button
                  onClick={(e) => handleDownload(selectedImage, e)}
                  className="p-2 rounded-full bg-white text-gray-800 hover:text-blue-500"
                  disabled={loading}
                >
                  <Download size={20} />
                </button>
              )}
              
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => handleSetCover(selectedImage, e)}
                    className="p-2 rounded-full bg-white text-gray-800 hover:text-purple-500"
                    title="Set as Cover Image"
                    disabled={loading}
                  >
                    <Image size={20} />
                  </button>
                  <button
                    onClick={(e) => handleShareToJpegWriter(selectedImage, e)}
                    className={`p-2 rounded-full bg-white text-gray-800 ${
                      selectedImage.sharedToTogninja ? 'text-green-500' : 'hover:text-green-500'
                    }`}
                    title={selectedImage.sharedToTogninja ? "Shared to JpegWriter" : "Share to JpegWriter"}
                    disabled={loading || selectedImage.sharedToTogninja}
                  >
                    <Share2 size={20} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(selectedImage, e)}
                    className="p-2 rounded-full bg-white text-gray-800 hover:text-red-500"
                    title="Delete Image"
                    disabled={loading}
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>
            
            {/* Filename display */}
            <div className="absolute bottom-16 left-0 right-0 text-center">
              <p className="text-sm text-white bg-black bg-opacity-50 inline-block px-2 py-1 rounded">
                {selectedImage.filename}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGrid;