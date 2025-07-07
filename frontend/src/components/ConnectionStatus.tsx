import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { testConnectivity } from '../services/api';
import { debugMode, env } from '../config/environment';

interface ConnectionStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    setError('');
    
    try {
      const result = await testConnectivity();
      setIsConnected(result.success);
      setLatency(result.latency);
      setError(result.error || '');
      setLastCheck(new Date());
      
      onStatusChange?.(result.success);
      
      if (debugMode) {
        console.log('🔗 Connection status:', result);
      }
    } catch (err: any) {
      setIsConnected(false);
      setError(err.message || 'Connection test failed');
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial connection check
    checkConnection();
    
    // Periodic connection checks
    const interval = setInterval(checkConnection, 30000); // Every 30 seconds
    
    // Check connection when window regains focus
    const handleFocus = () => checkConnection();
    window.addEventListener('focus', handleFocus);
    
    // Check connection when online/offline
    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      setIsConnected(false);
      setError('Device is offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="animate-spin" size={16} />;
    }
    
    if (isConnected === null) {
      return <AlertCircle size={16} />;
    }
    
    return isConnected ? <CheckCircle size={16} /> : <WifiOff size={16} />;
  };

  const getStatusColor = () => {
    if (isChecking) return 'text-blue-500';
    if (isConnected === null) return 'text-gray-500';
    return isConnected ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (isConnected === null) return 'Unknown';
    if (isConnected) return `Connected (${latency}ms)`;
    return error || 'Disconnected';
  };

  return (
    <div className="flex items-center space-x-2">
      <motion.button
        onClick={checkConnection}
        disabled={isChecking}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors ${getStatusColor()} hover:bg-gray-100 dark:hover:bg-gray-800`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </motion.button>
      
      {/* Detailed status for development */}
      {debugMode && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            <div>API: {env.apiUrl}</div>
            <div>Env: {env.environment}</div>
            {lastCheck && (
              <div>Last: {lastCheck.toLocaleTimeString()}</div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ConnectionStatus;