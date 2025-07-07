import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 40, 
  color = '#cfaf62',
  text
}) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative\" style={{ width: size, height: size }}>
        <motion.span
          className="block absolute"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `4px solid ${color}`,
            borderTopColor: 'transparent',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      {text && (
        <p className="mt-4 text-gray-600 dark:text-gray-300">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;