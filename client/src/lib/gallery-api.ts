import { 
  Gallery, 
  GalleryImage, 
  GalleryVisitor, 
  GalleryStats, 
  GalleryFormData,
  GalleryAuthData,
  GalleryAccessLog
} from '../types/gallery';

// Get all galleries (admin only)
export async function getGalleries(): Promise<Gallery[]> {
  try {
    const response = await fetch('/api/galleries');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const galleries = await response.json();
    return galleries;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get a single gallery by ID (admin only)
export async function getGalleryById(id: string): Promise<Gallery> {
  try {
    const response = await fetch(`/api/galleries/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get a single gallery by slug (public)
export async function getGalleryBySlug(slug: string): Promise<Gallery> {
  try {
    const response = await fetch(`/api/galleries/${slug}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Create a new gallery (admin only)
export async function createGallery(galleryData: GalleryFormData): Promise<Gallery> {
  try {
    // console.log removed
    
    // Handle cover image conversion to data URL if provided
    let coverImageUrl = null;
    if (galleryData.coverImage) {
      try {
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(galleryData.coverImage!);
        });
        
        coverImageUrl = await dataUrlPromise;
        // console.log removed
      } catch (uploadError) {
        // console.error removed
      }
    }

    // Generate slug from title
    const slug = galleryData.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // Prepare the data for the backend API
    const apiData = {
      title: galleryData.title,
      description: galleryData.description || null,
      slug: slug,
      coverImage: coverImageUrl,
      client_id: galleryData.clientId,
      is_public: galleryData.isPublic,
      is_password_protected: galleryData.isPasswordProtected,
      password: galleryData.password
    };

    // console.log removed

    const response = await fetch('/api/galleries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const gallery = await response.json();
    // console.log removed
    return gallery;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Update an existing gallery (admin only)
export async function updateGallery(id: string, galleryData: GalleryFormData): Promise<Gallery> {
  try {
    const response = await fetch(`/api/galleries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(galleryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update gallery');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Delete a gallery (admin only)
export async function deleteGallery(id: string): Promise<void> {
  try {
    // console.log removed
    
    const response = await fetch(`/api/galleries/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // console.log removed

    if (!response.ok) {
      const errorData = await response.text();
      // console.error removed
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const result = await response.json();
    // console.log removed
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Upload images to a gallery (admin only)
export async function uploadGalleryImages(galleryId: string, files: File[]): Promise<GalleryImage[]> {
  try {
    const formData = new FormData();
    formData.append('galleryId', galleryId);
    
    // Append each file to the form data
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await fetch(`/api/galleries/${galleryId}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload images');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get images for a gallery (admin only)
export async function getGalleryImages(galleryId: string): Promise<GalleryImage[]> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/images`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery images');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get gallery visitors (admin only)
export async function getGalleryVisitors(galleryId: string): Promise<GalleryVisitor[]> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/visitors`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery visitors');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get gallery access logs (admin only)
export async function getGalleryAccessLogs(galleryId: string): Promise<GalleryAccessLog[]> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/access-logs`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery access logs');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Update image order (admin only)
export async function updateImageOrder(galleryId: string, imageIds: string[]): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/images/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update image order');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Delete an image (admin only)
export async function deleteGalleryImage(imageId: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/images/${imageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete image');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Set gallery cover image (admin only)
export async function setGalleryCoverImage(galleryId: string, imageId: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/cover-image`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set cover image');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get gallery stats (admin only)
export async function getGalleryStats(galleryId: string): Promise<GalleryStats> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/stats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery stats');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// PUBLIC GALLERY ACCESS FUNCTIONS

// Authenticate to a gallery (public)
export async function authenticateGallery(slug: string, authData: GalleryAuthData): Promise<{ token: string }> {
  try {
    const response = await fetch(`/api/galleries/${slug}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get images for a public gallery (requires JWT)
export async function getPublicGalleryImages(slug: string, token: string): Promise<GalleryImage[]> {
  try {
    const response = await fetch(`/api/galleries/${slug}/images`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery images');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Toggle favorite status for an image (requires JWT)
export async function toggleImageFavorite(imageId: string, token: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/images/${imageId}/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle favorite status');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Download a gallery as ZIP (requires JWT)
export async function downloadGallery(slug: string, token: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/galleries/${slug}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download gallery');
    }

    return await response.blob();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get all public galleries (no authentication required)
export async function getPublicGalleries(limit?: number): Promise<Gallery[]> {
  try {
    const response = await fetch('/api/galleries');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const galleries = await response.json();
    
    // Apply limit if specified
    const result = limit ? galleries.slice(0, limit) : galleries;
    
    return result;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// HELPER FUNCTIONS

// Hash a password
async function hashPassword(password: string): Promise<string> {
  // In a real implementation, this would use bcrypt
  // For now, we'll just use a simple hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Upload a cover image for a gallery
async function uploadGalleryCoverImage(galleryId: string, file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('coverImage', file);
    
    const response = await fetch(`/api/galleries/${galleryId}/cover-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload cover image');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Helper function to map database schema (snake_case) to TypeScript interface (camelCase)
function mapDatabaseToGallery(dbGallery: any): Gallery {
  return {
    id: dbGallery.id,
    title: dbGallery.title,
    slug: dbGallery.slug || dbGallery.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-'),
    description: dbGallery.description,
    coverImage: dbGallery.cover_image || dbGallery.coverImage || null,
    isPublic: dbGallery.is_public ?? dbGallery.isPublic ?? true,
    isPasswordProtected: dbGallery.is_password_protected ?? dbGallery.isPasswordProtected ?? false,
    password: dbGallery.password || null,
    clientId: dbGallery.client_id || dbGallery.clientId,
    createdBy: dbGallery.created_by || dbGallery.createdBy,
    sortOrder: dbGallery.sort_order || dbGallery.sortOrder || 0,
    createdAt: dbGallery.created_at || dbGallery.createdAt,
    updatedAt: dbGallery.updated_at || dbGallery.updatedAt || dbGallery.created_at || dbGallery.createdAt
  };
}