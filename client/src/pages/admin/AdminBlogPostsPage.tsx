import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content_html: string;
  cover_image?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  published: boolean; // kept for compatibility
  author_id: string;
  published_at?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
}

const AdminBlogPostsPage: React.FC = () => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        if (statusFilter === 'published') {
          params.append('published', 'true');
        } else if (statusFilter === 'draft') {
          params.append('published', 'false');
        }
      }
      
      const response = await fetch(`/api/blog/posts?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      
      const data = await response.json();
      
      // Map the API response to match the expected format
      const mappedPosts = data.posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content_html: post.contentHtml || post.content,
        cover_image: post.imageUrl,
        status: post.published ? 'PUBLISHED' : 'DRAFT',
        published: post.published,
        author_id: post.authorId,
        published_at: post.publishedAt,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
        seo_title: post.seoTitle,
        meta_description: post.metaDescription,
        tags: post.tags || []
      }));
      
      // Filter by search term if present
      const filteredPosts = searchTerm 
        ? mappedPosts.filter((post: any) => 
            post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.content_html.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : mappedPosts;
      
      setPosts(filteredPosts);
      setTotalPosts(filteredPosts.length);
      setTotalPages(Math.ceil(filteredPosts.length / 10));
    } catch (err) {
      // console.error removed
      setError('Failed to load blog posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage, searchTerm]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/blog/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // Refresh posts after deletion
      fetchPosts();
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete post. Please try again.');
      setLoading(false);
    }
  };
  const handlePublishToggle = async (post: BlogPost) => {
    try {
      setLoading(true);

      const newPublished = !post.published;
      
      const response = await fetch(`/api/blog/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          published: newPublished,
          publishedAt: newPublished ? new Date().toISOString() : null
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post status');
      }
      
      // Refresh posts to get updated data
      fetchPosts();
    } catch (err) {
      // console.error removed
      setError('Failed to update post status. Please try again.');
      fetchPosts(); // Refresh to get correct state
    }
  };
  const getStatusBadge = (post: BlogPost) => {
    switch (post.status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" /> {t('status.published')}
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock size={12} className="mr-1" /> {t('status.scheduled')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock size={12} className="mr-1" /> {t('status.draft')}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('admin.blog')}</h1>
            <p className="text-gray-600">{t('blog.manage_content')}</p>
          </div>
          <Link
            to="/admin/blog/new"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus size={20} className="mr-2" />
            {t('blog.create')}
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />              <input
                type="text"
                placeholder={t('blog.search_posts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
              <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">{t('filter.all_statuses')}</option>
              <option value="published">{t('status.published')}</option>
              <option value="draft">{t('status.draft')}</option>
              <option value="scheduled">{t('status.scheduled')}</option>
            </select>

            <button 
              onClick={handleSearch}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={20} className="mr-2" />
              {t('action.filter')}
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('message.loading')}</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('blog.post')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('form.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('form.date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">                        <div className="flex items-center">
                          {post.cover_image ? (
                            <img
                              src={post.cover_image}
                              alt={post.title}
                              className="h-10 w-10 rounded-md object-cover mr-3"
                            />
                          ) : (                            <div className="h-10 w-10 rounded-md bg-gray-200 mr-3 flex items-center justify-center">
                              <span className="text-gray-500 text-xs">{t('blog.no_image')}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{post.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {post.excerpt || t('blog.no_excerpt')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(post)}
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.status === 'PUBLISHED' && post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : post.status === 'SCHEDULED' && post.scheduled_for
                          ? `${t('status.scheduled')}: ${new Date(post.scheduled_for).toLocaleDateString()}`
                          : new Date(post.created_at).toLocaleDateString() + ` (${t('status.draft')})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <Link
                            to={`/admin/blog/edit/${post.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title={t('action.edit')}
                          >
                            <Edit size={16} />
                          </Link>
                          
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                            title={t('action.view')}
                          >
                            <Eye size={16} />
                          </a>
                            <button
                            onClick={() => handlePublishToggle(post)}
                            className={`${
                              post.status === 'PUBLISHED'
                                ? 'text-orange-600 hover:text-orange-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={post.status === 'PUBLISHED' ? t('blog.unpublish') : t('blog.publish')}
                          >
                            {post.status === 'PUBLISHED' ? (
                              <Clock size={16} />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                            <button
                            onClick={() => setDeleteConfirmation(post.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('action.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">{t('blog.no_posts_found')}</p>
              <Link
                to="/admin/blog/new" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus size={16} className="mr-2" />
                {t('blog.create_first_post')}
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              {t('pagination.showing')} <span className="font-medium">{posts.length}</span> {t('pagination.of')}{' '}
              <span className="font-medium">{totalPosts}</span> {t('pagination.results')}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                {t('action.previous')}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    currentPage === page
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                {t('action.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('modal.confirm_deletion')}</h3>
            <p className="text-gray-500 mb-6">
              {t('modal.delete_post_warning')}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('action.cancel')}
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeletePost(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('action.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBlogPostsPage;