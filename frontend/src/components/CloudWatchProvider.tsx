import React, { createContext, useContext, useEffect } from 'react';
import { useCloudWatchMetrics } from '../hooks/useCloudWatchMetrics';

interface CloudWatchContextType {
  trackUserAction: (action: string, component: string, metadata?: Record<string, string>) => void;
  trackAPICall: <T>(apiCall: () => Promise<T>, endpoint: string, method?: string) => Promise<T>;
  trackProcessingResult: (result: any) => void;
  trackConversationMetrics: any;
  trackWellnessMetrics: any;
  trackUIMetrics: any;
  trackErrorMetrics: any;
}

const CloudWatchContext = createContext<CloudWatchContextType | null>(null);

export const useCloudWatch = () => {
  const context = useContext(CloudWatchContext);
  if (!context) {
    throw new Error('useCloudWatch must be used within CloudWatchProvider');
  }
  return context;
};

interface CloudWatchProviderProps {
  children: React.ReactNode;
}

export const CloudWatchProvider: React.FC<CloudWatchProviderProps> = ({ children }) => {
  const metrics = useCloudWatchMetrics();

  // Track app initialization
  useEffect(() => {
    metrics.trackUserAction('AppInitialized', 'App');
  }, []);

  // Global error boundary for CloudWatch
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      metrics.trackErrorMetrics.componentError('Global', new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      metrics.trackErrorMetrics.networkError('Global', new Error(event.reason));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [metrics]);

  return (
    <CloudWatchContext.Provider value={metrics}>
      {children}
    </CloudWatchContext.Provider>
  );
};