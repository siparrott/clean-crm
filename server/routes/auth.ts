import express from 'express';
import { z } from 'zod';
import { 
  sessionConfig,
  loginUser,
  logoutUser,
  createAdminUser,
  getCurrentUser,
  requireAuth,
  requireAdmin
} from '../auth';

const router = express.Router();

// Apply session middleware
router.use(sessionConfig);

// Login schema
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

// Register schema
const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required')
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const result = await loginUser(email, password);
    
    if (result.success && result.user) {
      // Set session
      req.session.userId = result.user.id;
      
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Login failed'
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Login route error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

// Register route (creates admin user)
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);
    
    const result = await createAdminUser(email, password, firstName, lastName);
    
    if (result.success && result.user) {
      res.json({
        success: true,
        message: 'Admin user created successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Registration failed'
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Register route error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

// Logout route
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await logoutUser(req);
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get current user route
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    
    if (user) {
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          lastLoginAt: user.lastLoginAt
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Check auth status
router.get('/status', (req, res) => {
  const isAuthenticated = !!(req.session && req.session.userId);
  
  res.json({
    isAuthenticated,
    sessionId: req.session?.id || null
  });
});

export default router;