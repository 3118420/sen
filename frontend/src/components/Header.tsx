import React from 'react';
import { motion } from 'framer-motion';
import { Headphones, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';

const Header: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const { deviceInfo, isCompact } = useResponsiveDesign();
  
  const handleThemeToggle = () => {
    toggleTheme();
    triggerHaptic('light');
  };
  
  return (
    <motion.header 
      className="w-full py-4 px-6 md:px-8 backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 shadow-sm fixed top-0 z-50 transition-colors duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        paddingTop: deviceInfo.hasDynamicIsland ? '3rem' : '1rem',
        paddingBottom: '1rem'
      }}
    >
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <motion.div 
          className="flex items-center"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-md">
            <Headphones size={isCompact ? 20 : 24} className="text-white" />
          </div>
          <h1 className={`font-bold text-gray-800 dark:text-white ${
            isCompact ? 'text-lg' : 'text-xl'
          }`}>
            VoiceInsight
          </h1>
        </motion.div>
        
        <motion.button
          className="relative p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
          onClick={handleThemeToggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{ minHeight: '48px', minWidth: '48px' }}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <motion.div
            initial={false}
            animate={{ 
              rotate: isDark ? 180 : 0,
              scale: isDark ? 1 : 1
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {isDark ? (
              <Sun size={20} className="text-yellow-400" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </motion.div>
          
          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-400/20"
            initial={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        </motion.button>
      </div>
    </motion.header>
  );
};

export default Header;