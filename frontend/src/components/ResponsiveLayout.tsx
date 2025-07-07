import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { Menu, X, MessageCircle, BarChart3, Heart, History, Settings } from 'lucide-react';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onNewConversation: () => void;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  currentView,
  onViewChange,
  onNewConversation
}) => {
  const { deviceInfo, config, isCompact, isMobile, isTablet } = useResponsiveDesign();
  const { triggerHaptic } = useHapticFeedback();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navigationItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle, color: 'text-blue-500' },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-green-500' },
    { id: 'wellness', label: 'Wellness', icon: Heart, color: 'text-pink-500' },
    { id: 'history', label: 'History', icon: History, color: 'text-purple-500' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-gray-500' }
  ];

  const handleNavClick = (viewId: string) => {
    triggerHaptic('light');
    onViewChange(viewId);
    if (isMobile) setSidebarOpen(false);
  };

  const handleNewConversation = () => {
    triggerHaptic('medium');
    onNewConversation();
    if (isMobile) setSidebarOpen(false);
  };

  // Dynamic Island for iPhone 14 Pro
  const DynamicIsland = () => {
    if (!deviceInfo.hasDynamicIsland) return null;
    
    return (
      <motion.div
        className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-black rounded-full px-6 py-2 flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white text-xs font-medium capitalize">
            {currentView === 'chat' ? 'Listening' : currentView}
          </span>
        </div>
      </motion.div>
    );
  };

  // Bottom Navigation for Mobile
  const BottomNavigation = () => {
    if (config.navigationStyle !== 'bottom') return null;

    return (
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-40"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        style={{ paddingBottom: `max(env(safe-area-inset-bottom), 1rem)` }}
      >
        <div className="flex justify-around items-center py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                whileTap={{ scale: 0.95 }}
                style={{ minHeight: config.touchTargetSize === 'large' ? '56px' : '48px' }}
              >
                <Icon size={isCompact ? 20 : 24} />
                <span className={`text-xs mt-1 ${isCompact ? 'hidden' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    className="absolute -top-1 w-1 h-1 bg-yellow-500 rounded-full"
                    layoutId="activeIndicator"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  };

  // Side Navigation for Tablets/Desktop
  const SideNavigation = () => {
    if (config.navigationStyle !== 'side' && !sidebarOpen) return null;

    return (
      <AnimatePresence>
        <motion.div
          className={`fixed left-0 top-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-r border-gray-200 dark:border-gray-800 z-40 ${
            isTablet ? 'w-64' : 'w-80'
          }`}
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                VoiceInsight
              </h1>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* New Conversation Button */}
            <motion.button
              onClick={handleNewConversation}
              className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              + New Conversation
            </motion.button>

            {/* Navigation Items */}
            <nav className="flex-1 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon size={20} className={`mr-3 ${item.color}`} />
                    {item.label}
                  </motion.button>
                );
              })}
            </nav>

            {/* Device Info (Debug) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-auto p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
                <div>Device: {deviceInfo.type}</div>
                <div>Size: {deviceInfo.size}</div>
                <div>Viewport: {deviceInfo.viewportWidth}×{deviceInfo.viewportHeight}</div>
                <div>Foldable: {deviceInfo.isFoldable ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Mobile Menu Button
  const MenuButton = () => {
    if (!isMobile || config.navigationStyle !== 'side') return null;

    return (
      <motion.button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-full shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Menu size={20} />
      </motion.button>
    );
  };

  // Overlay for mobile sidebar
  const Overlay = () => {
    if (!sidebarOpen || !isMobile) return null;

    return (
      <motion.div
        className="fixed inset-0 bg-black/50 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSidebarOpen(false)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <DynamicIsland />
      <MenuButton />
      <Overlay />
      <SideNavigation />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          config.showSidebar && config.navigationStyle === 'side' 
            ? isTablet ? 'ml-64' : 'ml-80'
            : ''
        } ${
          config.navigationStyle === 'bottom' ? 'pb-20' : ''
        }`}
        style={{
          paddingTop: deviceInfo.hasDynamicIsland ? '4rem' : '1rem',
          paddingBottom: config.navigationStyle === 'bottom' 
            ? `calc(5rem + env(safe-area-inset-bottom))` 
            : '1rem'
        }}
      >
        <div className="p-4">
          {children}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ResponsiveLayout;