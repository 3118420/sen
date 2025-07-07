import { useState, useEffect, useCallback } from 'react';
import { testConnectivity } from '../services/api';
import { debugMode } from '../config/environment';

interface ApiStatus {
  isConnected: boolean | null;
  latency: number;
  error: string;
  lastCheck: Date | null;
  isChecking: boolean;
}

export const useApiStatus = (checkInterval: number = 30000) => {
  const [status, setStatus] = useState<ApiStatus>({
    isConnected: null,
    latency: 0,
    error: '',
    lastCheck: null,
    isChecking: false
  });

  const checkStatus = useCallback(async () => {
    if (status.isChecking) return;

    setStatus(prev => ({ ...prev, isChecking: true, error: '' }));

    try {
      const result = await testConnectivity();
      
      setStatus(prev => ({
        ...prev,
        isConnected: result.success,
        latency: result.latency,
        error: result.error || '',
        lastCheck: new Date(),
        isChecking: false
      }));

      if (debugMode) {
        console.log('🔗 API Status Check:', result);
      }
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: error.message || 'Connection failed',
        lastCheck: new Date(),
        isChecking: false
      }));
    }
  }, [status.isChecking]);

  useEffect(() => {
    // Initial check
    checkStatus();

    // Set up interval for periodic checks
    const interval = setInterval(checkStatus, checkInterval);

    // Check when window regains focus
    const handleFocus = () => checkStatus();
    window.addEventListener('focus', handleFocus);

    // Handle online/offline events
    const handleOnline = () => checkStatus();
    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: 'Device is offline',
        lastCheck: new Date()
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkStatus, checkInterval]);

  return {
    ...status,
    checkStatus,
    isOnline: navigator.onLine
  };
};