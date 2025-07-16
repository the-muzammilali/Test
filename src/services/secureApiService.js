// Secure API service that communicates with backend
class SecureApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    this.apiKey = import.meta.env.VITE_API_KEY || 'chatbot-api-key-2024-secure-frontend-auth';
    this.adminToken = localStorage.getItem('admin_token');
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };

    // Add admin token if available
    if (this.adminToken && options.requiresAdmin) {
      defaultHeaders['Authorization'] = `Bearer ${this.adminToken}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Create a new chat session
   */
  async createChatSession(sessionId, userInfo = {}) {
    return this.makeRequest('/api/chat/session', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        userInfo: {
          url: window.location.href,
          timestamp: Date.now(),
          ...userInfo
        }
      })
    });
  }

  /**
   * Send message and get bot response
   */
  async sendMessage(sessionId, message) {
    return this.makeRequest('/api/chat/webhook', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        message
      })
    });
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId) {
    return this.makeRequest(`/api/chat/session/${sessionId}/messages`);
  }

  /**
   * Get session info
   */
  async getSession(sessionId) {
    return this.makeRequest(`/api/chat/session/${sessionId}`);
  }

  /**
   * Admin login
   */
  async adminLogin(email, password) {
    const response = await this.makeRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success && response.data.token) {
      this.adminToken = response.data.token;
      localStorage.setItem('admin_token', this.adminToken);
    }

    return response;
  }

  /**
   * Admin logout
   */
  adminLogout() {
    this.adminToken = null;
    localStorage.removeItem('admin_token');
  }

  /**
   * Verify admin token
   */
  async verifyAdminToken() {
    if (!this.adminToken) return false;

    try {
      const response = await this.makeRequest('/api/admin/verify', {
        requiresAdmin: true
      });
      return response.success;
    } catch (error) {
      this.adminLogout();
      return false;
    }
  }

  /**
   * Get all chat sessions (admin only)
   */
  async getAllSessions(includeUserInfo = false) {
    return this.makeRequest(`/api/admin/sessions?includeUserInfo=${includeUserInfo}`, {
      requiresAdmin: true
    });
  }

  /**
   * Get session with full details (admin only)
   */
  async getSessionDetails(sessionId, includeUserInfo = false) {
    return this.makeRequest(`/api/admin/session/${sessionId}?includeUserInfo=${includeUserInfo}`, {
      requiresAdmin: true
    });
  }

  /**
   * Send admin message
   */
  async sendAdminMessage(sessionId, text) {
    return this.makeRequest('/api/admin/message', {
      method: 'POST',
      requiresAdmin: true,
      body: JSON.stringify({
        sessionId,
        text
      })
    });
  }

  /**
   * Update session status (admin only)
   */
  async updateSessionStatus(sessionId, status) {
    return this.makeRequest(`/api/admin/session/${sessionId}/status`, {
      method: 'PUT',
      requiresAdmin: true,
      body: JSON.stringify({ status })
    });
  }

  /**
   * Get admin dashboard stats
   */
  async getAdminStats() {
    return this.makeRequest('/api/admin/stats', {
      requiresAdmin: true
    });
  }

  /**
   * Check if admin is authenticated
   */
  isAdminAuthenticated() {
    return !!this.adminToken;
  }

  /**
   * Set admin token (for external authentication)
   */
  setAdminToken(token) {
    this.adminToken = token;
    localStorage.setItem('admin_token', token);
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.makeRequest('/health');
  }
}

// Export singleton instance
export default new SecureApiService();
