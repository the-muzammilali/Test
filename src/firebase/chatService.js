import { database } from './config';
import { ref, push, set, onValue, off, query, orderByChild } from 'firebase/database';

// Chat service for Firebase Realtime Database operations
export class ChatService {
  constructor() {
    this.database = database;
  }

  // Create a new chat session
  async createChatSession(sessionId, userInfo = {}) {
    try {
      const chatSessionRef = ref(this.database, `chatSessions/${sessionId}`);
      const sessionData = {
        sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active', // active, closed, pending
        adminReplied: false,
        userInfo: {
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          url: window.location.href,
          ...userInfo
        },
        messages: {}
      };
      
      await set(chatSessionRef, sessionData);
      return sessionData;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  // Add a message to a chat session
  async addMessage(sessionId, messageData) {
    try {
      const messagesRef = ref(this.database, `chatSessions/${sessionId}/messages`);
      const messageRef = push(messagesRef);
      
      const message = {
        id: messageRef.key,
        text: messageData.text,
        isBot: messageData.isBot || false,
        isAdmin: messageData.isAdmin || false,
        adminId: messageData.adminId || null,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        ...messageData
      };

      await set(messageRef, message);
      
      // Update last activity
      const lastActivityRef = ref(this.database, `chatSessions/${sessionId}/lastActivity`);
      await set(lastActivityRef, Date.now());
      
      // If this is an admin message, update session status to show admin replied
      if (messageData.isAdmin) {
        const statusRef = ref(this.database, `chatSessions/${sessionId}/adminReplied`);
        await set(statusRef, true);
      }
      
      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  // Get all messages for a session
  async getMessages(sessionId) {
    try {
      return new Promise((resolve, reject) => {
        const messagesRef = ref(this.database, `chatSessions/${sessionId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'));
        
        onValue(messagesQuery, (snapshot) => {
          const messages = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
          }
          resolve(messages);
        }, reject);
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  // Listen to new messages in real-time
  listenToMessages(sessionId, callback) {
    const messagesRef = ref(this.database, `chatSessions/${sessionId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    onValue(messagesQuery, (snapshot) => {
      const messages = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          messages.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      callback(messages);
    });

    // Return unsubscribe function
    return () => off(messagesRef);
  }

  // Update chat session status
  async updateSessionStatus(sessionId, status) {
    try {
      const statusRef = ref(this.database, `chatSessions/${sessionId}/status`);
      await set(statusRef, status);
      
      const lastActivityRef = ref(this.database, `chatSessions/${sessionId}/lastActivity`);
      await set(lastActivityRef, Date.now());
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }

  // Get chat session info
  async getChatSession(sessionId) {
    try {
      return new Promise((resolve, reject) => {
        const sessionRef = ref(this.database, `chatSessions/${sessionId}`);
        onValue(sessionRef, (snapshot) => {
          if (snapshot.exists()) {
            resolve(snapshot.val());
          } else {
            resolve(null);
          }
        }, reject);
      });
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw error;
    }
  }

  // Get all chat sessions (for admin CRM)
  async getAllChatSessions() {
    try {
      return new Promise((resolve, reject) => {
        const sessionsRef = ref(this.database, 'chatSessions');
        const sessionsQuery = query(sessionsRef, orderByChild('lastActivity'));
        
        onValue(sessionsQuery, (snapshot) => {
          const sessions = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              sessions.push({
                sessionId: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
          }
          // Sort by last activity (most recent first)
          sessions.sort((a, b) => b.lastActivity - a.lastActivity);
          resolve(sessions);
        }, reject);
      });
    } catch (error) {
      console.error('Error getting all chat sessions:', error);
      throw error;
    }
  }

  // Listen to all chat sessions for real-time updates (for admin CRM)
  listenToAllSessions(callback) {
    const sessionsRef = ref(this.database, 'chatSessions');
    const sessionsQuery = query(sessionsRef, orderByChild('lastActivity'));
    
    onValue(sessionsQuery, (snapshot) => {
      const sessions = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          sessions.push({
            sessionId: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
      }
      // Sort by last activity (most recent first)
      sessions.sort((a, b) => b.lastActivity - a.lastActivity);
      callback(sessions);
    });

    // Return unsubscribe function
    return () => off(sessionsRef);
  }
}

// Export singleton instance
export const chatService = new ChatService();
