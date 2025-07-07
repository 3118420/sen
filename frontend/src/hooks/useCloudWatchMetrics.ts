import { useEffect, useRef } from 'react';
import { cloudWatchService } from '../services/cloudwatch';
import { ProcessingResult } from '../types';

export const useCloudWatchMetrics = () => {
  const startTimeRef = useRef<number>(Date.now());
  const pageViewTrackedRef = useRef<boolean>(false);

  useEffect(() => {
    // Track page view once
    if (!pageViewTrackedRef.current) {
      cloudWatchService.trackPageView(window.location.pathname);
      pageViewTrackedRef.current = true;
    }

    // Track page load performance
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      if (loadTime > 0) {
        cloudWatchService.trackPerformance('PageLoadTime', loadTime, 'initial');
      }
    }

    return () => {
      // Track session duration on unmount
      const sessionDuration = (Date.now() - startTimeRef.current) / 1000;
      cloudWatchService.trackPerformance('SessionDuration', sessionDuration);
    };
  }, []);

  const trackUserAction = (action: string, component: string, metadata?: Record<string, string>) => {
    cloudWatchService.trackUserInteraction(action, component);
    
    // Track additional metadata if provided
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        cloudWatchService.addMetric(`UserAction_${key}`, 1, { action, component, [key]: value });
      });
    }
  };

  const trackAPICall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'POST'
  ): Promise<T> => {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await apiCall();
      success = true;
      return result;
    } catch (error) {
      success = false;
      cloudWatchService.trackError('APIError', endpoint, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      cloudWatchService.trackAPICall(endpoint, method, duration, success);
    }
  };

  const trackProcessingResult = (result: ProcessingResult) => {
    cloudWatchService.trackProcessingResult(result);
  };

  const trackConversationMetrics = {
    start: (personality: string) => {
      cloudWatchService.trackConversationStart(personality);
    },
    
    end: (duration: number, messageCount: number) => {
      cloudWatchService.trackConversationEnd(duration, messageCount);
    },
    
    message: (type: 'user' | 'ai', length: number) => {
      cloudWatchService.trackUserInteraction('MessageSent', 'Chat', { type, length: length.toString() });
    }
  };

  const trackWellnessMetrics = {
    activityStarted: (activity: string) => {
      cloudWatchService.trackUserInteraction('WellnessActivityStarted', 'Wellness', { activity });
    },
    
    activityCompleted: (activity: string, duration: number) => {
      cloudWatchService.trackWellnessActivity(activity, duration);
    },
    
    interventionTriggered: (emotion: string, intervention: string) => {
      cloudWatchService.trackUserInteraction('WellnessIntervention', 'Wellness', { emotion, intervention });
    }
  };

  const trackUIMetrics = {
    themeChanged: (theme: string) => {
      cloudWatchService.trackThemeChange(theme);
    },
    
    personalityChanged: (from: string, to: string) => {
      cloudWatchService.trackPersonalityChange(from, to);
    },
    
    navigationChanged: (from: string, to: string) => {
      cloudWatchService.trackUserInteraction('Navigation', 'App', { from, to });
    },
    
    componentRendered: (component: string, renderTime: number) => {
      cloudWatchService.trackPerformance('ComponentRenderTime', renderTime, component);
    }
  };

  const trackErrorMetrics = {
    componentError: (component: string, error: Error) => {
      cloudWatchService.trackError('ComponentError', component, error.message);
    },
    
    networkError: (endpoint: string, error: Error) => {
      cloudWatchService.trackError('NetworkError', endpoint, error.message);
    },
    
    userError: (action: string, error: string) => {
      cloudWatchService.trackError('UserError', action, error);
    }
  };

  return {
    trackUserAction,
    trackAPICall,
    trackProcessingResult,
    trackConversationMetrics,
    trackWellnessMetrics,
    trackUIMetrics,
    trackErrorMetrics,
    
    // Direct access to service for custom metrics
    cloudWatchService
  };
};