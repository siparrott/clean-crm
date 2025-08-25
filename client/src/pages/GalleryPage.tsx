import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import GalleryAuthForm from '../components/galleries/GalleryAuthForm';
import ImageGrid from '../components/galleries/ImageGrid';
import { getGalleryBySlug, getPublicGalleryImages } from '../lib/gallery-api';
import { Gallery, GalleryImage } from '../types/gallery';
import { ArrowLeft, Download, Share2, Heart, Loader2, AlertCircle } from 'lucide-react';

const GalleryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchGallery(slug);
      
      // Check for existing token in localStorage
      const savedToken = localStorage.getItem(`gallery_token_${slug}`);
      if (savedToken) {
        setAuthToken(savedToken);
        setIsAuthenticated(true);
      }
    } else {
      // No slug provided, stop loading
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Foto-Galerie Wien - Familienfotos & Porträts | New Age Fotografie';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Exklusive Foto-Galerie mit passwortgeschütztem Zugang. Familienfotos, Porträts und Hochzeitsbilder vom Wiener Familienfotograf.');

    // Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Foto-Galerie - New Age Fotografie Wien');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && slug && authToken) {
      fetchGalleryImages(slug, authToken);
    }
  }, [isAuthenticated, slug, authToken]);

  const fetchGallery = async (gallerySlug: string) => {
    try {
      setLoading(true);
      const data = await getGalleryBySlug(gallerySlug);
      setGallery(data);
    } catch (err) {
      // console.error removed
      setError('Failed to load gallery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryImages = async (gallerySlug: string, token: string) => {
    try {
      setLoading(true);
      const data = await getPublicGalleryImages(gallerySlug, token);
      setImages(data);
    } catch (err) {
      // console.error removed
      setError('Failed to load gallery images. Please try again.');
      
      // If token is invalid, clear it and require re-authentication
      if (err instanceof Error && err.message.includes('Invalid token')) {
        localStorage.removeItem(`gallery_token_${gallerySlug}`);
        setIsAuthenticated(false);
        setAuthToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticated = (token: string) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    
    // Log access event
    logGalleryAccess(token);
  };

  const logGalleryAccess = async (token: string) => {
    // This would be implemented to log access to the gallery
    // console.log removed
  };

  const handleDownloadAll = () => {
    if (!gallery || !slug || !authToken) return;
    
    if (!gallery.downloadEnabled) {
      alert('Downloads are disabled for this gallery.');
      return;
    }
    
    // Create a download link
    const link = document.createElement('a');
    link.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/galleries/public/galleries/${slug}/download`;
    link.download = `${gallery.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
    
    // Add authorization header
    fetch(link.href, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      // console.error removed
      alert('Failed to download gallery. Please try again.');
    });
  };

  const handleShare = () => {
    if (!gallery || !slug) return;
    
    const url = `${window.location.origin}/gallery/${slug}`;
    
    if (navigator.share) {
      navigator.share({
        title: gallery.title,
        url: url
      }).catch(err => {
        // console.error removed
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          alert('Gallery link copied to clipboard!');
        })
        .catch(err => {
          // console.error removed
          prompt('Copy this link:', text);
        });
    } else {
      prompt('Copy this link:', text);
    }
  };

  const filteredImages = showFavoritesOnly
    ? images.filter(image => image.isFavorite)
    : images;

  // If no slug is provided, redirect to galleries overview
  if (!slug) {
    return <Navigate to="/galleries" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Link to="/galleries" className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-1" />
          Zurück zu allen Galerien
        </Link>
        
        {loading && !gallery ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading gallery...</span>
          </div>
        ) : error && !gallery ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        ) : gallery ? (
          <>
            {/* Gallery Header */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{gallery.title}</h1>
              {gallery.description && (
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">{gallery.description}</p>
              )}
            </div>
            
            {/* Authentication Form or Gallery Content */}
            {!isAuthenticated ? (
              <GalleryAuthForm 
                gallerySlug={slug || ''} 
                isPasswordProtected={gallery.isPasswordProtected || !!gallery.password}
                onAuthenticated={handleAuthenticated}
              />
            ) : (
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className={`inline-flex items-center px-4 py-2 border ${
                        showFavoritesOnly
                          ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      } rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors`}
                    >
                      <Heart size={16} className={`mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                      {showFavoritesOnly ? 'Alle anzeigen' : 'Favoriten anzeigen'}
                    </button>
                    
                    {gallery.downloadEnabled && (
                      <button
                        onClick={handleDownloadAll}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                      >
                        <Download size={16} className="mr-2" />
                        Alle herunterladen
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                  >
                    <Share2 size={16} className="mr-2" />
                    Galerie teilen
                  </button>
                </div>
                
                {/* Image Grid */}
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Loading images...</span>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
                    <span>{error}</span>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <ImageGrid 
                      images={filteredImages} 
                      galleryId={gallery.id}
                      isPublic={true}
                      authToken={authToken}
                      downloadEnabled={gallery.downloadEnabled}
                    />
                    
                    {showFavoritesOnly && filteredImages.length === 0 && (
                      <div className="text-center py-12">
                        <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Favoriten</h3>
                        <p className="text-gray-500">
                          Sie haben noch keine Bilder zu Ihren Favoriten hinzugefügt.
                        </p>
                        <button
                          onClick={() => setShowFavoritesOnly(false)}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                        >
                          Alle Bilder anzeigen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Gallery not found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The gallery you're looking for doesn't exist or has been removed.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Return to home
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GalleryPage;