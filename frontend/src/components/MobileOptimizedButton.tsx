import React from 'react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';

interface MobileOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  hapticFeedback?: 'light' | 'medium' | 'heavy';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const MobileOptimizedButton: React.FC<MobileOptimizedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  hapticFeedback = 'light',
  icon,
  fullWidth = false,
  type = 'button'
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const { config, isMobile, isCompact } = useResponsiveDesign();

  const handleClick = () => {
    if (disabled || loading) return;
    
    triggerHaptic(hapticFeedback);
    onClick?.();
  };

  const getVariantStyles = () => {
    const baseStyles = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg hover:shadow-xl focus:ring-yellow-500 active:scale-95`;
      case 'secondary':
        return `${baseStyles} bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500`;
      case 'ghost':
        return `${baseStyles} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500`;
      case 'danger':
        return `${baseStyles} bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl focus:ring-red-500 active:scale-95`;
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    const touchTargetSize = config.touchTargetSize;
    
    if (isCompact || touchTargetSize === 'large') {
      switch (size) {
        case 'small':
          return 'px-4 py-3 text-sm min-h-[48px] rounded-lg';
        case 'medium':
          return 'px-6 py-4 text-base min-h-[52px] rounded-lg';
        case 'large':
          return 'px-8 py-5 text-lg min-h-[56px] rounded-xl';
        default:
          return 'px-6 py-4 text-base min-h-[52px] rounded-lg';
      }
    } else {
      switch (size) {
        case 'small':
          return 'px-3 py-2 text-sm min-h-[40px] rounded-md';
        case 'medium':
          return 'px-4 py-2.5 text-base min-h-[44px] rounded-md';
        case 'large':
          return 'px-6 py-3 text-lg min-h-[48px] rounded-lg';
        default:
          return 'px-4 py-2.5 text-base min-h-[44px] rounded-md';
      }
    }
  };

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${isMobile ? 'touch-feedback' : ''}
        flex items-center justify-center space-x-2
        ${className}
      `}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {loading && (
        <motion.div
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}
      
      {icon && !loading && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </motion.button>
  );
};

export default MobileOptimizedButton;