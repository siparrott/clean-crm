import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdvancedRichTextEditor from './AdvancedRichTextEditor';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Send, 
  AlertCircle, 
  Check,
  FileText,
  Image as ImageIcon,
  Settings,
  Eye,
  Upload,
  Loader2,
  X,
  Plus
} from 'lucide-react';

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

type Step = 'content' | 'media' | 'meta' | 'preview';

const AdvancedBlogPostForm: React.FC<BlogPostFormProps> = ({ post, isEditing = false }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('content');
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    slug: '',
    excerpt: '',
    content_html: '',
    status: 'DRAFT',
    seo_title: '',
    meta_description: '',
    tags: [],
    scheduled_for: '',
    cover_image: ''
  });
  
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const steps = [
    { id: 'content', label: 'Content', icon: FileText, description: 'Write your blog post content' },
    { id: 'media', label: 'Media', icon: ImageIcon, description: 'Add cover image and media' },
    { id: 'meta', label: 'Meta', icon: Settings, description: 'SEO and publishing settings' },
    { id: 'preview', label: 'Preview', icon: Eye, description: 'Review and publish' }
  ];

  useEffect(() => {
    fetchTags();
    
    if (post && isEditing) {
      const mappedData = {
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content_html: post.content_html || '',
        status: post.status || 'DRAFT',
        seo_title: post.seo_title || '',
        meta_description: post.meta_description || '',
        tags: post.tags || [],
        scheduled_for: post.scheduled_for || '',
        cover_image: post.cover_image || '',
        id: post.id,
        author_id: post.author_id,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at
      };
      
      setFormData(mappedData);
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

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 60); // Limit length
  };

  const handleChange = (field: keyof BlogPost, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setImageUploading(true);
      setError(null);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `blog/covers/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      handleChange('cover_image', publicUrl);
    } catch (err) {
      // console.error removed
      setError('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag?.trim() && !selectedTags.includes(newTag.trim())) {
      const updatedTags = [...selectedTags, newTag.trim()];
      setSelectedTags(updatedTags);
      handleChange('tags', updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    const updatedTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(updatedTags);
    handleChange('tags', updatedTags);
  };

  const handleTagSelect = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      const updatedTags = [...selectedTags, tagName];
      setSelectedTags(updatedTags);
      handleChange('tags', updatedTags);
    }
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'content':
        return !!(formData.title?.trim() && formData.content_html?.trim());
      case 'media':
        return true; // Media is optional
      case 'meta':
        return !!(formData.excerpt?.trim());
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const canProceedToNext = () => {
    return validateStep(currentStep);
  };

  const getStepIndex = (step: Step) => {
    return steps.findIndex(s => s.id === step);
  };

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1 && canProceedToNext()) {
      setCurrentStep(steps[currentIndex + 1].id as Step);
    }
  };

  const prevStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step);
    }
  };

  const handleSubmit = async (publish = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const postData = {
        title: formData.title || '',
        slug: formData.slug || generateSlug(formData.title || ''),
        excerpt: formData.excerpt || '',
        content: formData.content_html || '',
        contentHtml: formData.content_html || '',
        imageUrl: formData.cover_image || '',
        published: publish || formData.status === 'PUBLISHED',
        metaDescription: formData.meta_description || '',
        seoTitle: formData.seo_title || '',
        tags: formData.tags || []
      };
      
      if (publish || formData.status === 'PUBLISHED') {
        postData.publishedAt = new Date().toISOString();
      }
      
      const response = await fetch(isEditing && post?.id ? `/api/blog/posts/${post.id}` : '/api/blog/posts', {
        method: isEditing && post?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // console.error removed
        throw new Error(errorData.error || 'Failed to save post');
      }
      
      setSuccessMessage(isEditing ? 'Post updated successfully!' : 'Post created successfully!');
      
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

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = validateStep(step.id as Step) && getStepIndex(currentStep) > index;
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                ${isActive 
                  ? 'bg-purple-600 border-purple-600 text-white' 
                  : isCompleted 
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }
              `}>
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 max-w-24">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderContentStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            handleChange('title', e.target.value);
            // Auto-generate slug if not manually set
            if (!formData.slug || formData.slug === generateSlug(formData.title || '')) {
              handleChange('slug', generateSlug(e.target.value));
            }
          }}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter your post title..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL Slug <span className="text-red-500">*</span>
          <span className="text-xs text-gray-500 ml-2">(Used in the post URL)</span>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 px-3 py-3 bg-gray-50 border border-gray-300 rounded-l-lg">
            /blog/
          </span>
          <input
            type="text"
            value={formData.slug || ''}
            onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="post-url-slug"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Only lowercase letters, numbers, and hyphens allowed. Auto-generated from title if left empty.
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content <span className="text-red-500">*</span>
        </label>
        <AdvancedRichTextEditor
          value={formData.content_html}
          onChange={(value) => handleChange('content_html', value)}
          placeholder="Start writing your blog post content..."
        />
      </div>
    </div>
  );

  const renderMediaStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image
        </label>
        {formData.cover_image ? (
          <div className="relative">
            <img
              src={formData.cover_image}
              alt="Cover preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              onClick={() => handleChange('cover_image', '')}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <label className="cursor-pointer">
                <span className="text-purple-600 hover:text-purple-700 font-medium">
                  Upload a cover image
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                  disabled={imageUploading}
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG, GIF up to 10MB
              </p>
              {imageUploading && (
                <div className="mt-4 flex items-center justify-center text-purple-600">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Uploading...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMetaStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.excerpt}
          onChange={(e) => handleChange('excerpt', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Brief summary of your post (recommended: 280 characters)"
        />
        <div className="text-right text-sm text-gray-500 mt-1">
          {formData.excerpt.length}/280 characters
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Add a tag..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add
            </button>
          </div>
          
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {availableTags.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Or select from existing tags:</p>
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter(tag => !selectedTags.includes(tag.name))
                  .slice(0, 10)
                  .map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagSelect(tag.name)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Publishing Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>
        </div>

        {formData.status === 'SCHEDULED' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publish Date
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_for ? new Date(formData.scheduled_for).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleChange('scheduled_for', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SEO Title
        </label>
        <input
          type="text"
          value={formData.seo_title || ''}
          onChange={(e) => handleChange('seo_title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="SEO optimized title (optional)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meta Description
        </label>
        <textarea
          value={formData.meta_description || ''}
          onChange={(e) => handleChange('meta_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="SEO meta description (optional)"
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview</h2>
        
        {formData.cover_image && (
          <img
            src={formData.cover_image}
            alt="Cover"
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{formData.title}</h1>
        
        {formData.excerpt && (
          <p className="text-lg text-gray-600 mb-6">{formData.excerpt}</p>
        )}
        
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedTags.map(tag => (
              <span 
                key={tag}
                className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: formData.content_html }}
        />
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'content':
        return renderContentStep();
      case 'media':
        return renderMediaStep();
      case 'meta':
        return renderMetaStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return renderContentStep();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start mb-6">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderCurrentStep()}
        
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={getStepIndex(currentStep) === 0}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </button>
          
          <div className="flex space-x-3">
            {currentStep === 'preview' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Publish Post
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToNext()}
                className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight size={16} className="ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedBlogPostForm;
