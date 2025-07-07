export interface TranscriptionResult {
  text: string;
  original_text?: string;
  language: string;
  language_name?: string;
  is_south_indian_language?: boolean;
  confidence: number;
  processing_time?: number;
  detected_language_info?: {
    language: string;
    confidence: number;
    all_probabilities: { [key: string]: number };
  };
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  processing_time?: number;
  language?: string;
  language_name?: string;
  method?: string;
}

export interface EmotionAnalysis {
  primary_emotion: string;
  emotion_scores: { [key: string]: number };
  confidence: number;
  category: string;  // positive, negative, neutral
  intensity: string; // low, medium, high
  top_emotions?: Array<{
    emotion: string;
    score: number;
    category: string;
    intensity: string;
  }>;
}

// Updated to match backend response structure with South Indian language support and precise emotions
export interface ProcessingResult {
  transcript: string;                    // matches backend
  original_transcript?: string;          // for South Indian languages
  transcript_confidence: number;         // matches backend
  language: string;                      // detected/specified language
  language_name?: string;                // human-readable language name
  is_south_indian_language?: boolean;    // enhanced support indicator
  sentiment: string;                     // matches backend
  sentiment_confidence: number;          // matches backend
  sentiment_scores: {                    // matches backend
    [key: string]: number;
  };
  processing_time: number;               // matches backend
  totalProcessingTime?: number;          // added by frontend
  detected_language_info?: {             // language detection details
    language: string;
    confidence: number;
    all_probabilities: { [key: string]: number };
  };
  sentiment_method?: string;             // sentiment analysis method used
  emotions?: EmotionAnalysis;            // precise emotion analysis
}

export interface LanguageDetectionResult {
  detected_language: string;
  confidence: number;
  language_name: string;
  is_south_indian: boolean;
  top_languages: { [key: string]: number };
}

export interface SupportedLanguages {
  speech_to_text: {
    all_languages: string[];
    south_indian_languages: { [key: string]: string };
    enhanced_support: string[];
  };
  sentiment_analysis: {
    supported_languages: { [key: string]: string };
    south_indian_languages: { [key: string]: string };
    multilingual_support: boolean;
  };
}

export interface SupportedEmotions {
  supported_emotions: string[];
  emotion_categories: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  intensity_levels: string[];
  models_loaded: {
    primary_emotion: boolean;
    multilingual: boolean;
  };
}

export type ProcessingStatus = 'idle' | 'recording' | 'uploading' | 'processing' | 'success' | 'error';

export interface Language {
  code: string;
  name: string;
  nativeName?: string;
  flag?: string;
  enhanced?: boolean;
}

// New types for conversational AI
export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  processingResult?: ProcessingResult;
  isTyping?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  emotionalSummary?: {
    dominantEmotion: string;
    averageSentiment: number;
    emotionDistribution: { [key: string]: number };
  };
}

export interface AIPersonality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
}

export interface VoiceSettings {
  enabled: boolean;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  aiPersonality: string;
  voiceSettings: VoiceSettings;
  showEmotionCharts: boolean;
  autoSpeak: boolean;
  language: string;
}

export interface EmotionalInsight {
  date: string;
  dominantEmotion: string;
  sentimentScore: number;
  conversationCount: number;
  emotionBreakdown: { [key: string]: number };
}

export interface WellnessRecommendation {
  type: 'breathing' | 'affirmation' | 'tip' | 'exercise';
  title: string;
  description: string;
  content: string;
  triggerEmotions: string[];
}