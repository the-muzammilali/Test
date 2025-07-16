# Chat Widget & Admin CRM System

A comprehensive chat solution with a beautiful floating chat widget and a powerful admin CRM system for managing conversations. Built with React, Firebase, and Tailwind CSS.

## 🚀 Features

### Chat Widget
- 🎨 Beautiful, modern design with smooth animations
- 📱 Fully responsive for mobile and desktop
- 💬 Real-time chat interface with Firebase integration
- 🔄 Session persistence across page reloads
- 🚀 Built with React hooks and modern JavaScript
- 🎯 Integrates with webhook API for chat functionality
- 💾 All conversations stored in Firebase Realtime Database

### Admin CRM System
- 🔐 Firebase Authentication with secure login
- 📊 Real-time dashboard showing all chat sessions
- 💬 WhatsApp-style chat interface for admins
- 🔍 Search and filter conversations
- 📈 Session statistics and status tracking
- 👥 User information and session details
- ⚡ Real-time message updates
- 🎯 Admin reply functionality

## 🛠️ Technologies Used

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Firebase Realtime Database, Firebase Authentication
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS with custom animations

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatWidget.jsx          # Main chat widget component
│   ├── Admin.jsx               # Admin authentication wrapper
│   ├── AdminLogin.jsx          # Admin login form
│   └── AdminCRM.jsx            # Main CRM dashboard
├── firebase/
│   ├── config.js               # Firebase configuration
│   ├── authService.js          # Authentication service
│   ├── chatService.js          # Chat data service
│   └── setupTestUser.js        # Test user creation
├── App.jsx                     # Main app with routing
└── main.jsx                    # App entry point
```

## 🔧 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Firebase project with Realtime Database and Authentication enabled

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   - Update `.env` file with your Firebase credentials
   - Enable Authentication and Realtime Database in Firebase Console
   - Set up Authentication with Email/Password provider

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Main site: `http://localhost:5173/`
   - Admin CRM: `http://localhost:5173/admin`

## 🔐 Admin Access

### Test Credentials
- **Email**: `test@gmail.com`
- **Password**: `Test@123`

The test user is automatically created when you first access the admin panel.

## 🎯 Usage

### For Website Visitors
1. Click the floating chat button in the bottom-right corner
2. Start a conversation - messages are automatically saved
3. Session persists across page reloads

### For Administrators
1. Navigate to `/admin`
2. Login with admin credentials
3. View all chat sessions in real-time
4. Click on any session to view conversation
5. Reply to customers directly through the CRM
6. Monitor session status and user information

## 🔥 Firebase Data Structure

```
chatSessions/
└── {sessionId}/
    ├── sessionId: "custom_session_..."
    ├── createdAt: timestamp
    ├── lastActivity: timestamp
    ├── status: "active" | "closed" | "pending"
    ├── adminReplied: boolean
    ├── userInfo: {
    │   ├── userAgent: string
    │   ├── timestamp: number
    │   └── url: string
    │ }
    └── messages/
        └── {messageId}: {
            ├── id: string
            ├── text: string
            ├── isBot: boolean
            ├── isAdmin: boolean
            ├── adminId: string (if admin message)
            ├── timestamp: number
            └── createdAt: ISO string
          }
```

## 🌐 WordPress Integration

### Chat Widget
Use `standalone-chat.html` for WordPress integration:
1. Copy the HTML content
2. Paste into WordPress page/post
3. All elements have unique IDs to prevent conflicts

### Admin CRM
The React-based admin panel can be:
1. Hosted separately and accessed via `/admin`
2. Integrated into WordPress admin area
3. Used as a standalone application

## 🔧 Configuration

### Environment Variables (.env)
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Webhook Configuration
Update the webhook URL in both:
- `src/components/ChatWidget.jsx`
- `standalone-chat.html`

## 🚀 Deployment

### Frontend (Vite Build)
```bash
npm run build
```

### Firebase Rules
Set up appropriate security rules for your Firebase project:

**Realtime Database Rules:**
```json
{
  "rules": {
    "chatSessions": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$sessionId": {
        ".validate": "newData.hasChildren(['sessionId', 'createdAt'])"
      }
    }
  }
}
```

**Authentication Rules:**
- Enable Email/Password authentication
- Configure authorized domains

## 📊 Features in Detail

### Real-time Updates
- Messages appear instantly across all connected clients
- Session list updates in real-time for admins
- Status changes reflect immediately

### Session Management
- Automatic session creation and persistence
- Session status tracking (active/closed/pending)
- User information capture and storage

### Admin Features
- Search conversations by session ID or user agent
- Filter by session status
- Real-time message notifications
- Session statistics dashboard
- User activity tracking

## 🔒 Security Features

- Firebase Authentication for admin access
- Secure database rules
- Environment variable protection
- Input validation and sanitization
- CORS protection through Firebase

## 🎨 Customization

### Styling
- Tailwind CSS classes for easy customization
- Custom animations and transitions
- Responsive design patterns
- Dark/light theme ready

### Functionality
- Modular component architecture
- Easy webhook integration
- Configurable message formats
- Extensible admin features

## 📞 Support

For issues or questions:
1. Check Firebase Console for authentication/database issues
2. Verify environment variables are correctly set
3. Ensure webhook endpoints are accessible
4. Check browser console for JavaScript errors

## 🔄 Updates

The system automatically handles:
- Real-time message synchronization
- Session state management
- User presence tracking
- Admin notification systems
