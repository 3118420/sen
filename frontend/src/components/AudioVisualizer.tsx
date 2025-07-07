import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  isRecording: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording }) => {
  const bars = Array.from({ length: 30 }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center h-16 my-4">
      <div className="flex items-end space-x-1 h-full">
        {bars.map((i) => (
          <motion.div
            key={i}
            className="w-1.5 bg-gradient-to-t from-yellow-400 to-yellow-600 rounded-full"
            initial={{ height: '10%' }}
            animate={isRecording ? {
              height: [
                `${10 + Math.random() * 10}%`,
                `${50 + Math.random() * 50}%`,
                `${10 + Math.random() * 30}%`,
              ],
            } : { height: '10%' }}
            transition={{
              duration: 1,
              repeat: isRecording ? Infinity : 0,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: i * 0.03,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioVisualizer;