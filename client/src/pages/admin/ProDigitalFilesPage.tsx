import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Plus, 
  Search, 
  Eye, 
  Download, 
  Trash2, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  Loader2,
  AlertCircle,
  Upload,
  Grid,
  List,
  Star,
  Share2,
  Edit3,
  Heart,
  CheckSquare,
  Square,
  SortAsc,
  SortDesc,
  Folder
} from 'lucide-react';

interface FileItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  client_id?: string;
  client_name?: string;
  booking_id?: string;
  category: string;
  is_public: boolean;
  uploaded_by: string;
  created_at: string;
  // Professional metadata
  width?: number;
  height?: number;
  camera_make?: string;
  camera_model?: string;
  lens_model?: string;
  focal_length?: string;
  aperture?: string;
  shutter_speed?: string;
  iso?: number;
  keywords?: string[];
  copyright?: string;
  description?: string;
  rating?: number;
  color_profile?: string;
  is_favorite?: boolean;
  view_count?: number;
  download_count?: number;
}

interface IPTCData {
  title?: string;
  description?: string;
  keywords?: string[];
  copyright?: string;
  creator?: string;
  creatorTitle?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
  urgency?: number;
  rating?: number;
}

const ProDigitalFilesPage: React.FC = () => {
  const { t } = useLanguage();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [iptcData, setIptcData] = useState<IPTCData>({});
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [folderName, setFolderName] = useState<string>('');
  const [selectedFilesForUpload, setSelectedFilesForUpload] = useState<FileList | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    filterAndSortFiles();
  }, [files, searchTerm, categoryFilter, sortBy, sortOrder]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('digital_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // console.error removed
        throw new Error(`Database error: ${error.message}. Please ensure the 'digital_files' table exists.`);
      }
      
      setFiles(data || []);
    } catch (err: any) {
      // console.error removed
      setError(err.message || 'Failed to load files. Please check database setup.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortFiles = useCallback(() => {
    let filtered = [...files];

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(file => 
        file.original_filename.toLowerCase().includes(lowerSearchTerm) ||
        file.keywords?.some(keyword => keyword.toLowerCase().includes(lowerSearchTerm)) ||
        file.description?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(file => file.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'filename':
          aValue = a.original_filename.toLowerCase();
          bValue = b.original_filename.toLowerCase();
          break;
        case 'size':
          aValue = a.file_size;
          bValue = b.file_size;
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'views':
          aValue = a.view_count || 0;
          bValue = b.view_count || 0;
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredFiles(filtered);
  }, [files, searchTerm, categoryFilter, sortBy, sortOrder]);

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    // Check if folder name is provided
    if (!folderName.trim()) {
      setError('Please enter a folder name to organize your files.');
      return;
    }

    try {
      setUploadProgress(0);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Authentication required for file upload.');
        return;
      }

      const totalFiles = files.length;
      let completedFiles = 0;
      const sanitizedFolderName = folderName.trim().replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '_');

      for (const file of Array.from(files)) {
        // Create file path with folder structure
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${sanitizedFolderName}/${fileName}`;
        
        // Upload to Supabase Storage with folder path
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('digital-files')
          .upload(filePath, file);

        if (uploadError) {
          // console.error removed
          throw new Error(`Storage upload failed: ${uploadError.message}. Please ensure the 'digital-files' storage bucket exists.`);
        }

        // Extract metadata
        const metadata = await extractFileMetadata(file);

        // Save file record to database with folder information
        const fileRecord = {
          filename: fileName,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          file_path: uploadData.path,
          category: getCategoryFromMimeType(file.type),
          is_public: false,
          uploaded_by: user.id,
          location: sanitizedFolderName, // Store folder name in location field
          ...metadata
        };

        const { error: dbError } = await supabase
          .from('digital_files')
          .insert(fileRecord);

        if (dbError) {
          // console.error removed
          throw new Error(`Database error: ${dbError.message}. Please ensure the 'digital_files' table exists.`);
        }

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      // Refresh files list
      await fetchFiles();
      setShowUploadModal(false);
      setUploadProgress(0);
      setFolderName('');
      setSelectedFilesForUpload(null);
    } catch (err: any) {
      // console.error removed
      setError(err.message || 'Failed to upload files. Please try again.');
    }
  };

  const extractFileMetadata = async (file: File): Promise<Partial<FileItem>> => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => resolve({});
        img.src = URL.createObjectURL(file);
      });
    }
    return {};
  };

  const getCategoryFromMimeType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    return 'other';
  };

  const handleIPTCUpdate = async (fileId: string, iptcData: IPTCData) => {
    try {
      const { error } = await supabase
        .from('digital_files')
        .update({
          description: iptcData.description,
          keywords: iptcData.keywords,
          copyright: iptcData.copyright,
          rating: iptcData.rating
        })
        .eq('id', fileId);

      if (error) throw error;
      
      // Refresh files list
      await fetchFiles();
      setShowMetadataModal(false);
    } catch (err) {
      // console.error removed
      setError('Failed to update metadata. Please try again.');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const handleBatchAction = async (action: string) => {
    if (selectedFiles.size === 0) return;

    try {
      const fileIds = Array.from(selectedFiles);
      
      switch (action) {
        case 'delete':
          for (const fileId of fileIds) {
            const file = files.find(f => f.id === fileId);
            if (file) {
              // Delete from storage
              await supabase.storage
                .from('digital-files')
                .remove([file.file_path]);
              
              // Delete from database
              await supabase
                .from('digital_files')
                .delete()
                .eq('id', fileId);
            }
          }
          break;
        
        case 'favorite':
          await supabase
            .from('digital_files')
            .update({ is_favorite: true })
            .in('id', fileIds);
          break;
        
        case 'unfavorite':
          await supabase
            .from('digital_files')
            .update({ is_favorite: false })
            .in('id', fileIds);
          break;
        
        case 'public':
          await supabase
            .from('digital_files')
            .update({ is_public: true })
            .in('id', fileIds);
          break;
        
        case 'private':
          await supabase
            .from('digital_files')
            .update({ is_public: false })
            .in('id', fileIds);
          break;
      }

      // Refresh files list
      await fetchFiles();
      setSelectedFiles(new Set());
    } catch (err) {
      // console.error removed
      setError('Failed to perform action. Please try again.');
    }
  };

  const getFileIcon = (mimeType: string, size = 20) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={size} />;
    if (mimeType.startsWith('video/')) return <Video size={size} />;
    if (mimeType.startsWith('audio/')) return <Music size={size} />;
    if (mimeType.includes('pdf')) return <FileText size={size} />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive size={size} />;
    return <File size={size} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStars = (rating: number = 0) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star}
            size={16}
            className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('admin.digitalFiles')}</h1>
            <p className="text-gray-600">Professional digital asset management with IPTC metadata support</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={20} className="mr-2" />
              {t('file.upload')}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center"
            >
              {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('action.search') + ' files...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            >
              <option value="all">{t('common.all')} Categories</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
              <option value="audio">Audio</option>
              <option value="archive">Archives</option>
              <option value="other">Other</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            >
              <option value="created_at">{t('common.date')}</option>
              <option value="filename">Filename</option>
              <option value="size">File Size</option>
              <option value="rating">Rating</option>
              <option value="views">Views</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              <span className="ml-2">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </button>
          </div>
        </div>

        {/* Batch Actions */}
        {selectedFiles.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBatchAction('favorite')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                  <Heart size={14} className="mr-1" />
                  Favorite
                </button>
                <button
                  onClick={() => handleBatchAction('public')}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                  <Share2 size={14} className="mr-1" />
                  Make Public
                </button>
                <button
                  onClick={() => handleBatchAction('delete')}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                  <Trash2 size={14} className="mr-1" />
                  {t('action.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Files Display */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">{t('message.loading')}</span>
          </div>
        ) : filteredFiles.length > 0 ? (
          <>
            {/* Select All */}
            <div className="flex items-center mb-4">
              <button
                onClick={selectAllFiles}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                {selectedFiles.size === filteredFiles.length ? 
                  <CheckSquare size={16} className="mr-2" /> : 
                  <Square size={16} className="mr-2" />
                }
                Select All ({filteredFiles.length})
              </button>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredFiles.map(file => (
                  <div 
                    key={file.id}
                    className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
                      selectedFiles.has(file.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-3">
                      {/* Selection Checkbox */}
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => toggleFileSelection(file.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {selectedFiles.has(file.id) ? 
                            <CheckSquare size={16} className="text-purple-600" /> : 
                            <Square size={16} className="text-gray-400" />
                          }
                        </button>
                        {file.is_favorite && <Heart size={16} className="text-red-500 fill-current" />}
                      </div>

                      {/* File Preview */}
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {file.mime_type.startsWith('image/') ? (
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/digital-files/${file.file_path}`}
                            alt={file.original_filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="text-gray-400">
                            {getFileIcon(file.mime_type, 48)}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium truncate" title={file.original_filename}>
                          {file.original_filename}
                        </h4>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatFileSize(file.file_size)}</span>
                          {file.width && file.height && (
                            <span>{file.width}×{file.height}</span>
                          )}
                        </div>

                        {file.rating && (
                          <div className="flex items-center">
                            {renderStars(file.rating)}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-1 pt-2">
                          <button
                            onClick={() => {/* TODO: Preview file */}}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs flex items-center justify-center"
                          >
                            <Eye size={12} className="mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFile(file);
                              setShowMetadataModal(true);
                            }}
                            className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded text-xs flex items-center justify-center"
                          >
                            <Edit3 size={12} className="mr-1" />
                            IPTC
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedFiles.size === filteredFiles.length}
                          onChange={selectAllFiles}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dimensions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Camera
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFiles.map(file => (
                      <tr key={file.id} className={selectedFiles.has(file.id) ? 'bg-purple-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={() => toggleFileSelection(file.id)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {file.mime_type.startsWith('image/') ? (
                                <img
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/digital-files/${file.file_path}`}
                                  alt={file.original_filename}
                                  className="h-10 w-10 object-cover rounded"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                                  {getFileIcon(file.mime_type, 24)}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                {file.original_filename}
                                {file.is_favorite && <Heart size={14} className="ml-2 text-red-500 fill-current" />}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(file.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(file.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {file.width && file.height ? `${file.width}×${file.height}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {file.rating ? renderStars(file.rating) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {file.camera_make && file.camera_model ? 
                            `${file.camera_make} ${file.camera_model}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {/* TODO: Preview file */}}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFile(file);
                                setShowMetadataModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => {/* TODO: Download file */}}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <FileText size={48} />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('message.noData')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first digital asset to get started.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                {t('file.upload')}
              </button>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('file.upload')}</h3>
              
              {/* Folder Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Folder className="inline h-4 w-4 mr-1" />
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Enter folder name (e.g., 'Client Photos', 'Wedding 2024')"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Files will be organized in this folder for better management
                </p>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && setSelectedFilesForUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Images, videos, documents up to 50MB
                  </p>
                </label>
              </div>

              {/* Selected Files Display */}
              {selectedFilesForUpload && selectedFilesForUpload.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected files ({selectedFilesForUpload.length}):
                  </p>
                  <div className="max-h-24 overflow-y-auto text-xs text-gray-600">
                    {Array.from(selectedFilesForUpload).map((file, index) => (
                      <div key={index} className="py-1">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Uploading... {uploadProgress.toFixed(0)}%</p>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setFolderName('');
                    setSelectedFilesForUpload(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('action.cancel')}
                </button>
                {selectedFilesForUpload && selectedFilesForUpload.length > 0 && (
                  <button
                    onClick={() => handleFileUpload(selectedFilesForUpload)}
                    disabled={!folderName.trim() || uploadProgress > 0}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload to "{folderName.trim()}"
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IPTC Metadata Modal */}
        {showMetadataModal && selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                IPTC Metadata - {selectedFile.original_filename}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={iptcData.title || ''}
                        onChange={(e) => setIptcData({...iptcData, title: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        rows={3}
                        value={iptcData.description || ''}
                        onChange={(e) => setIptcData({...iptcData, description: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Keywords</label>
                      <input
                        type="text"
                        placeholder="Separate with commas"
                        value={iptcData.keywords?.join(', ') || ''}
                        onChange={(e) => setIptcData({...iptcData, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Copyright</label>
                      <input
                        type="text"
                        value={iptcData.copyright || ''}
                        onChange={(e) => setIptcData({...iptcData, copyright: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rating</label>
                      <select
                        value={iptcData.rating || 0}
                        onChange={(e) => setIptcData({...iptcData, rating: parseInt(e.target.value)})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      >
                        <option value={0}>No Rating</option>
                        <option value={1}>1 Star</option>
                        <option value={2}>2 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={5}>5 Stars</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Location Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <input
                        type="text"
                        value={iptcData.location || ''}
                        onChange={(e) => setIptcData({...iptcData, location: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={iptcData.city || ''}
                        onChange={(e) => setIptcData({...iptcData, city: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State/Province</label>
                      <input
                        type="text"
                        value={iptcData.state || ''}
                        onChange={(e) => setIptcData({...iptcData, state: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <input
                        type="text"
                        value={iptcData.country || ''}
                        onChange={(e) => setIptcData({...iptcData, country: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Info Display */}
              {selectedFile.camera_make && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Camera Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {selectedFile.camera_make && (
                      <div>
                        <span className="text-gray-500">Camera:</span>
                        <div className="font-medium">{selectedFile.camera_make} {selectedFile.camera_model}</div>
                      </div>
                    )}
                    {selectedFile.lens_model && (
                      <div>
                        <span className="text-gray-500">Lens:</span>
                        <div className="font-medium">{selectedFile.lens_model}</div>
                      </div>
                    )}
                    {selectedFile.focal_length && (
                      <div>
                        <span className="text-gray-500">Focal Length:</span>
                        <div className="font-medium">{selectedFile.focal_length}</div>
                      </div>
                    )}
                    {selectedFile.aperture && (
                      <div>
                        <span className="text-gray-500">Aperture:</span>
                        <div className="font-medium">{selectedFile.aperture}</div>
                      </div>
                    )}
                    {selectedFile.shutter_speed && (
                      <div>
                        <span className="text-gray-500">Shutter:</span>
                        <div className="font-medium">{selectedFile.shutter_speed}</div>
                      </div>
                    )}
                    {selectedFile.iso && (
                      <div>
                        <span className="text-gray-500">ISO:</span>
                        <div className="font-medium">{selectedFile.iso}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowMetadataModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('action.cancel')}
                </button>
                <button
                  onClick={() => handleIPTCUpdate(selectedFile.id, iptcData)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  {t('action.save')} Metadata
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ProDigitalFilesPage;
