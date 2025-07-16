import admin from 'firebase-admin';
import dotenv from 'dotenv';
import encryptionService from '../utils/encryption.js';

dotenv.config();

class FirebaseAdminService {
  constructor() {
    this.initializeFirebase();
    this.db = admin.database();
    this.auth = admin.auth();
  }

  initializeFirebase() {
    try {
      // Initialize Firebase Admin SDK with service account
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: `https://www.googleapis.com/oauth2/v1/certs`,
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }

      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      throw new Error('Failed to initialize Firebase Admin');
    }
  }

  /**
   * Create a new chat session
   */
  async createChatSession(sessionId, userInfo = {}) {
    try {
      // Encrypt sensitive user information
      const encryptedUserInfo = encryptionService.encryptUserInfo(userInfo);
      
      const sessionData = {
        sessionId,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        lastActivity: admin.database.ServerValue.TIMESTAMP,
        status: 'active',
        adminReplied: false,
        userInfo: encryptedUserInfo,
        messages: {}
      };

      await this.db.ref(`chatSessions/${sessionId}`).set(sessionData);
      return { success: true, sessionId };
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(sessionId, messageData) {
    try {
      // Sanitize message content
      const sanitizedText = encryptionService.sanitizeMessage(messageData.text);
      
      const messageRef = this.db.ref(`chatSessions/${sessionId}/messages`).push();
      const messageId = messageRef.key;

      const message = {
        id: messageId,
        text: sanitizedText,
        isBot: messageData.isBot || false,
        isAdmin: messageData.isAdmin || false,
        adminId: messageData.adminId || null,
        timestamp: admin.database.ServerValue.TIMESTAMP,
        createdAt: new Date().toISOString()
      };

      await messageRef.set(message);

      // Update last activity
      await this.db.ref(`chatSessions/${sessionId}/lastActivity`).set(admin.database.ServerValue.TIMESTAMP);

      // If admin message, mark as replied
      if (messageData.isAdmin) {
        await this.db.ref(`chatSessions/${sessionId}/adminReplied`).set(true);
      }

      return { success: true, messageId, message };
    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error('Failed to add message');
    }
  }

  /**
   * Get chat session with decrypted user info (admin only)
   */
  async getChatSession(sessionId, includeUserInfo = false) {
    try {
      const snapshot = await this.db.ref(`chatSessions/${sessionId}`).once('value');
      
      if (!snapshot.exists()) {
        return null;
      }

      const sessionData = snapshot.val();
      
      // Decrypt user info if requested and user has permission
      if (includeUserInfo && sessionData.userInfo) {
        sessionData.userInfo = encryptionService.decryptUserInfo(sessionData.userInfo);
      } else if (!includeUserInfo) {
        // Remove sensitive user info for regular requests
        delete sessionData.userInfo;
      }

      return sessionData;
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw new Error('Failed to get chat session');
    }
  }

  /**
   * Get all chat sessions (admin only)
   */
  async getAllChatSessions(includeUserInfo = false) {
    try {
      const snapshot = await this.db.ref('chatSessions').orderByChild('lastActivity').once('value');
      
      if (!snapshot.exists()) {
        return [];
      }

      const sessions = [];
      snapshot.forEach((childSnapshot) => {
        const sessionData = childSnapshot.val();
        
        // Decrypt user info if requested
        if (includeUserInfo && sessionData.userInfo) {
          sessionData.userInfo = encryptionService.decryptUserInfo(sessionData.userInfo);
        } else if (!includeUserInfo) {
          delete sessionData.userInfo;
        }

        sessions.push({
          sessionId: childSnapshot.key,
          ...sessionData
        });
      });

      // Sort by last activity (most recent first)
      return sessions.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
    } catch (error) {
      console.error('Error getting all chat sessions:', error);
      throw new Error('Failed to get chat sessions');
    }
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId) {
    try {
      const snapshot = await this.db.ref(`chatSessions/${sessionId}/messages`).orderByChild('timestamp').once('value');
      
      if (!snapshot.exists()) {
        return [];
      }

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new Error('Failed to get messages');
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId, status) {
    try {
      const updates = {
        status,
        lastActivity: admin.database.ServerValue.TIMESTAMP
      };

      await this.db.ref(`chatSessions/${sessionId}`).update(updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating session status:', error);
      throw new Error('Failed to update session status');
    }
  }

  /**
   * Verify admin user
   */
  async verifyAdminUser(email) {
    try {
      const user = await this.auth.getUserByEmail(email);
      
      // Check if user has admin custom claims
      const customClaims = user.customClaims || {};
      return customClaims.admin === true;
    } catch (error) {
      console.error('Error verifying admin user:', error);
      return false;
    }
  }

  /**
   * Set admin custom claims
   */
  async setAdminClaims(email) {
    try {
      const user = await this.auth.getUserByEmail(email);
      await this.auth.setCustomUserClaims(user.uid, { admin: true });
      return { success: true };
    } catch (error) {
      console.error('Error setting admin claims:', error);
      throw new Error('Failed to set admin claims');
    }
  }
}

export default new FirebaseAdminService();
