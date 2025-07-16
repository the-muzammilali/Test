import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-key-change-this-in-prod';
    
    // Ensure key is 32 bytes for AES-256
    this.key = crypto.scryptSync(this.secretKey, 'salt', 32);
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @returns {object} - Encrypted data with IV and auth tag
   */
  encrypt(text) {
    try {
      if (!text) return null;
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.key);
      cipher.setAAD(Buffer.from('chatbot-auth', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {object} encryptedData - Object with encrypted, iv, and authTag
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || !encryptedData.encrypted) return null;
      
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, this.key);
      
      decipher.setAAD(Buffer.from('chatbot-auth', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way)
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data
   */
  hash(data) {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error('Hashing error:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} - Random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt user information
   * @param {object} userInfo - User information object
   * @returns {object} - Encrypted user information
   */
  encryptUserInfo(userInfo) {
    const sensitiveFields = ['userAgent', 'ip', 'location'];
    const encrypted = { ...userInfo };
    
    sensitiveFields.forEach(field => {
      if (userInfo[field]) {
        encrypted[field] = this.encrypt(userInfo[field]);
      }
    });
    
    return encrypted;
  }

  /**
   * Decrypt user information
   * @param {object} encryptedUserInfo - Encrypted user information
   * @returns {object} - Decrypted user information
   */
  decryptUserInfo(encryptedUserInfo) {
    const sensitiveFields = ['userAgent', 'ip', 'location'];
    const decrypted = { ...encryptedUserInfo };
    
    sensitiveFields.forEach(field => {
      if (encryptedUserInfo[field] && typeof encryptedUserInfo[field] === 'object') {
        try {
          decrypted[field] = this.decrypt(encryptedUserInfo[field]);
        } catch (error) {
          console.error(`Failed to decrypt ${field}:`, error);
          decrypted[field] = '[Encrypted]';
        }
      }
    });
    
    return decrypted;
  }

  /**
   * Sanitize message content
   * @param {string} message - Message content
   * @returns {string} - Sanitized message
   */
  sanitizeMessage(message) {
    if (!message) return '';
    
    // Remove potential XSS and injection attempts
    return message
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}

export default new EncryptionService();
