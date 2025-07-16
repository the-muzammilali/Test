import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import firebaseAdmin from '../services/firebaseAdmin.js';

dotenv.config();

/**
 * Verify API Key for frontend requests
 */
export const verifyApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    next();
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Verify JWT token for admin requests
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Admin token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify admin status in Firebase
    const isAdmin = await firebaseAdmin.verifyAdminUser(decoded.email);
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Admin token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Generate JWT token for admin
 */
export const generateAdminToken = (adminData) => {
  try {
    const payload = {
      email: adminData.email,
      uid: adminData.uid,
      admin: true,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'chatbot-api',
      audience: 'chatbot-admin'
    });
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

/**
 * Rate limiting middleware
 */
export const createRateLimit = (windowMs, max, message) => {
  const requests = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    for (const [id, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(id);
      } else {
        requests.set(id, validTimestamps);
      }
    }

    // Check current client
    const clientRequests = requests.get(clientId) || [];
    const recentRequests = clientRequests.filter(time => time > windowStart);

    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        error: message || 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    requests.set(clientId, recentRequests);

    next();
  };
};

/**
 * Session validation middleware
 */
export const validateSession = (req, res, next) => {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }

    // Validate session ID format
    const sessionPattern = /^custom_session_\d+_[a-zA-Z0-9]+$/;
    if (!sessionPattern.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      });
    }

    req.sessionId = sessionId;
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Session validation error'
    });
  }
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize common fields
    if (req.body.text) {
      req.body.text = req.body.text.trim().substring(0, 1000); // Limit message length
    }
    
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase().trim();
    }

    // Remove potentially dangerous fields
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(500).json({
      success: false,
      error: 'Input processing error'
    });
  }
};

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  maxAge: 86400 // 24 hours
};
