import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import firebaseAdmin from '../services/firebaseAdmin.js';
import { verifyAdminToken, generateAdminToken, createRateLimit, sanitizeInput } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for admin endpoints
const adminRateLimit = createRateLimit(60000, 20, 'Too many admin requests');
const loginRateLimit = createRateLimit(900000, 5, 'Too many login attempts');

/**
 * Admin login
 * POST /api/admin/login
 */
router.post('/login',
  loginRateLimit,
  sanitizeInput,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // For demo purposes, we'll use hardcoded credentials
      // In production, use proper user management
      const validEmail = 'test@gmail.com';
      const validPasswordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // Test@123

      if (email !== validEmail) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const isValidPassword = await bcrypt.compare(password, validPasswordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Set admin claims in Firebase
      try {
        await firebaseAdmin.setAdminClaims(email);
      } catch (claimsError) {
        console.log('Admin claims already set or user needs to be created');
      }

      // Generate JWT token
      const token = generateAdminToken({
        email,
        uid: 'admin-' + Date.now()
      });

      res.json({
        success: true,
        data: {
          token,
          admin: {
            email,
            role: 'admin'
          }
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
);

/**
 * Get all chat sessions (admin only)
 * GET /api/admin/sessions
 */
router.get('/sessions',
  adminRateLimit,
  verifyAdminToken,
  async (req, res) => {
    try {
      const includeUserInfo = req.query.includeUserInfo === 'true';
      const sessions = await firebaseAdmin.getAllChatSessions(includeUserInfo);

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }
);

/**
 * Get specific session with full details (admin only)
 * GET /api/admin/session/:sessionId
 */
router.get('/session/:sessionId',
  adminRateLimit,
  verifyAdminToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const includeUserInfo = req.query.includeUserInfo === 'true';
      
      const session = await firebaseAdmin.getChatSession(sessionId, includeUserInfo);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session'
      });
    }
  }
);

/**
 * Send admin message
 * POST /api/admin/message
 */
router.post('/message',
  adminRateLimit,
  verifyAdminToken,
  sanitizeInput,
  [
    body('sessionId').isString().isLength({ min: 10, max: 100 }),
    body('text').isString().isLength({ min: 1, max: 1000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { sessionId, text } = req.body;

      const messageData = {
        text,
        isBot: true,
        isAdmin: true,
        adminId: req.admin.email
      };

      const result = await firebaseAdmin.addMessage(sessionId, messageData);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Send admin message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  }
);

/**
 * Update session status (admin only)
 * PUT /api/admin/session/:sessionId/status
 */
router.put('/session/:sessionId/status',
  adminRateLimit,
  verifyAdminToken,
  sanitizeInput,
  [
    body('status').isIn(['active', 'closed', 'pending'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { status } = req.body;

      const result = await firebaseAdmin.updateSessionStatus(sessionId, status);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Update session status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update session status'
      });
    }
  }
);

/**
 * Get admin dashboard stats
 * GET /api/admin/stats
 */
router.get('/stats',
  adminRateLimit,
  verifyAdminToken,
  async (req, res) => {
    try {
      const sessions = await firebaseAdmin.getAllChatSessions(false);
      
      const stats = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.status === 'active').length,
        closedSessions: sessions.filter(s => s.status === 'closed').length,
        pendingSessions: sessions.filter(s => s.status === 'pending').length,
        adminRepliedSessions: sessions.filter(s => s.adminReplied).length,
        todaySessions: sessions.filter(s => {
          const today = new Date();
          const sessionDate = new Date(s.createdAt);
          return sessionDate.toDateString() === today.toDateString();
        }).length
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stats'
      });
    }
  }
);

/**
 * Verify admin token
 * GET /api/admin/verify
 */
router.get('/verify',
  verifyAdminToken,
  (req, res) => {
    res.json({
      success: true,
      data: {
        admin: req.admin,
        verified: true
      }
    });
  }
);

export default router;
