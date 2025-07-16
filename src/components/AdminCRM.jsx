import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  Search, 
  Send, 
  LogOut,
  User,
  Globe,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { authService } from '../firebase/authService';
import { chatService } from '../firebase/chatService';

const AdminCRM = ({ onLogout }) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load chat sessions and listen for real-time updates
  useEffect(() => {
    const unsubscribe = chatService.listenToAllSessions((sessions) => {
      setChatSessions(sessions);
      setIsLoading(false);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  // Listen to messages for selected session
  useEffect(() => {
    if (selectedSession) {
      const unsubscribe = chatService.listenToMessages(selectedSession.sessionId, (firebaseMessages) => {
        const formattedMessages = firebaseMessages.map(msg => ({
          id: msg.id,
          text: msg.text,
          isBot: msg.isBot,
          timestamp: new Date(msg.timestamp),
          createdAt: msg.createdAt
        }));
        setMessages(formattedMessages);
      });

      return () => unsubscribe && unsubscribe();
    }
  }, [selectedSession]);

  const loadChatSessions = async () => {
    try {
      setIsLoading(true);
      const sessions = await chatService.getAllChatSessions();
      setChatSessions(sessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const sendAdminMessage = async () => {
    if (!newMessage.trim() || !selectedSession || isSending) return;

    setIsSending(true);
    try {
      await chatService.addMessage(selectedSession.sessionId, {
        text: newMessage,
        isBot: true,
        isAdmin: true,
        adminId: authService.getCurrentUser()?.email
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending admin message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAdminMessage();
    }
  };

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.userInfo?.userAgent || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSessionPreview = (session) => {
    if (!session.messages) return 'No messages yet';
    const messageKeys = Object.keys(session.messages);
    if (messageKeys.length === 0) return 'No messages yet';
    const lastMessageKey = messageKeys[messageKeys.length - 1];
    const lastMessage = session.messages[lastMessageKey];
    return lastMessage.text.length > 50 ? 
           lastMessage.text.substring(0, 50) + '...' : 
           lastMessage.text;
  };

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar - Chat Sessions List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Chat CRM</h1>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
              </select>
              
              <button
                onClick={loadChatSessions}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-blue-600 font-semibold text-sm">{filteredSessions.length}</div>
              <div className="text-blue-500 text-xs">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-green-600 font-semibold text-sm">
                {filteredSessions.filter(s => s.status === 'active').length}
              </div>
              <div className="text-green-500 text-xs">Active</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-gray-600 font-semibold text-sm">
                {filteredSessions.filter(s => s.status === 'closed').length}
              </div>
              <div className="text-gray-500 text-xs">Closed</div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
              <p>No chat sessions found</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => setSelectedSession(session)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedSession?.sessionId === session.sessionId ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <User size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        Session {session.sessionId.split('_')[2]?.substring(0, 6) || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock size={12} className="mr-1" />
                        {formatTime(session.lastActivity)}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    session.status === 'active' ? 'bg-green-100 text-green-800' :
                    session.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {getSessionPreview(session)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Chat Session: {selectedSession.sessionId.split('_')[2]?.substring(0, 8) || 'Unknown'}
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar size={14} className="mr-1" />
                    Started: {formatTime(selectedSession.createdAt)}
                    <Globe size={14} className="ml-4 mr-1" />
                    {selectedSession.userInfo?.url || 'Unknown URL'}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => chatService.updateSessionStatus(selectedSession.sessionId, 'closed')}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                  >
                    Close Chat
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isBot
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.isBot ? 'text-gray-500' : 'text-blue-100'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your reply..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  onClick={sendAdminMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Session Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat Session</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start managing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCRM;
