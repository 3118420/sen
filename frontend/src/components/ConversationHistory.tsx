import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Calendar, Trash2, Download } from 'lucide-react';
import { Conversation } from '../types';
import { conversationManager } from '../services/conversationManager';

interface ConversationHistoryProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  onConversationDelete: (conversationId: string) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  currentConversationId,
  onConversationSelect,
  onConversationDelete
}) => {
  const handleExport = (conversation: Conversation, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const exportData = conversationManager.exportConversation(conversation.id);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      onConversationDelete(conversationId);
    }
  };

  const getEmotionEmoji = (emotion?: string) => {
    const emojiMap: { [key: string]: string } = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      anxious: '😰',
      fear: '😨',
      love: '❤️',
      pride: '😤',
      relief: '😅'
    };
    return emotion ? emojiMap[emotion] || '😐' : '😐';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Conversation History</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {conversations.length} conversations
        </span>
      </div>

      <div className="space-y-3">
        {conversations.map((conversation, index) => (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              currentConversationId === conversation.id
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-white/10 dark:bg-black/10 border-white/20 dark:border-gray-800/50 hover:bg-white/20 dark:hover:bg-black/20'
            }`}
            onClick={() => onConversationSelect(conversation)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <MessageCircle size={16} className="text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                  <h3 className="font-medium text-gray-800 dark:text-white truncate">
                    {conversation.title}
                  </h3>
                  {conversation.emotionalSummary && (
                    <span className="ml-2 text-lg">
                      {getEmotionEmoji(conversation.emotionalSummary.dominantEmotion)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar size={14} className="mr-1" />
                  <span>{conversation.updatedAt.toLocaleDateString()}</span>
                  <span className="mx-2">•</span>
                  <span>{conversation.messages.length} messages</span>
                </div>

                {conversation.emotionalSummary && (
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="capitalize">
                      Dominant: {conversation.emotionalSummary.dominantEmotion}
                    </span>
                    <span className={`${
                      conversation.emotionalSummary.averageSentiment > 0.1 ? 'text-green-500' :
                      conversation.emotionalSummary.averageSentiment < -0.1 ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {conversation.emotionalSummary.averageSentiment > 0.1 ? 'Positive' :
                       conversation.emotionalSummary.averageSentiment < -0.1 ? 'Negative' : 'Neutral'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={(e) => handleExport(conversation, e)}
                  className="p-2 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                  title="Export conversation"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={(e) => handleDelete(conversation.id, e)}
                  className="p-2 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-red-500/20 transition-colors text-red-500"
                  title="Delete conversation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {conversations.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Start a conversation to see your history here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;