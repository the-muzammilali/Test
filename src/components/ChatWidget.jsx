import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! How can I help you today?",
      isBot: true,
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getSessionId = () => {
    let sessionId = localStorage.getItem('custom_chat_widget_session_id')
    if (!sessionId) {
      sessionId = 'custom_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('custom_chat_widget_session_id', sessionId)
    }
    return sessionId
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const sessionId = getSessionId()
      const params = new URLSearchParams({
        sessionId: sessionId,
        action: 'sendMessage',
        chatInput: inputValue
      })

      const response = await fetch(`https://automationsystem.aistudio.itpyx.pk/webhook-test/9ed9aca2-e181-4d2a-8e97-d027755bd763?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()
      
      const botMessage = {
        id: Date.now() + 1,
        text: data.reply || 'Sorry, I encountered an error. Please try again.',
        isBot: true,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div id="custom-react-chat-widget-container" className="custom-react-chat-widget-container fixed bottom-4 right-4 z-50">
      {/* Chat Button */}
      {!isOpen && (
        <button
          id="custom-react-chat-widget-button"
          onClick={() => setIsOpen(true)}
          className="custom-react-chat-widget-button bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div id="custom-react-chat-widget-window" className="custom-react-chat-widget-window bg-white rounded-lg shadow-2xl w-80 sm:w-96 h-96 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div id="custom-react-chat-widget-header" className="custom-react-chat-widget-header bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 id="custom-react-chat-widget-title" className="custom-react-chat-widget-title font-semibold">Chat with us</h3>
            <button
              id="custom-react-chat-widget-close-button"
              onClick={() => setIsOpen(false)}
              className="custom-react-chat-widget-close-button text-white hover:text-gray-200 transition-colors focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div id="custom-react-chat-widget-messages-area" className="custom-react-chat-widget-messages-area flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`custom-react-chat-widget-message-container flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`custom-react-chat-widget-message max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isBot
                      ? 'bg-gray-200 text-gray-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  <p className="custom-react-chat-widget-message-text text-sm">{message.text}</p>
                  <p className="custom-react-chat-widget-message-time text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div id="custom-react-chat-widget-loading-container" className="custom-react-chat-widget-loading-container flex justify-start">
                <div className="custom-react-chat-widget-loading-message bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center space-x-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="custom-react-chat-widget-loading-text text-sm">Typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div id="custom-react-chat-widget-input-area" className="custom-react-chat-widget-input-area p-4 border-t border-gray-200">
            <div id="custom-react-chat-widget-input-container" className="custom-react-chat-widget-input-container flex space-x-2">
              <input
                id="custom-react-chat-widget-message-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="custom-react-chat-widget-message-input flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                id="custom-react-chat-widget-send-button"
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="custom-react-chat-widget-send-button bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatWidget
