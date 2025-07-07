import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { ProcessingStatus } from '../types';

interface ProcessingOverlayProps {
  status: ProcessingStatus;
  errorMessage?: string;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ 
  status, 
  errorMessage 
}) => {
  const isVisible = status === 'uploading' || status === 'processing';
  
  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading audio file...';
      case 'processing':
        return 'Processing your audio...';
      case 'error':
        return errorMessage || 'An error occurred';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg max-w-md w-full mx-4"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <LoadingSpinner 
              size={60}
              text={getStatusText()}
            />
            
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
              This may take a few moments depending on the audio length
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProcessingOverlay;