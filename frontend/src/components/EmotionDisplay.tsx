import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Frown, Smile, Meh, AlertTriangle, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

interface EmotionData {
  primary_emotion: string;
  emotion_scores: { [key: string]: number };
  confidence: number;
  category: string;
  intensity: string;
  top_emotions?: Array<{
    emotion: string;
    score: number;
    category: string;
    intensity: string;
  }>;
}

interface EmotionDisplayProps {
  emotions: EmotionData;
}

const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ emotions }) => {
  const getEmotionIcon = (emotion: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'happy': <Smile className="w-5 h-5" />,
      'love': <Heart className="w-5 h-5" />,
      'admiration': <Star className="w-5 h-5" />,
      'gratitude': <ThumbsUp className="w-5 h-5" />,
      'satisfaction': <Smile className="w-5 h-5" />,
      'pride': <Star className="w-5 h-5" />,
      'hope': <Star className="w-5 h-5" />,
      'relief': <Smile className="w-5 h-5" />,
      'sad': <Frown className="w-5 h-5" />,
      'angry': <AlertTriangle className="w-5 h-5" />,
      'anger': <AlertTriangle className="w-5 h-5" />,
      'fear': <AlertTriangle className="w-5 h-5" />,
      'anxious': <AlertTriangle className="w-5 h-5" />,
      'hate': <ThumbsDown className="w-5 h-5" />,
      'distress': <Frown className="w-5 h-5" />,
      'shame': <Frown className="w-5 h-5" />,
      'disappointment': <Frown className="w-5 h-5" />,
      'resentment': <ThumbsDown className="w-5 h-5" />,
      'reproach': <ThumbsDown className="w-5 h-5" />,
      'pity': <Frown className="w-5 h-5" />,
      'gloating': <Meh className="w-5 h-5" />,
      'mildness': <Meh className="w-5 h-5" />,
      'boredom': <Meh className="w-5 h-5" />
    };
    return iconMap[emotion] || <Meh className="w-5 h-5" />;
  };

  const getEmotionColor = (category: string, intensity: string) => {
    const baseColors = {
      'positive': 'green',
      'negative': 'red',
      'neutral': 'blue'
    };
    
    const intensityShades = {
      'low': '300',
      'medium': '500',
      'high': '700'
    };
    
    const color = baseColors[category as keyof typeof baseColors] || 'blue';
    const shade = intensityShades[intensity as keyof typeof intensityShades] || '500';
    
    return `bg-${color}-${shade}`;
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: { [key: string]: string } = {
      'anxious': '😰',
      'angry': '😠',
      'sad': '😢',
      'happy': '😊',
      'hate': '😡',
      'satisfaction': '😌',
      'gratitude': '🙏',
      'reproach': '😤',
      'distress': '😫',
      'pride': '😤',
      'fear': '😨',
      'mildness': '😐',
      'pity': '😔',
      'boredom': '😴',
      'shame': '😳',
      'disappointment': '😞',
      'hope': '🤞',
      'resentment': '😒',
      'love': '❤️',
      'gloating': '😏',
      'anger': '😡',
      'relief': '😅',
      'admiration': '😍'
    };
    return emojiMap[emotion] || '😐';
  };

  const formatConfidence = (value: number) => {
    return (value * 100).toFixed(1) + '%';
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-4">
      {/* Primary Emotion */}
      <div>
        <div className="flex items-center mb-3">
          <Heart size={18} className="mr-2 text-pink-500" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
            Precise Emotion Analysis
          </h3>
        </div>
        
        <motion.div 
          className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <motion.div 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl ${getEmotionColor(emotions.category, emotions.intensity)}`}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {getEmotionEmoji(emotions.primary_emotion)}
              </motion.div>
              <div className="ml-4">
                <motion.p 
                  className="text-lg font-medium capitalize text-gray-800 dark:text-gray-200"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {capitalizeFirst(emotions.primary_emotion)}
                </motion.p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Primary emotion • {emotions.category} • {emotions.intensity} intensity
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {formatConfidence(emotions.confidence)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Confidence
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Emotions */}
      {emotions.top_emotions && emotions.top_emotions.length > 1 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-3">
            Top Detected Emotions
          </h4>
          <div className="space-y-2">
            {emotions.top_emotions.slice(0, 5).map((emotion, index) => (
              <motion.div
                key={emotion.emotion}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">{getEmotionEmoji(emotion.emotion)}</span>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {capitalizeFirst(emotion.emotion)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {emotion.category} • {emotion.intensity}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                    <motion.div 
                      className={`h-2 rounded-full ${getEmotionColor(emotion.category, emotion.intensity)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${emotion.score * 100}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.8 }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[3rem]">
                    {formatConfidence(emotion.score)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Emotion Categories Summary */}
      <div className="grid grid-cols-3 gap-3">
        {['positive', 'neutral', 'negative'].map((category) => {
          const categoryEmotions = emotions.top_emotions?.filter(e => e.category === category) || [];
          const categoryScore = categoryEmotions.reduce((sum, e) => sum + e.score, 0);
          
          return (
            <motion.div
              key={category}
              className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                {category}
              </p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {formatConfidence(categoryScore)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {categoryEmotions.length} emotions
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default EmotionDisplay;