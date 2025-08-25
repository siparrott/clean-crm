import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Save, Image, Tag, Clock } from 'lucide-react';

interface BlogPost {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content_html: string;
  cover_image?: string;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  seo_title?: string;
  meta_description?: string;
  author_id?: string;
  published_at?: string;
  scheduled_for?: string;
}

interface BlogPostFormProps {
  post?: BlogPost;
  isEditing?: boolean;
}

const BlogPostForm: React.FC<BlogPostFormProps> = ({ post, isEditing = false }) => {
  const navigate = useNavigate();  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    excerpt: '',
    content_html: '',
    status: 'DRAFT',
    seo_title: '',
    meta_description: '',
    tags: [],
    scheduled_for: '',
  });
  
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
    
    if (post && isEditing) {
      setFormData({
        ...post,
        tags: post.tags || [],
      });
      setSelectedTags(post.tags || []);
    }
  }, [post, isEditing]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setAvailableTags(data || []);
    } catch (err) {
      // console.error removed
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, content_html: e.target.value }));
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value && !selectedTags.includes(value)) {
      setSelectedTags(prev => [...prev, value]);
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), value] }));
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
    setFormData(prev => ({ 
      ...prev, 
      tags: (prev.tags || []).filter(t => t !== tag) 
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `blog/${fileName}`;
    
    setImageUploading(true);
      try {
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, cover_image: publicUrl }));
    } catch (err) {
      // console.error removed
      setError('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent, publishNow = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create or edit posts');
      }
      
      // Map form data to API format
      const apiData = {
        title: formData.title,
        excerpt: formData.excerpt,
        contentHtml: formData.content_html,
        coverImage: formData.cover_image,
        tags: formData.tags,
        status: publishNow ? 'PUBLISHED' : formData.status,
        seoTitle: formData.seo_title,
        metaDescription: formData.meta_description,
        publishedAt: publishNow ? new Date().toISOString() : formData.published_at,      } as any;
      
      if (isEditing && post?.id) {        // Update existing post
        const { error } = await supabase
          .from('blog_posts')
          .update({
            title: apiData.title,
            excerpt: apiData.excerpt,
            content_html: apiData.contentHtml,
            cover_image: apiData.coverImage,
            status: apiData.status,
            seo_title: apiData.seoTitle,
            meta_description: apiData.metaDescription,            tags: apiData.tags,
            published_at: apiData.status === 'PUBLISHED' ? apiData.publishedAt : null,
            scheduled_for: apiData.status === 'SCHEDULED' ? formData.scheduled_for : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)
          .select()
          .single();
          if (error) throw error;
        setSuccessMessage('Post updated successfully!');
      } else {        // Create new post
        const { error } = await supabase
          .from('blog_posts')
          .insert({
            title: apiData.title,
            slug: apiData.title?.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-') || '',
            excerpt: apiData.excerpt,
            content: apiData.contentHtml?.replace(/<[^>]*>/g, '') || '', // Strip HTML for plain text content
            content_html: apiData.contentHtml,
            cover_image: apiData.coverImage,
            status: apiData.status,
            author_id: user.id,
            seo_title: apiData.seoTitle,
            meta_description: apiData.metaDescription,            tags: apiData.tags || [],
            published_at: apiData.status === 'PUBLISHED' ? (apiData.publishedAt || new Date().toISOString()) : null,
            scheduled_for: apiData.status === 'SCHEDULED' ? formData.scheduled_for : null,
            view_count: 0
          })
          .select()
          .single();
          if (error) throw error;
        setSuccessMessage('Post created successfully!');
      }
      
      // Redirect after short delay to show success message
      setTimeout(() => {
        navigate('/admin/blog');
      }, 1500);
      
    } catch (err) {
      // console.error removed
      setError(err instanceof Error ? err.message : 'An error occurred while saving the post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Post Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter post title"
            />
          </div>
          
          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt <span className="text-gray-400">(recommended: 280 characters)</span>
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief summary of the post"
            />
          </div>
          
          {/* Content */}
          <div>
            <label htmlFor="content_html" className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content_html"
              name="content_html"
              value={formData.content_html}
              onChange={handleContentChange}
              required
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
              placeholder="<p>Your HTML content here...</p>"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter HTML content. Use &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, etc. for formatting.
            </p>
          </div>
        </div>
        
        <div className="md:col-span-1 space-y-6">          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="flex items-center">
              <Clock size={16} className="text-gray-400 mr-2" />
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
          </div>

          {/* Scheduled Date - only show when status is SCHEDULED */}
          {formData.status === 'SCHEDULED' && (
            <div>
              <label htmlFor="scheduled_for" className="block text-sm font-medium text-gray-700 mb-1">
                Publish Date
              </label>
              <input
                type="datetime-local"
                id="scheduled_for"
                name="scheduled_for"
                value={formData.scheduled_for ? new Date(formData.scheduled_for).toISOString().slice(0, 16) : ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          )}
          
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Image
            </label>
            <div className="mt-1 flex items-center">
              <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Image size={16} className="mr-2" />
                {imageUploading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                />
              </label>
            </div>
            {formData.cover_image && (
              <div className="mt-2">
                <img
                  src={formData.cover_image}
                  alt="Cover preview"
                  className="h-32 w-full object-cover rounded-lg"
                />
              </div>
            )}
          </div>
          
          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex items-center">
              <Tag size={16} className="text-gray-400 mr-2" />
              <select
                id="tags"
                name="tags"
                value=""
                onChange={handleTagChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select tags...</option>
                {availableTags.map(tag => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-500 focus:outline-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          {/* SEO Title */}
          <div>
            <label htmlFor="seo_title" className="block text-sm font-medium text-gray-700 mb-1">
              SEO Title
            </label>
            <input
              type="text"
              id="seo_title"
              name="seo_title"
              value={formData.seo_title || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="SEO optimized title (optional)"
            />
          </div>
          
          {/* Meta Description */}
          <div>
            <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description
            </label>
            <textarea
              id="meta_description"
              name="meta_description"
              value={formData.meta_description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="SEO meta description (optional)"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Save size={16} className="mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Post' : 'Save Draft'}
            </button>
            
            {formData.status !== 'PUBLISHED' && (
              <button
                type="button"
                disabled={loading}
                onClick={(e) => handleSubmit(e, true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Publishing...' : 'Publish Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default BlogPostForm;