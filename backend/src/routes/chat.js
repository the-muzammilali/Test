import express from 'express';
import { body, validationResult } from 'express-validator';
import firebaseAdmin from '../services/firebaseAdmin.js';
import { verifyApiKey, validateSession, sanitizeInput, createRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for chat endpoints
const chatRateLimit = createRateLimit(60000, 30, 'Too many chat requests');

/**
 * Create a new chat session
 * POST /api/chat/session
 */
router.post('/session',
  chatRateLimit,
  verifyApiKey,
  sanitizeInput,
  [
    body('sessionId').isString().isLength({ min: 10, max: 100 }),
    body('userInfo').optional().isObject()
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

      const { sessionId, userInfo = {} } = req.body;

      // Add request metadata
      const enrichedUserInfo = {
        ...userInfo,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: Date.now(),
        origin: req.get('Origin') || req.get('Referer')
      };

      const result = await firebaseAdmin.createChatSession(sessionId, enrichedUserInfo);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  }
);

/**
 * Add a message to a chat session
 * POST /api/chat/message
 */
router.post('/message',
  chatRateLimit,
  verifyApiKey,
  sanitizeInput,
  [
    body('sessionId').isString().isLength({ min: 10, max: 100 }),
    body('text').isString().isLength({ min: 1, max: 1000 }),
    body('isBot').optional().isBoolean(),
    body('isAdmin').optional().isBoolean()
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

      const { sessionId, text, isBot = false, isAdmin = false } = req.body;

      const messageData = {
        text,
        isBot,
        isAdmin,
        adminId: isAdmin ? req.admin?.email : null
      };

      const result = await firebaseAdmin.addMessage(sessionId, messageData);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Add message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add message'
      });
    }
  }
);

/**
 * Get messages for a session
 * GET /api/chat/session/:sessionId/messages
 */
router.get('/session/:sessionId/messages',
  verifyApiKey,
  validateSession,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await firebaseAdmin.getMessages(sessionId);

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get messages'
      });
    }
  }
);

/**
 * Get session info
 * GET /api/chat/session/:sessionId
 */
router.get('/session/:sessionId',
  verifyApiKey,
  validateSession,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await firebaseAdmin.getChatSession(sessionId, false);

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
 * Send message to webhook and get response
 * POST /api/chat/webhook
 */
router.post('/webhook',
  chatRateLimit,
  verifyApiKey,
  sanitizeInput,
  [
    body('sessionId').isString(),
    body('message').isString().isLength({ min: 1, max: 1000 })
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

      const { sessionId, message } = req.body;

      // First, save user message
      await firebaseAdmin.addMessage(sessionId, {
        text: message,
        isBot: false
      });

      // Send to webhook
      const webhookUrl = process.env.WEBHOOK_URL;
      const params = new URLSearchParams({
        sessionId,
        action: 'sendMessage',
        chatInput: message
      });

      const response = await fetch(`${webhookUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ChatBot-API/1.0'
        }
      });

      const data = await response.json();
      const botReply = data.reply || 'Sorry, I encountered an error. Please try again.';

      // Save bot response
      await firebaseAdmin.addMessage(sessionId, {
        text: botReply,
        isBot: true
      });

      res.json({
        success: true,
        data: {
          userMessage: message,
          botReply: botReply
        }
      });
    } catch (error) {
      console.error('Webhook error:', error);
      
      // Save error message to chat
      try {
        await firebaseAdmin.addMessage(req.body.sessionId, {
          text: 'Sorry, I encountered an error. Please try again.',
          isBot: true
        });
      } catch (saveError) {
        console.error('Error saving error message:', saveError);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  }
);

export default router;
