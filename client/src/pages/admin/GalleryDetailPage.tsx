import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import ImageUploader from '../../components/galleries/ImageUploader';
import ImageGrid from '../../components/galleries/ImageGrid';
import GalleryStats from '../../components/galleries/GalleryStats';
import { Gallery, GalleryImage, GalleryStats as GalleryStatsType, GalleryVisitor, GalleryAccessLog } from '../../types/gallery';
import { getGalleryById, getGalleryImages, getGalleryStats, deleteGallery, getGalleryVisitors, getGalleryAccessLogs } from '../../lib/gallery-api';
import { ArrowLeft, Upload, BarChart as ChartBar, Edit, Trash2, Share2, Loader2, AlertCircle, Users, Clock } from 'lucide-react';

const GalleryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [stats, setStats] = useState<GalleryStatsType | null>(null);
  const [visitors, setVisitors] = useState<GalleryVisitor[]>([]);
  const [accessLogs, setAccessLogs] = useState<GalleryAccessLog[]>([]);
  const [activeTab, setActiveTab] = useState<'images' | 'upload' | 'stats' | 'visitors'>('images');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for scroll position
  const imagesTabRef = useRef<HTMLButtonElement>(null);
  const uploadTabRef = useRef<HTMLButtonElement>(null);
  const statsTabRef = useRef<HTMLButtonElement>(null);
  const visitorsTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (id) {
      fetchGalleryData(id);
    }
  }, [id]);

  const fetchGalleryData = async (galleryId: string) => {
    try {
      setLoading(true);
      
      // Fetch gallery details
      const galleryData = await getGalleryById(galleryId);
      setGallery(galleryData);
      
      // Fetch gallery images
      const imagesData = await getGalleryImages(galleryId);
      setImages(imagesData);
      
      // Fetch gallery stats
      try {
        const statsData = await getGalleryStats(galleryId);
        setStats(statsData);
      } catch (statsError) {
        // console.error removed
        // Don't fail the whole page load if stats fail
      }
      
      // Fetch gallery visitors
      try {
        const visitorsData = await getGalleryVisitors(galleryId);
        setVisitors(visitorsData);
      } catch (visitorsError) {
        // console.error removed
        // Don't fail the whole page load if visitors fetch fails
      }
      
      // Fetch access logs
      try {
        const logsData = await getGalleryAccessLogs(galleryId);
        setAccessLogs(logsData);
      } catch (logsError) {
        // console.error removed
        // Don't fail the whole page load if logs fetch fails
      }
    } catch (err) {
      // console.error removed
      setError('Failed to load gallery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'images' | 'upload' | 'stats' | 'visitors') => {
    setActiveTab(tab);
    
    // Scroll the active tab into view
    if (tab === 'images' && imagesTabRef.current) {
      imagesTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (tab === 'upload' && uploadTabRef.current) {
      uploadTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (tab === 'stats' && statsTabRef.current) {
      statsTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (tab === 'visitors' && visitorsTabRef.current) {
      visitorsTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleUploadComplete = () => {
    // Refresh images
    if (id) {
      getGalleryImages(id).then(imagesData => {
        setImages(imagesData);
        // Switch to images tab
        setActiveTab('images');
      }).catch(err => {
        // console.error removed
      });
    }
  };

  const handleImageDeleted = () => {
    // Refresh images
    if (id) {
      getGalleryImages(id).then(imagesData => {
        setImages(imagesData);
      }).catch(err => {
        // console.error removed
      });
    }
  };

  const handleSetCover = () => {
    // Refresh gallery to get updated cover image
    if (id) {
      getGalleryById(id).then(galleryData => {
        setGallery(galleryData);
      }).catch(err => {
        // console.error removed
      });
    }
  };

  const handleDeleteGallery = async () => {
    if (!gallery) return;
    
    if (window.confirm(`Are you sure you want to delete the gallery "${gallery.title}"? This action cannot be undone and will delete all images.`)) {
      try {
        setLoading(true);
        await deleteGallery(gallery.id);
        navigate('/admin/galleries');
      } catch (err) {
        // console.error removed
        setError('Failed to delete gallery. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleShareGallery = () => {
    if (!gallery) return;
    
    const url = `${window.location.origin}/gallery/${gallery.slug}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('Gallery link copied to clipboard!');
        })
        .catch(err => {
          // console.error removed
          prompt('Copy this link:', url);
        });
    } else {
      prompt('Copy this link:', url);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link to="/admin/galleries" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Galleries</span>
          </Link>
          
          {loading ? (
            <h1 className="text-2xl font-semibold text-gray-900 mt-2">Loading gallery...</h1>
          ) : gallery ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{gallery.title}</h1>
                <p className="text-gray-600">
                  {images.length} {images.length === 1 ? 'image' : 'images'} • Created {new Date(gallery.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex mt-4 sm:mt-0 space-x-2">
                <button
                  onClick={handleShareGallery}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Share2 size={16} className="mr-2" />
                  Share
                </button>
                <Link
                  to={`/admin/galleries/${gallery.id}/edit`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Edit size={16} className="mr-2" />
                  Edit
                </Link>
                <button
                  onClick={handleDeleteGallery}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-gray-900 mt-2">Gallery not found</h1>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading gallery...</span>
          </div>
        ) : gallery ? (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex space-x-8">
                <button
                  ref={imagesTabRef}
                  onClick={() => handleTabChange('images')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'images'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Images ({images.length})
                </button>
                <button
                  ref={uploadTabRef}
                  onClick={() => handleTabChange('upload')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'upload'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Upload size={16} className="inline mr-1" />
                  Upload Images
                </button>
                <button
                  ref={statsTabRef}
                  onClick={() => handleTabChange('stats')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'stats'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ChartBar size={16} className="inline mr-1" />
                  Analytics
                </button>
                <button
                  ref={visitorsTabRef}
                  onClick={() => handleTabChange('visitors')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'visitors'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users size={16} className="inline mr-1" />
                  Visitors ({visitors.length})
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
              {activeTab === 'images' && (
                <ImageGrid 
                  images={images} 
                  galleryId={gallery.id}
                  isAdmin={true}
                  onImageDeleted={handleImageDeleted}
                  onSetCover={handleSetCover}
                />
              )}
              
              {activeTab === 'upload' && (
                <ImageUploader 
                  galleryId={gallery.id}
                  onUploadComplete={handleUploadComplete}
                />
              )}
              
              {activeTab === 'stats' && (
                stats ? (
                  <GalleryStats stats={stats} />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Loading analytics...</span>
                  </div>
                )
              )}
              
              {activeTab === 'visitors' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Gallery Visitors</h3>
                  
                  {visitors.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              First Access
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Access
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {visitors.map((visitor) => (
                            <tr key={visitor.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {visitor.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {visitor.firstName && visitor.lastName 
                                  ? `${visitor.firstName} ${visitor.lastName}`
                                  : 'Not provided'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(visitor.createdAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(visitor.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Visitors Yet</h3>
                      <p className="text-gray-500">
                        This gallery hasn't been viewed by any visitors yet.
                      </p>
                    </div>
                  )}
                  
                  {/* Access Logs */}
                  <h3 className="text-lg font-medium text-gray-900 mt-8 mb-4">Recent Access Logs</h3>
                  
                  {accessLogs && accessLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Access Time
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Browser
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {accessLogs.map((log) => (
                            <tr key={log.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {log.firstName && log.lastName 
                                  ? `${log.firstName} ${log.lastName}`
                                  : 'Not provided'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(log.accessedAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                                {log.userAgent ? log.userAgent.split(' ')[0] : 'Unknown'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Access Logs</h3>
                      <p className="text-gray-500">
                        No access logs have been recorded for this gallery yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              The gallery you're looking for doesn't exist or has been deleted.
            </p>
            <div className="mt-6">
              <Link
                to="/admin/galleries"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Return to galleries
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GalleryDetailPage;