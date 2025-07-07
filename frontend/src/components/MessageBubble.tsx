import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Play, User, Bot } from 'lucide-react';
import { Message } from '../types';
import EmotionDisplay from './EmotionDisplay';

interface MessageBubbleProps {
  message: Message;
  onSpeak: (content: string, emotion?: string) => void;
  isSpeaking: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onSpeak, isSpeaking }) => {
  const isUser = message.type === 'user';
  const emotion = message.processingResult?.emotions?.primary_emotion;

  const handleSpeak = () => {
    onSpeak(message.content, emotion);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-yellow-500 text-white' 
              : 'bg-blue-500 text-white'
          }`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`relative px-4 py-3 rounded-2xl shadow-md ${
              isUser
                ? 'bg-yellow-500 text-white rounded-br-md'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Typing indicator */}
            {message.isTyping ? (
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">typing...</span>
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}

            {/* Audio playback for user messages */}
            {message.audioUrl && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <audio controls className="w-full h-8">
                  <source src={message.audioUrl} type="audio/webm" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Speak button for AI messages */}
            {!isUser && !message.isTyping && (
              <button
                onClick={handleSpeak}
                className="absolute -right-2 -bottom-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                title={isSpeaking ? "Stop speaking" : "Speak message"}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Emotion analysis for user messages */}
          {isUser && message.processingResult?.emotions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="mt-3 w-full"
            >
              <div className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-3 border border-white/20 dark:border-gray-800/50">
                <EmotionDisplay emotions={message.processingResult.emotions} compact />
              </div>
            </motion.div>
          )}

          {/* Language info for user messages */}
          {isUser && message.processingResult?.language && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <span className="mr-2">🌐</span>
              <span>
                {message.processingResult.language_name || message.processingResult.language}
                {message.processingResult.is_south_indian_language && (
                  <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                    Enhanced
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;