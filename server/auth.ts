import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { storage } from './storage';

// Session configuration
export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'photography-crm-session'
});

// Authentication middleware
export const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please log in to access this resource'
  });
};

// Optional authentication middleware (doesn't block unauthenticated users)
export const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Always continue, but req.session.userId will be undefined if not authenticated
  next();
};

// Check if user is authenticated
export const isAuthenticated = (req: express.Request): boolean => {
  return !!(req.session && req.session.userId);
};

// Get current admin user from session
export const getCurrentUser = async (req: express.Request) => {
  if (!req.session || !req.session.userId) {
    return null;
  }
  
  try {
    return await storage.getAdminUser(req.session.userId);
  } catch (error) {
    console.error('Error getting current admin user:', error);
    return null;
  }
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Login function
export const loginUser = async (email: string, password: string) => {
  try {
    // Get admin user by email
    const user = await storage.getAdminUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if user is active
    if (user.status !== 'active') {
      return { success: false, error: 'Account is deactivated. Please contact administrator.' };
    }

    // Update last login
    await storage.updateAdminUser(user.id, { 
      lastLoginAt: new Date() 
    });

    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'admin'
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

// Logout function
export const logoutUser = (req: express.Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Create admin user (for initial setup)
export const createAdminUser = async (email: string, password: string, firstName: string, lastName: string) => {
  try {
    // Check if admin already exists
    const existingUser = await storage.getAdminUserByEmail(email);
    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const adminUser = await storage.createAdminUser({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'admin',
      status: 'active'
    });

    return { 
      success: true, 
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role
      }
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error: 'Failed to create admin user' };
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    try {
      const user = await getCurrentUser(req);
      if (!user || !roles.includes(user.role || 'user')) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(['admin']);

// User or admin middleware
export const requireUserOrAdmin = requireRole(['user', 'admin']);

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}