import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Wind, Lightbulb, Activity, Play, Pause } from 'lucide-react';
import { WellnessRecommendation } from '../types';

interface WellnessPanelProps {
  currentEmotion?: string;
  sentimentScore?: number;
}

const WellnessPanel: React.FC<WellnessPanelProps> = ({ currentEmotion, sentimentScore }) => {
  const [activeRecommendation, setActiveRecommendation] = useState<WellnessRecommendation | null>(null);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathingTimer, setBreathingTimer] = useState<number | null>(null);

  const wellnessRecommendations: WellnessRecommendation[] = [
    {
      type: 'breathing',
      title: 'Deep Breathing Exercise',
      description: 'Calm your mind with guided breathing',
      content: 'Follow the circle: Inhale for 4 seconds, hold for 4 seconds, exhale for 6 seconds.',
      triggerEmotions: ['anxious', 'fear', 'distress', 'angry', 'anger']
    },
    {
      type: 'affirmation',
      title: 'Positive Affirmation',
      description: 'Boost your confidence with positive thoughts',
      content: 'You are capable, strong, and worthy of good things. This feeling will pass, and you will grow from this experience.',
      triggerEmotions: ['sad', 'shame', 'disappointment', 'fear']
    },
    {
      type: 'tip',
      title: 'Emotional Intelligence Tip',
      description: 'Learn to understand your emotions better',
      content: 'Emotions are temporary visitors. Acknowledge them, understand what they\'re telling you, but don\'t let them control your actions.',
      triggerEmotions: ['angry', 'resentment', 'reproach']
    },
    {
      type: 'exercise',
      title: 'Quick Mindfulness Exercise',
      description: 'Ground yourself in the present moment',
      content: 'Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
      triggerEmotions: ['anxious', 'distress', 'boredom']
    }
  ];

  useEffect(() => {
    if (currentEmotion) {
      const recommendation = wellnessRecommendations.find(rec => 
        rec.triggerEmotions.includes(currentEmotion)
      );
      if (recommendation) {
        setActiveRecommendation(recommendation);
      }
    }
  }, [currentEmotion]);

  const startBreathingExercise = () => {
    setIsBreathingActive(true);
    setBreathingPhase('inhale');
    
    const cycle = () => {
      // Inhale (4s)
      setBreathingPhase('inhale');
      setTimeout(() => {
        // Hold (4s)
        setBreathingPhase('hold');
        setTimeout(() => {
          // Exhale (6s)
          setBreathingPhase('exhale');
          setTimeout(() => {
            if (isBreathingActive) {
              cycle(); // Repeat
            }
          }, 6000);
        }, 4000);
      }, 4000);
    };
    
    cycle();
  };

  const stopBreathingExercise = () => {
    setIsBreathingActive(false);
    if (breathingTimer) {
      clearTimeout(breathingTimer);
      setBreathingTimer(null);
    }
  };

  const getBreathingInstruction = () => {
    switch (breathingPhase) {
      case 'inhale': return 'Breathe In...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe Out...';
    }
  };

  const getBreathingDuration = () => {
    switch (breathingPhase) {
      case 'inhale': return 4;
      case 'hold': return 4;
      case 'exhale': return 6;
    }
  };

  const getEmotionColor = (emotion?: string) => {
    if (!emotion) return 'bg-blue-500';
    
    const emotionColors: { [key: string]: string } = {
      happy: 'bg-yellow-500',
      sad: 'bg-blue-600',
      angry: 'bg-red-500',
      anxious: 'bg-orange-500',
      fear: 'bg-purple-500',
      love: 'bg-pink-500',
      pride: 'bg-green-500',
      relief: 'bg-teal-500'
    };
    
    return emotionColors[emotion] || 'bg-blue-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Wellness Center</h2>
        {currentEmotion && (
          <div className={`px-3 py-1 rounded-full text-white text-sm ${getEmotionColor(currentEmotion)}`}>
            Current: {currentEmotion}
          </div>
        )}
      </div>

      {/* Breathing Exercise */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Wind className="w-6 h-6 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Breathing Exercise</h3>
          </div>
          <button
            onClick={isBreathingActive ? stopBreathingExercise : startBreathingExercise}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isBreathingActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isBreathingActive ? <Pause size={16} /> : <Play size={16} />}
            <span className="ml-2">{isBreathingActive ? 'Stop' : 'Start'}</span>
          </button>
        </div>

        {isBreathingActive && (
          <div className="text-center">
            <motion.div
              className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center"
              animate={{
                scale: breathingPhase === 'inhale' ? 1.2 : breathingPhase === 'exhale' ? 0.8 : 1,
              }}
              transition={{
                duration: getBreathingDuration(),
                ease: "easeInOut"
              }}
            >
              <span className="text-white font-medium">{getBreathingInstruction()}</span>
            </motion.div>
            <p className="text-gray-600 dark:text-gray-400">
              Follow the circle and breathe naturally
            </p>
          </div>
        )}
      </motion.div>

      {/* Active Recommendation */}
      <AnimatePresence>
        {activeRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          >
            <div className="flex items-center mb-3">
              {activeRecommendation.type === 'affirmation' && <Heart className="w-6 h-6 text-pink-500 mr-2" />}
              {activeRecommendation.type === 'tip' && <Lightbulb className="w-6 h-6 text-yellow-500 mr-2" />}
              {activeRecommendation.type === 'exercise' && <Activity className="w-6 h-6 text-green-500 mr-2" />}
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                {activeRecommendation.title}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              {activeRecommendation.description}
            </p>
            <div className="p-4 bg-white/5 dark:bg-black/5 rounded-lg">
              <p className="text-gray-800 dark:text-white leading-relaxed">
                {activeRecommendation.content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wellness Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wellnessRecommendations.map((recommendation, index) => (
          <motion.div
            key={recommendation.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 dark:border-gray-800/50 cursor-pointer hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
            onClick={() => setActiveRecommendation(recommendation)}
          >
            <div className="flex items-center mb-2">
              {recommendation.type === 'breathing' && <Wind className="w-5 h-5 text-blue-500 mr-2" />}
              {recommendation.type === 'affirmation' && <Heart className="w-5 h-5 text-pink-500 mr-2" />}
              {recommendation.type === 'tip' && <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />}
              {recommendation.type === 'exercise' && <Activity className="w-5 h-5 text-green-500 mr-2" />}
              <h4 className="font-medium text-gray-800 dark:text-white">
                {recommendation.title}
              </h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {recommendation.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Sentiment Indicator */}
      {sentimentScore !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 dark:border-gray-800/50"
        >
          <h4 className="font-medium text-gray-800 dark:text-white mb-3">Current Mood</h4>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 mr-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  sentimentScore > 0 ? 'bg-green-500' : sentimentScore < 0 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.abs(sentimentScore) * 100}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${
              sentimentScore > 0.1 ? 'text-green-500' :
              sentimentScore < -0.1 ? 'text-red-500' : 'text-blue-500'
            }`}>
              {sentimentScore > 0.1 ? 'Positive' :
               sentimentScore < -0.1 ? 'Negative' : 'Neutral'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WellnessPanel;