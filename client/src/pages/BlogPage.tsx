import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { Calendar, ChevronRight, Tag, Search, Loader2 } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  contentHtml?: string;
  imageUrl?: string;
  published: boolean;
  authorId: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

const BlogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const tag = searchParams.get('tag') || '';
  const search = searchParams.get('search') || '';
  
  useEffect(() => {
    fetchData();
  }, [page, tag, search]);

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Blog - Fotografie Tipps & Inspiration | New Age Fotografie Wien';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Fotografie-Blog mit Tipps für Familienfotos, Neugeborenenbilder und Schwangerschaftsfotos. Inspiration und Beratung vom Wiener Familienfotograf.');

    // Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Fotografie Blog - New Age Fotografie Wien');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('published', 'true');
      if (tag) params.append('tag', tag);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', '10');
      
      // Fetch posts from our backend API
      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      
      const data = await response.json();
      const postsData = data.posts || [];
      

      
      setPosts(postsData);
      setTotalPosts(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));
      
      // For now, we'll handle tags separately since we don't have a tags API yet
      if (tags.length === 0 && postsData.length > 0) {
        // Extract unique tags from posts
        const allTags = postsData.flatMap((post: any) => post.tags || []);
        const uniqueTags = [...new Set(allTags)].map(tag => ({ id: tag, name: tag, slug: tag }));
        setTags(uniqueTags);
      }
    } catch (err) {
      // console.error removed
      setError('Failed to load blog posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (e.target.value) {
      newSearchParams.set('search', e.target.value);
    } else {
      newSearchParams.delete('search');
    }
    newSearchParams.set('page', '1'); // Reset to first page on new search
    setSearchParams(newSearchParams);
  };
  
  const handleTagClick = (tagSlug: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (tagSlug === tag) {
      newSearchParams.delete('tag');
    } else {
      newSearchParams.set('tag', tagSlug);
    }
    newSearchParams.set('page', '1'); // Reset to first page on tag change
    setSearchParams(newSearchParams);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Fotografie Blog - Tipps & Inspiration
            </h1>
            <p className="text-purple-100 text-lg">
              Entdecken Sie Fotografie-Tipps, Behind-the-Scenes und Inspiration für perfekte Familienfotos
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search blog posts..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                <span className="ml-2 text-gray-600">Loading posts...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {posts.map(post => (
                  <article 
                    key={post.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1"
                  >
                    <Link to={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden bg-gray-100">
                      {post.imageUrl ? (
                        <img 
                          src={post.imageUrl} 
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            // console.error removed
                            // Hide broken image and show placeholder
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector('.placeholder-shown')) {
                              parent.innerHTML = `
                                <div class="placeholder-shown w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                                  <div class="text-center">
                                    <svg class="w-12 h-12 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <p class="text-purple-600 text-sm font-medium">${post.title.substring(0, 30)}...</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <p className="text-purple-600 text-sm font-medium">{post.title.substring(0, 30)}...</p>
                          </div>
                        </div>
                      )}
                    </Link>
                    
                    <div className="p-6">
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center mb-3">
                          <Tag size={16} className="text-purple-600 mr-2" />
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tagName, index) => {
                              const tagObj = tags.find(t => t.name === tagName);
                              return tagObj ? (
                                <span 
                                  key={index}
                                  className="text-sm text-purple-600 cursor-pointer hover:text-purple-800"
                                  onClick={() => handleTagClick(tagObj.slug)}
                                >
                                  {tagName}
                                  {index < post.tags!.length - 1 && ", "}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                        <Link to={`/blog/${post.slug}`} className="hover:text-purple-600 transition-colors">
                          {post.title}
                        </Link>
                      </h2>
                      
                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center text-sm text-gray-500 mb-3 gap-4">
                        {post.publishedAt && (
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(post.publishedAt)}
                          </div>
                        )}
                      </div>
                      
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm inline-flex items-center"
                      >
                        Read more
                        <ChevronRight size={16} className="ml-1" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">No posts found</h2>
                <p className="text-gray-600 mb-4">
                  {search || tag 
                    ? "No posts match your search criteria. Try adjusting your filters."
                    : "We haven't published any blog posts yet. Check back soon!"}
                </p>
                {(search || tag) && (
                  <button
                    onClick={() => {
                      setSearchParams(new URLSearchParams());
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="inline-flex rounded-md shadow">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.set('page', (page - 1).toString());
                        setSearchParams(newSearchParams);
                      }
                    }}
                    disabled={page === 1}
                    className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 ${
                      page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.set('page', pageNum.toString());
                        setSearchParams(newSearchParams);
                      }}
                      className={`px-4 py-2 text-sm font-medium ${
                        pageNum === page
                          ? 'bg-purple-600 text-white border border-purple-600'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => {
                      if (page < totalPages) {
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.set('page', (page + 1).toString());
                        setSearchParams(newSearchParams);
                      }
                    }}
                    disabled={page === totalPages}
                    className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 ${
                      page === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Tags */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Categories</h2>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleTagClick('')}
                    className={`flex items-center text-gray-600 hover:text-purple-600 transition-colors ${
                      tag === '' ? 'text-purple-600 font-medium' : ''
                    }`}
                  >
                    <ChevronRight size={16} className="mr-2" />
                    All Categories
                  </button>
                </li>
                {tags.map((tagItem) => (
                  <li key={tagItem.id}>
                    <button
                      onClick={() => handleTagClick(tagItem.slug)}
                      className={`flex items-center text-gray-600 hover:text-purple-600 transition-colors ${
                        tag === tagItem.slug ? 'text-purple-600 font-medium' : ''
                      }`}
                    >
                      <ChevronRight size={16} className="mr-2" />
                      {tagItem.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Signup */}
            <div className="bg-purple-50 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Newsletter</h2>
              <p className="text-gray-600 mb-4">
                Stay updated with our latest photography tips and special offers.
              </p>
              <form className="space-y-4">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BlogPage;