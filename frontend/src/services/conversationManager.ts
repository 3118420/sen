import { Message, Conversation, EmotionalInsight } from '../types';

class ConversationManager {
  private conversations: Conversation[] = [];
  private currentConversationId: string | null = null;

  constructor() {
    this.loadConversations();
  }

  private loadConversations() {
    try {
      const saved = localStorage.getItem('conversations');
      if (saved) {
        this.conversations = JSON.parse(saved).map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.conversations = [];
    }
  }

  private saveConversations() {
    try {
      localStorage.setItem('conversations', JSON.stringify(this.conversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }

  createConversation(title?: string): Conversation {
    const conversation: Conversation = {
      id: this.generateId(),
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.unshift(conversation);
    this.currentConversationId = conversation.id;
    this.saveConversations();
    
    return conversation;
  }

  getCurrentConversation(): Conversation | null {
    if (!this.currentConversationId) return null;
    return this.conversations.find(c => c.id === this.currentConversationId) || null;
  }

  setCurrentConversation(id: string) {
    this.currentConversationId = id;
  }

  addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const conversation = this.getCurrentConversation();
    if (!conversation) {
      throw new Error('No active conversation');
    }

    const newMessage: Message = {
      ...message,
      id: this.generateId(),
      timestamp: new Date()
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date();

    // Update conversation title based on first user message
    if (conversation.messages.length === 1 && message.type === 'user') {
      conversation.title = this.generateTitle(message.content);
    }

    // Update emotional summary
    this.updateEmotionalSummary(conversation);
    
    this.saveConversations();
    return newMessage;
  }

  updateMessage(messageId: string, updates: Partial<Message>) {
    const conversation = this.getCurrentConversation();
    if (!conversation) return;

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex !== -1) {
      conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        ...updates
      };
      conversation.updatedAt = new Date();
      this.saveConversations();
    }
  }

  getConversations(): Conversation[] {
    return [...this.conversations];
  }

  deleteConversation(id: string) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.currentConversationId === id) {
      this.currentConversationId = null;
    }
    this.saveConversations();
  }

  getConversationHistory(conversationId?: string): Array<{role: 'user' | 'assistant', content: string}> {
    const conversation = conversationId 
      ? this.conversations.find(c => c.id === conversationId)
      : this.getCurrentConversation();
    
    if (!conversation) return [];

    return conversation.messages.map(msg => ({
      role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    }));
  }

  private updateEmotionalSummary(conversation: Conversation) {
    const emotionCounts: { [key: string]: number } = {};
    let totalSentiment = 0;
    let sentimentCount = 0;

    conversation.messages.forEach(message => {
      if (message.processingResult?.emotions) {
        const emotion = message.processingResult.emotions.primary_emotion;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
      
      if (message.processingResult?.sentiment_confidence) {
        const sentimentValue = message.processingResult.sentiment === 'positive' ? 1 : 
                              message.processingResult.sentiment === 'negative' ? -1 : 0;
        totalSentiment += sentimentValue * message.processingResult.sentiment_confidence;
        sentimentCount++;
      }
    });

    if (Object.keys(emotionCounts).length > 0) {
      const dominantEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0][0];

      conversation.emotionalSummary = {
        dominantEmotion,
        averageSentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
        emotionDistribution: emotionCounts
      };
    }
  }

  getEmotionalInsights(days: number = 7): EmotionalInsight[] {
    const insights: { [key: string]: EmotionalInsight } = {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.conversations
      .filter(conv => conv.updatedAt >= cutoffDate)
      .forEach(conversation => {
        const dateKey = conversation.updatedAt.toDateString();
        
        if (!insights[dateKey]) {
          insights[dateKey] = {
            date: dateKey,
            dominantEmotion: '',
            sentimentScore: 0,
            conversationCount: 0,
            emotionBreakdown: {}
          };
        }

        insights[dateKey].conversationCount++;
        
        if (conversation.emotionalSummary) {
          const summary = conversation.emotionalSummary;
          insights[dateKey].sentimentScore += summary.averageSentiment;
          
          Object.entries(summary.emotionDistribution).forEach(([emotion, count]) => {
            insights[dateKey].emotionBreakdown[emotion] = 
              (insights[dateKey].emotionBreakdown[emotion] || 0) + count;
          });
        }
      });

    // Calculate averages and dominant emotions
    Object.values(insights).forEach(insight => {
      if (insight.conversationCount > 0) {
        insight.sentimentScore /= insight.conversationCount;
        
        const dominantEmotion = Object.entries(insight.emotionBreakdown)
          .sort(([,a], [,b]) => b - a)[0];
        
        if (dominantEmotion) {
          insight.dominantEmotion = dominantEmotion[0];
        }
      }
    });

    return Object.values(insights).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateTitle(content: string): string {
    const words = content.split(' ').slice(0, 6);
    return words.join(' ') + (content.split(' ').length > 6 ? '...' : '');
  }

  exportConversation(conversationId: string): string {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return '';

    const exportData = {
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        emotions: msg.processingResult?.emotions?.primary_emotion,
        sentiment: msg.processingResult?.sentiment
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const conversationManager = new ConversationManager();