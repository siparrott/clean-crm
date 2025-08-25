import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getPublicGalleries } from '../lib/gallery-api';
import { Gallery } from '../types/gallery';
import { Search, Calendar, Eye, Loader2, AlertCircle, Camera } from 'lucide-react';

const PublicGalleriesPage: React.FC = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [filteredGalleries, setFilteredGalleries] = useState<Gallery[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGalleries();
  }, []);

  useEffect(() => {
    filterGalleries();
  }, [galleries, searchTerm]);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const data = await getPublicGalleries();
      setGalleries(data);
    } catch (err) {
      // console.error removed
      setError('Failed to load galleries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterGalleries = () => {
    if (!searchTerm.trim()) {
      setFilteredGalleries(galleries);
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = galleries.filter(gallery => 
      gallery.title.toLowerCase().includes(lowerSearchTerm) ||
      (gallery.description && gallery.description.toLowerCase().includes(lowerSearchTerm)) ||
      (gallery.clientEmail && gallery.clientEmail.toLowerCase().includes(lowerSearchTerm))
    );
    
    setFilteredGalleries(filtered);
  };

  const getWatermarkedCoverImage = (gallery: Gallery) => {
    // TODO: Implement watermarking with homepage logo
    // For now, return the original cover image
    return gallery.coverImage || '/placeholder-gallery.jpg';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Meine Galerie</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Entdecken Sie unsere professionellen Fotogalerien. Suchen Sie nach Ihrer persönlichen Galerie und erleben Sie Ihre besonderen Momente.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Galerie suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start mb-8">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Galerien werden geladen...</span>
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="mb-6">
              <p className="text-gray-600">
                {filteredGalleries.length} {filteredGalleries.length === 1 ? 'Galerie' : 'Galerien'} gefunden
                {searchTerm && ` für "${searchTerm}"`}
              </p>
            </div>

            {/* Galleries Grid */}
            {filteredGalleries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGalleries.map(gallery => (
                  <div 
                    key={gallery.id}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple-300 overflow-hidden"
                  >
                    {/* Gallery Cover */}
                    <div className="relative aspect-square bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
                      {gallery.coverImage ? (
                        <img
                          src={getWatermarkedCoverImage(gallery)}
                          alt={gallery.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                              <Camera className="w-8 h-8 text-purple-600" />
                            </div>
                            <p className="text-sm text-gray-500">Keine Vorschau</p>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Link
                          to={`/gallery/${gallery.slug}`}
                          className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-6 py-3 rounded-full font-semibold transition-all duration-200 transform hover:scale-110 flex items-center"
                        >
                          <Eye size={18} className="mr-2" />
                          Galerie ansehen
                        </Link>
                      </div>

                      {/* Watermark Logo Overlay */}
                      <div className="absolute bottom-2 right-2 opacity-50">
                        <img 
                          src="/frontend-logo.jpg" 
                          alt="New Age Fotografie"
                          className="h-8 w-auto opacity-75"
                        />
                      </div>
                    </div>

                    {/* Gallery Info */}
                    <div className="p-6">
                      {/* Title */}
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                        {gallery.title}
                      </h3>

                      {/* Description */}
                      {gallery.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {gallery.description}
                        </p>
                      )}

                      {/* Date */}
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Calendar size={14} className="mr-2" />
                        {formatDate(gallery.createdAt)}
                      </div>

                      {/* Call to Action */}
                      <Link
                        to={`/gallery/${gallery.slug}`}
                        className="block w-full text-center bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
                      >
                        Galerie öffnen
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* No Results */
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <div className="mx-auto h-16 w-16 text-gray-400 mb-6">
                  <Camera className="w-full h-full" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Keine Galerien gefunden' : 'Keine Galerien verfügbar'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm 
                    ? `Keine Galerien entsprechen Ihrer Suche nach "${searchTerm}".`
                    : 'Es sind derzeit keine öffentlichen Galerien verfügbar.'
                  }
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    Alle Galerien anzeigen
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Help Section */}
        <div className="mt-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ihre Galerie nicht gefunden?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Falls Sie Ihre persönliche Galerie nicht finden können, kontaktieren Sie uns bitte. 
            Wir helfen Ihnen gerne beim Zugang zu Ihren Fotos.
          </p>
          <Link
            to="/kontakt"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Kontakt aufnehmen
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default PublicGalleriesPage;
