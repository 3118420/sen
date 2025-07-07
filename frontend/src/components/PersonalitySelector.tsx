import React from 'react';
import { motion } from 'framer-motion';
import { AIPersonality } from '../types';

interface PersonalitySelectorProps {
  personalities: AIPersonality[];
  selectedPersonality: AIPersonality;
  onPersonalityChange: (personality: AIPersonality) => void;
}

const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({
  personalities,
  selectedPersonality,
  onPersonalityChange
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-800 dark:text-white">AI Personality</h3>
      <div className="grid grid-cols-2 gap-3">
        {personalities.map((personality) => (
          <motion.button
            key={personality.id}
            onClick={() => onPersonalityChange(personality)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedPersonality.id === personality.id
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${personality.color}`}>
                {personality.icon}
              </div>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">
                {personality.name}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-left">
              {personality.description}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default PersonalitySelector;