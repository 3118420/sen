import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, BarChart3, Globe, Zap } from 'lucide-react';
import { ProcessingResult } from '../types';
import EmotionDisplay from './EmotionDisplay';

interface ResultDisplayProps {
  result: ProcessingResult | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  if (!result) return null;

  const { 
    transcript, 
    original_transcript,
    language,
    language_name,
    is_south_indian_language,
    sentiment, 
    sentiment_scores, 
    totalProcessingTime,
    detected_language_info,
    sentiment_method,
    emotions
  } = result;
  
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      case 'neutral':
      default:
        return 'bg-blue-500';
    }
  };
  
  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      case 'neutral':
      default:
        return '😐';
    }
  };
  
  const formatConfidence = (value: number) => {
    return (value * 100).toFixed(1) + '%';
  };

  const getLanguageFlag = (langCode: string) => {
    const flags: { [key: string]: string } = {
      'ta': '🇮🇳',
      'te': '🇮🇳', 
      'kn': '🇮🇳',
      'ml': '🇮🇳',
      'hi': '🇮🇳',
      'en': '🇺🇸',
    };
    return flags[langCode] || '🌐';
  };

  // Split transcription into words for animation
  const words = transcript.split(' ');

  // Get confidence scores with fallbacks
  const positiveScore = sentiment_scores?.positive || sentiment_scores?.POSITIVE || 0;
  const neutralScore = sentiment_scores?.neutral || sentiment_scores?.NEUTRAL || 0;
  const negativeScore = sentiment_scores?.negative || sentiment_scores?.NEGATIVE || 0;

  return (
    <motion.div 
      className="w-full p-6 bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 dark:border-gray-800/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
        Analysis Results
      </h2>
      
      <div className="space-y-6">
        {/* Language Detection Info */}
        {(language || detected_language_info) && (
          <div>
            <div className="flex items-center mb-2">
              <Globe size={18} className="mr-2 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
                Language Detection
              </h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getLanguageFlag(language)}</span>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {language_name || language?.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Language: {language}
                    </p>
                  </div>
                </div>
                {is_south_indian_language && (
                  <div className="flex items-center">
                    <Zap size={16} className="mr-1 text-green-500" />
                    <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                      Enhanced Support
                    </span>
                  </div>
                )}
              </div>
              {detected_language_info && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Detection confidence: {formatConfidence(detected_language_info.confidence)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transcription */}
        <div>
          <div className="flex items-center mb-2">
            <MessageSquare size={18} className="mr-2 text-yellow-500" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Transcription
            </h3>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex flex-wrap gap-1">
              {words.map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {word}
                </motion.span>
              ))}
            </div>
            
            {/* Show original transcript if different (for South Indian languages) */}
            {original_transcript && original_transcript !== transcript && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Original transcription:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  {original_transcript}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Basic Sentiment Analysis */}
        <div>
          <div className="flex items-center mb-3">
            <BarChart3 size={18} className="mr-2 text-yellow-500" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Basic Sentiment Analysis
            </h3>
            {sentiment_method && (
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                {sentiment_method}
              </span>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
            <motion.div 
              className="flex-1 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <motion.div 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl ${getSentimentColor(sentiment)}`}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                {getSentimentEmoji(sentiment)}
              </motion.div>
              <div className="ml-4">
                <motion.p 
                  className="text-lg font-medium capitalize text-gray-800 dark:text-gray-200"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {sentiment}
                </motion.p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Overall sentiment
                </p>
              </div>
            </motion.div>
            
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Positive</span>
                    <motion.span 
                      className="font-medium text-gray-800 dark:text-gray-200"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      {formatConfidence(positiveScore)}
                    </motion.span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="bg-green-500 h-full rounded-full relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${positiveScore * 100}%` }}
                      transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-50"></div>
                    </motion.div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Neutral</span>
                    <motion.span 
                      className="font-medium text-gray-800 dark:text-gray-200"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                    >
                      {formatConfidence(neutralScore)}
                    </motion.span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="bg-blue-500 h-full rounded-full relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${neutralScore * 100}%` }}
                      transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-50"></div>
                    </motion.div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Negative</span>
                    <motion.span 
                      className="font-medium text-gray-800 dark:text-gray-200"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      {formatConfidence(negativeScore)}
                    </motion.span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="bg-red-500 h-full rounded-full relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${negativeScore * 100}%` }}
                      transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-50"></div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Precise Emotion Analysis */}
        {emotions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            <EmotionDisplay emotions={emotions} />
          </motion.div>
        )}
        
        {/* Processing Time */}
        <motion.div 
          className="flex items-center text-gray-600 dark:text-gray-400 mt-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          <Clock size={16} className="mr-1" />
          <span>
            Total processing time: <span className="font-medium">{totalProcessingTime?.toFixed(2) || '0.00'}s</span>
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ResultDisplay;