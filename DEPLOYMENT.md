# 🚀 Secure Deployment Guide

This guide walks you through deploying the secure ChatBot system with proper security measures.

## 📋 Prerequisites

### Required Services
- **Node.js** (v18 or higher)
- **Firebase Project** with Realtime Database and Authentication
- **SSL Certificate** for HTTPS
- **Domain Name** for production deployment

### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Realtime Database**
3. Enable **Authentication** with Email/Password provider
4. Generate **Service Account Key** for Admin SDK

## 🔧 Backend Deployment

### 1. Environment Configuration

Create `backend/.env` with your secure credentials:

```bash
# Server Configuration
PORT=3001
NODE_ENV=production
API_BASE_URL=https://your-api-domain.com

# Security Keys (GENERATE UNIQUE VALUES!)
JWT_SECRET=$(openssl rand -base64 64)
API_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Firebase Admin SDK (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Webhook Configuration
WEBHOOK_URL=https://automationsystem.aistudio.itpyx.pk/webhook/9ed9aca2-e181-4d2a-8e97-d027755bd763
WEBHOOK_SECRET=your-webhook-secret-key
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Create Admin User

Generate password hash for admin user:

```bash
node -e "
const bcrypt = require('bcryptjs');
const password = 'YourSecurePassword123!';
const hash = bcrypt.hashSync(password, 10);
console.log('Password hash:', hash);
"
```

Update `backend/src/routes/admin.js` with the new hash.

### 4. Start Backend Server

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Verify Backend

Test the API endpoints:

```bash
# Health check
curl https://your-api-domain.com/health

# API test
curl -X POST https://your-api-domain.com/api/chat/session \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"sessionId": "test_session_123", "userInfo": {}}'
```

## 🌐 Frontend Deployment

### 1. Environment Configuration

Create `.env.production`:

```bash
VITE_API_BASE_URL=https://your-api-domain.com
VITE_API_KEY=your-frontend-api-key
```

### 2. Build Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 3. Deploy Static Files

Deploy the `dist` folder to your web server or CDN:

- **Netlify**: Connect GitHub repo and auto-deploy
- **Vercel**: Import project and deploy
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Traditional Hosting**: Upload to web server

## 🔒 Firebase Security Configuration

### 1. Database Rules

Apply the security rules from `firebase-security-rules.json`:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init database

# Deploy rules
firebase deploy --only database
```

### 2. Authentication Setup

1. Go to Firebase Console → Authentication
2. Enable **Email/Password** provider
3. Add authorized domains for production
4. Configure password requirements

### 3. Admin User Setup

Create the admin user and set custom claims:

```javascript
// Run this script once to set up admin user
const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-default-rtdb.firebaseio.com'
});

// Create admin user
admin.auth().createUser({
  email: 'admin@yourdomain.com',
  password: 'SecurePassword123!',
  emailVerified: true
}).then((user) => {
  // Set admin custom claims
  return admin.auth().setCustomUserClaims(user.uid, { admin: true });
}).then(() => {
  console.log('Admin user created successfully');
});
```

## 🛡️ SSL/HTTPS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-api-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Update Backend for HTTPS

```javascript
// backend/src/server.js
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/your-domain/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/your-domain/fullchain.pem')
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS Server running on port 443');
});
```

## 🐳 Docker Deployment (Optional)

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY backend/src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

CMD ["node", "src/server.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  chatbot-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - chatbot-api
    restart: unless-stopped
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start backend/src/server.js --name chatbot-api

# Monitor
pm2 monit

# Logs
pm2 logs chatbot-api
```

### 2. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/chatbot

# Add configuration:
/var/log/chatbot/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reload chatbot-api
    endscript
}
```

### 3. Health Monitoring

Set up monitoring for:
- API endpoint availability
- Response times
- Error rates
- Database connections
- SSL certificate expiration

## 🔄 Backup Strategy

### 1. Firebase Backup

```bash
# Export Firebase data
firebase database:get / --output backup.json

# Schedule daily backups
0 2 * * * /usr/local/bin/firebase database:get / --output /backups/firebase-$(date +\%Y\%m\%d).json
```

### 2. Environment Backup

```bash
# Secure backup of environment files
tar -czf env-backup-$(date +%Y%m%d).tar.gz backend/.env
gpg --symmetric --cipher-algo AES256 env-backup-*.tar.gz
```

## 🚨 Security Checklist

### Pre-Deployment
- [ ] All default passwords changed
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firebase security rules applied
- [ ] Rate limiting configured
- [ ] CORS properly set up
- [ ] Input validation tested
- [ ] Error handling verified

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Log rotation set up
- [ ] Security headers verified
- [ ] Performance testing completed
- [ ] Penetration testing scheduled

## 📞 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check ALLOWED_ORIGINS in backend .env
   - Verify frontend API_BASE_URL

2. **Authentication Failures**
   - Verify Firebase service account key
   - Check admin custom claims

3. **Rate Limiting Issues**
   - Adjust rate limits in backend
   - Check client IP detection

4. **SSL Certificate Problems**
   - Verify certificate paths
   - Check certificate expiration

### Debug Commands

```bash
# Check API connectivity
curl -v https://your-api-domain.com/health

# Test authentication
curl -X POST https://your-api-domain.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@yourdomain.com", "password": "password"}'

# Monitor logs
pm2 logs chatbot-api --lines 100
```

## 📈 Performance Optimization

### Backend Optimization
- Enable gzip compression
- Implement caching strategies
- Optimize database queries
- Use connection pooling

### Frontend Optimization
- Minimize bundle size
- Implement lazy loading
- Use CDN for static assets
- Enable browser caching

---

## 🎯 Next Steps

After successful deployment:

1. **Monitor Performance**: Set up dashboards and alerts
2. **Security Audit**: Regular security assessments
3. **User Testing**: Validate functionality in production
4. **Documentation**: Update internal documentation
5. **Training**: Train team on new security procedures

For support during deployment, refer to the SECURITY.md file for security-specific guidance.
