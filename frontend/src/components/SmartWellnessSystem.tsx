import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Wind, Brain, Shield, Zap, Play, Pause, RotateCcw } from 'lucide-react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';

interface SmartWellnessSystemProps {
  currentEmotion?: string;
  sentimentScore?: number;
  emotionHistory?: Array<{ emotion: string; timestamp: Date; intensity: number }>;
}

interface WellnessIntervention {
  id: string;
  type: 'breathing' | 'meditation' | 'affirmation' | 'grounding' | 'emergency';
  title: string;
  description: string;
  duration: number; // in minutes
  triggerEmotions: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  content: {
    instructions: string[];
    audioUrl?: string;
    visualCues?: string[];
  };
}

const SmartWellnessSystem: React.FC<SmartWellnessSystemProps> = ({
  currentEmotion,
  sentimentScore,
  emotionHistory = []
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const { isCompact, deviceInfo } = useResponsiveDesign();
  const [activeIntervention, setActiveIntervention] = useState<WellnessIntervention | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionTimer, setSessionTimer] = useState<NodeJS.Timeout | null>(null);

  const wellnessInterventions: WellnessIntervention[] = [
    {
      id: 'emergency-breathing',
      type: 'breathing',
      title: 'Emergency Calm Breathing',
      description: 'Immediate relief for intense anxiety or panic',
      duration: 3,
      triggerEmotions: ['anxious', 'fear', 'distress', 'panic'],
      urgencyLevel: 'critical',
      content: {
        instructions: [
          'Find a comfortable position',
          'Breathe in slowly for 4 counts',
          'Hold your breath for 4 counts',
          'Exhale slowly for 6 counts',
          'Repeat until you feel calmer'
        ],
        visualCues: ['Inhale...', 'Hold...', 'Exhale...']
      }
    },
    {
      id: 'anger-release',
      type: 'grounding',
      title: 'Anger Release Technique',
      description: 'Channel anger into positive energy',
      duration: 5,
      triggerEmotions: ['angry', 'anger', 'resentment', 'reproach'],
      urgencyLevel: 'high',
      content: {
        instructions: [
          'Acknowledge your anger without judgment',
          'Take 5 deep breaths',
          'Name 5 things you can see',
          'Name 4 things you can touch',
          'Name 3 things you can hear',
          'Name 2 things you can smell',
          'Name 1 thing you can taste'
        ]
      }
    },
    {
      id: 'sadness-comfort',
      type: 'affirmation',
      title: 'Gentle Self-Compassion',
      description: 'Nurturing support for difficult emotions',
      duration: 7,
      triggerEmotions: ['sad', 'disappointment', 'shame', 'pity'],
      urgencyLevel: 'medium',
      content: {
        instructions: [
          'Place your hand on your heart',
          'Repeat: "This is a moment of suffering"',
          'Repeat: "Suffering is part of life"',
          'Repeat: "May I be kind to myself"',
          'Breathe deeply and feel your own warmth'
        ]
      }
    },
    {
      id: 'joy-amplification',
      type: 'meditation',
      title: 'Joy Amplification',
      description: 'Enhance and savor positive emotions',
      duration: 5,
      triggerEmotions: ['happy', 'love', 'gratitude', 'pride', 'relief'],
      urgencyLevel: 'low',
      content: {
        instructions: [
          'Close your eyes and smile',
          'Think of what brought you joy',
          'Feel the warmth in your chest',
          'Breathe in the positive energy',
          'Send gratitude to yourself and others'
        ]
      }
    }
  ];

  // AI-powered intervention selection
  const selectOptimalIntervention = (): WellnessIntervention | null => {
    if (!currentEmotion) return null;

    // Check for emergency situations
    const recentIntenseEmotions = emotionHistory
      .filter(e => Date.now() - e.timestamp.getTime() < 300000) // Last 5 minutes
      .filter(e => e.intensity > 0.8);

    if (recentIntenseEmotions.length >= 3) {
      return wellnessInterventions.find(i => i.urgencyLevel === 'critical') || null;
    }

    // Find interventions that match current emotion
    const matchingInterventions = wellnessInterventions.filter(intervention =>
      intervention.triggerEmotions.includes(currentEmotion)
    );

    if (matchingInterventions.length === 0) return null;

    // Sort by urgency and select most appropriate
    return matchingInterventions.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
    })[0];
  };

  useEffect(() => {
    const optimalIntervention = selectOptimalIntervention();
    if (optimalIntervention && optimalIntervention.urgencyLevel === 'critical') {
      setActiveIntervention(optimalIntervention);
      triggerHaptic('warning');
    }
  }, [currentEmotion, emotionHistory]);

  const startIntervention = (intervention: WellnessIntervention) => {
    setActiveIntervention(intervention);
    setIsActive(true);
    setProgress(0);
    setCurrentStep(0);
    triggerHaptic('medium');

    // Auto-progress through steps
    const stepDuration = (intervention.duration * 60 * 1000) / intervention.content.instructions.length;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / intervention.content.instructions.length);
        if (newProgress >= 100) {
          setIsActive(false);
          clearInterval(timer);
          triggerHaptic('success');
          return 100;
        }
        return newProgress;
      });

      setCurrentStep(prev => {
        const newStep = prev + 1;
        if (newStep < intervention.content.instructions.length) {
          triggerHaptic('light');
        }
        return newStep;
      });
    }, stepDuration);

    setSessionTimer(timer);
  };

  const stopIntervention = () => {
    setIsActive(false);
    if (sessionTimer) {
      clearInterval(sessionTimer);
      setSessionTimer(null);
    }
    triggerHaptic('light');
  };

  const resetIntervention = () => {
    setProgress(0);
    setCurrentStep(0);
    setIsActive(false);
    if (sessionTimer) {
      clearInterval(sessionTimer);
      setSessionTimer(null);
    }
  };

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'breathing': return Wind;
      case 'meditation': return Brain;
      case 'affirmation': return Heart;
      case 'grounding': return Shield;
      default: return Zap;
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Alert */}
      <AnimatePresence>
        {activeIntervention?.urgencyLevel === 'critical' && !isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-center mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3" />
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                Immediate Support Available
              </h3>
            </div>
            <p className="text-red-700 dark:text-red-400 mb-4">
              I notice you might be experiencing intense emotions. Would you like to try a quick calming technique?
            </p>
            <button
              onClick={() => startIntervention(activeIntervention)}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Start Emergency Breathing Exercise
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Intervention */}
      <AnimatePresence>
        {activeIntervention && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {activeIntervention.title}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={stopIntervention}
                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Pause size={16} />
                </button>
                <button
                  onClick={resetIntervention}
                  className="p-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Current Instruction */}
            <div className="text-center mb-6">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-medium text-gray-800 dark:text-white mb-2"
              >
                {activeIntervention.content.instructions[currentStep] || 'Complete!'}
              </motion.div>
              
              {/* Visual Breathing Cue */}
              {activeIntervention.type === 'breathing' && activeIntervention.content.visualCues && (
                <motion.div
                  className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium"
                  animate={{
                    scale: currentStep % 3 === 0 ? 1.2 : currentStep % 3 === 1 ? 1 : 0.8,
                  }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                >
                  {activeIntervention.content.visualCues[currentStep % 3]}
                </motion.div>
              )}
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center space-x-2">
              {activeIntervention.content.instructions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Interventions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wellnessInterventions.map((intervention) => {
          const Icon = getInterventionIcon(intervention.type);
          const isRecommended = intervention.triggerEmotions.includes(currentEmotion || '');
          
          return (
            <motion.div
              key={intervention.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isRecommended
                  ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700'
                  : 'border-gray-200 dark:border-gray-700 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startIntervention(intervention)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white mr-3 ${getUrgencyColor(intervention.urgencyLevel)}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">
                      {intervention.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {intervention.duration} min
                    </p>
                  </div>
                </div>
                {isRecommended && (
                  <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {intervention.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full text-white ${getUrgencyColor(intervention.urgencyLevel)}`}>
                  {intervention.urgencyLevel} priority
                </span>
                <Play size={16} className="text-gray-500" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Crisis Resources */}
      <motion.div
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
          Need Immediate Help?
        </h4>
        <p className="text-sm text-red-700 dark:text-red-400 mb-3">
          If you're having thoughts of self-harm or suicide, please reach out for professional help immediately.
        </p>
        <div className="space-y-2">
          <a
            href="tel:988"
            className="block w-full text-center px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            Call 988 - Suicide & Crisis Lifeline
          </a>
          <a
            href="sms:741741"
            className="block w-full text-center px-4 py-2 bg-red-400 text-white rounded-lg font-medium hover:bg-red-500 transition-colors"
          >
            Text HOME to 741741 - Crisis Text Line
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default SmartWellnessSystem;