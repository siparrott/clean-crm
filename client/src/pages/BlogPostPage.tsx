import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { Calendar, ArrowLeft, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentHtml: string;
  imageUrl: string | null;
  publishedAt: string;
  excerpt: string | null;
  author: {
    email: string;
  } | null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
}

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (postSlug: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/blog/posts/${postSlug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Blog post not found');
        } else {
          setError('Failed to load blog post');
        }
        return;
      }
      
      const data = await response.json();
      setPost(data);
      
      // Fetch related posts
      fetchRelatedPosts(data.id);
    } catch (err) {
      // console.error removed
      setError('Failed to load blog post. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedPosts = async (currentPostId: string) => {
    try {
      const response = await fetch(`/api/blog/posts?published=true&limit=3&exclude=${currentPostId}`);
      
      if (response.ok) {
        const data = await response.json();
        setRelatedPosts(data.posts || []);
      }
    } catch (err) {
      // console.error removed
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {error || 'Blog post not found'}
            </h1>
            <p className="text-gray-600 mb-6">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to blog
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{post.title} | New Age Fotografie Blog</title>
        <meta name="description" content={post.excerpt || `Read about ${post.title}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || `Read about ${post.title}`} />
        {post.imageUrl && <meta property="og:image" content={post.imageUrl} />}
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://newagefotografie.com/blog/${post.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "image": post.imageUrl ? [post.imageUrl] : [],
            "datePublished": post.publishedAt,
            "dateModified": post.publishedAt,
            "author": {
              "@type": "Person",
              "name": "New Age Fotografie"
            },
            "publisher": {
              "@type": "Organization",
              "name": "New Age Fotografie",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.newagefotografie.com/logo.png"
              }
            },
            "description": post.excerpt || `Read about ${post.title}`
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <Link
          to="/blog"
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to blog
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* Post Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-gray-600 mb-6">
              <div className="flex items-center mr-6">
                <Calendar size={16} className="mr-1" />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
              
              {post.author && (
                <div className="flex items-center">
                  <span>By {post.author.email.split('@')[0]}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Cover Image */}
          {post.imageUrl && (
            <div className="mb-8">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full rounded-xl shadow-lg mb-8"
                loading="lazy"
                onError={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-48 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow-lg flex items-center justify-center">
                        <div class="text-center">
                          <svg class="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2V4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2z"></path>
                          </svg>
                          <p class="text-purple-600 font-medium">${post.title}</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          )}
          
          {/* Post Content */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
            {(post.contentHtml || post.content) ? (
              <div className="max-w-none">
                {/* Enhanced CSS for blog content */}
                <style dangerouslySetInnerHTML={{__html: `
                  .blog-post-content {
                    line-height: 1.8;
                    color: #374151;
                  }
                  .blog-post-content h1 {
                    font-size: 2.25rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin: 2rem 0 1rem 0;
                    padding-bottom: 0.5rem;
                    border-bottom: 3px solid #a855f7;
                  }
                  .blog-post-content h2 {
                    font-size: 1.875rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin: 2rem 0 1rem 0;
                    padding: 1rem 1.5rem;
                    border-left: 4px solid #a855f7;
                    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(168, 85, 247, 0.1);
                  }
                  .blog-post-content h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #374151;
                    margin: 1.5rem 0 0.75rem 0;
                  }
                  .blog-post-content p {
                    margin: 1rem 0;
                    text-align: justify;
                    line-height: 1.7;
                  }
                  .blog-post-content ul, .blog-post-content ol {
                    margin: 1rem 0;
                    padding-left: 2rem;
                  }
                  .blog-post-content ul {
                    list-style-type: disc;
                  }
                  .blog-post-content li {
                    margin: 0.5rem 0;
                    line-height: 1.6;
                  }
                  .blog-post-content img {
                    margin: 2rem auto;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    max-width: 100%;
                    height: auto;
                    display: block;
                  }
                  .blog-post-content blockquote {
                    border-left: 4px solid #a855f7;
                    background: #faf5ff;
                    padding: 1rem 1.5rem;
                    margin: 1.5rem 0;
                    border-radius: 0 8px 8px 0;
                    font-style: italic;
                  }
                  .blog-post-content strong {
                    font-weight: 700;
                    color: #1f2937;
                  }
                  .blog-post-content a {
                    color: #a855f7;
                    text-decoration: underline;
                    transition: color 0.2s ease;
                  }
                  .blog-post-content a:hover {
                    color: #9333ea;
                  }
                  .section-divider {
                    height: 1px;
                    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
                    margin: 3rem 0;
                  }
                `}} />
                <div 
                  className="blog-post-content prose prose-purple max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.contentHtml || post.content }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">Content Coming Soon</h3>
                <p className="text-gray-600 mb-4">
                  {post.excerpt || 'This blog post is being prepared. Please check back soon for the full content.'}
                </p>
                <Link 
                  to="/blog" 
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Blog
                </Link>
              </div>
            )}
          </div>
          
          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:-translate-y-1"
                  >
                    <div className="h-40 overflow-hidden">
                      {relatedPost.imageUrl ? (
                        <img
                          src={relatedPost.imageUrl}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // console.error removed
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.classList.add('bg-gray-200');
                            e.currentTarget.parentElement!.classList.add('flex');
                            e.currentTarget.parentElement!.classList.add('items-center');
                            e.currentTarget.parentElement!.classList.add('justify-center');
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Clock size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <span className="text-purple-600 text-sm">Read more</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BlogPostPage;