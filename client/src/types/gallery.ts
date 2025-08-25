export interface Gallery {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage: string | null;
  isPublic?: boolean;
  isPasswordProtected?: boolean;
  password?: string | null;
  clientId?: string;
  createdBy?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  downloadEnabled?: boolean;
  watermarkEnabled?: boolean;
  maxDownloadsPerVisitor?: number;
  expiresAt?: string;
  clientEmail?: string;
  isFeatured?: boolean;
}

export interface GalleryImage {
  id: string;
  galleryId: string;
  originalUrl: string;
  displayUrl: string;
  thumbUrl: string;
  filename: string;
  title?: string;
  description?: string;
  altText?: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  contentType: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  capturedAt: string | null;
  orderIndex: number;
  isFeatured?: boolean;
  downloadCount?: number;
  viewCount?: number;
  favoriteCount?: number;
  createdAt: string;
  uploadedAt?: string;
  sharedToTogninja?: boolean;
  isFavorite?: boolean;
}

export interface GalleryVisitor {
  id: string;
  galleryId: string;
  name?: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  accessToken: string;
  passwordAttempts?: number;
  lastAccess?: string;
  totalVisits?: number;
  totalDownloads?: number;
  isBlocked?: boolean;
  notes?: string;
  createdAt: string;
}

export interface ImageAction {
  id: string;
  visitorId: string;
  imageId: string;
  action: 'VIEW' | 'FAVORITE' | 'DOWNLOAD';
  createdAt: string;
}

export interface GalleryStats {
  totalVisitors: number;
  uniqueVisitors: number;
  totalViews: number;
  totalFavorites: number;
  totalDownloads: number;
  totalImages: number;
  dailyStats: {
    date: string;
    views: number;
    favorites: number;
    downloads: number;
  }[];
  topImages: {
    imageId: string;
    thumbUrl: string;
    views: number;
    favorites: number;
    downloads: number;
  }[];
}

export interface GalleryFormData {
  title: string;
  description?: string;
  password?: string;
  downloadEnabled: boolean;
  watermarkEnabled?: boolean;
  expiresAt?: string;
  clientEmail?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  coverImage?: File | null;
  clientId?: string;
  isPublic?: boolean;
  isPasswordProtected?: boolean;
}

export interface GalleryAuthData {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface GalleryAccessLog {
  id: string;
  galleryId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
}