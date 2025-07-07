import { ProcessingResult } from '../types';

interface CloudWatchMetric {
  name: string;
  value: number;
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

class CloudWatchService {
  private apiUrl: string;
  private metricsQueue: CloudWatchMetric[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private timer: NodeJS.Timeout | null = null;
  private isProduction: boolean;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    this.isProduction = import.meta.env.PROD;
    
    if (this.isProduction) {
      this.startBatchTimer();
    }
  }

  private startBatchTimer() {
    this.timer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  private async flushMetrics() {
    if (this.metricsQueue.length === 0 || !this.isProduction) return;

    const metricsToSend = this.metricsQueue.splice(0, this.batchSize);
    
    try {
      const response = await fetch(`${this.apiUrl}/api/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.formatMetricsForBackend(metricsToSend),
          source: 'frontend',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`📊 Sent ${metricsToSend.length} metrics to CloudWatch`);
    } catch (error) {
      console.warn('Failed to send metrics to CloudWatch:', error);
      // Re-queue failed metrics (with limit to prevent infinite growth)
      if (this.metricsQueue.length < 100) {
        this.metricsQueue.unshift(...metricsToSend);
      }
    }
  }

  private formatMetricsForBackend(metrics: CloudWatchMetric[]) {
    const formatted: Record<string, any> = {};
    
    metrics.forEach(metric => {
      const key = metric.dimensions 
        ? `${metric.name}_${Object.values(metric.dimensions).join('_')}`
        : metric.name;
        
      formatted[key] = {
        value: metric.value,
        dimensions: metric.dimensions || {},
        timestamp: metric.timestamp || new Date(),
        unit: this.getMetricUnit(metric.name)
      };
    });
    
    return formatted;
  }

  private getMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      'PageView': 'Count',
      'UserInteraction': 'Count',
      'APICall': 'Count',
      'APIResponseTime': 'Milliseconds',
      'ConversationStarted': 'Count',
      'ConversationDuration': 'Seconds',
      'EmotionDetected': 'Count',
      'EmotionConfidence': 'Percent',
      'SentimentAnalyzed': 'Count',
      'AudioRecorded': 'Count',
      'AudioDuration': 'Seconds',
      'AudioFileSize': 'Bytes',
      'WellnessActivity': 'Count',
      'FrontendError': 'Count',
      'Performance': 'Milliseconds'
    };
    
    return unitMap[metricName] || 'Count';
  }

  // Public methods for tracking different types of events
  trackPageView(page: string) {
    this.addMetric('PageView', 1, { page, userAgent: navigator.userAgent.substring(0, 50) });
  }

  trackUserInteraction(action: string, component: string, metadata?: Record<string, string>) {
    this.addMetric('UserInteraction', 1, { 
      action, 
      component,
      ...metadata
    });
  }

  trackConversationStart(personality: string) {
    this.addMetric('ConversationStarted', 1, { personality });
  }

  trackConversationEnd(duration: number, messageCount: number) {
    this.addMetric('ConversationDuration', duration, { unit: 'seconds' });
    this.addMetric('ConversationMessages', messageCount);
  }

  trackEmotionDetected(emotion: string, confidence: number, category: string) {
    this.addMetric('EmotionDetected', 1, { emotion, category });
    this.addMetric('EmotionConfidence', confidence * 100, { emotion });
  }

  trackSentimentAnalysis(sentiment: string, confidence: number) {
    this.addMetric('SentimentAnalyzed', 1, { sentiment });
    this.addMetric('SentimentConfidence', confidence * 100, { sentiment });
  }

  trackAudioRecording(duration: number, fileSize: number) {
    this.addMetric('AudioRecorded', 1);
    this.addMetric('AudioDuration', duration, { unit: 'seconds' });
    this.addMetric('AudioFileSize', fileSize, { unit: 'bytes' });
  }

  trackAPICall(endpoint: string, method: string, duration: number, success: boolean) {
    this.addMetric('APICall', 1, { 
      endpoint: endpoint.replace(this.apiUrl, ''), 
      method, 
      success: success.toString() 
    });
    this.addMetric('APIResponseTime', duration, { 
      endpoint: endpoint.replace(this.apiUrl, ''), 
      method 
    });
    
    if (!success) {
      this.addMetric('APIError', 1, { 
        endpoint: endpoint.replace(this.apiUrl, ''), 
        method 
      });
    }
  }

  trackWellnessActivity(activity: string, duration: number) {
    this.addMetric('WellnessActivity', 1, { activity });
    this.addMetric('WellnessActivityDuration', duration, { activity });
  }

  trackThemeChange(theme: string) {
    this.addMetric('ThemeChanged', 1, { theme });
  }

  trackPersonalityChange(fromPersonality: string, toPersonality: string) {
    this.addMetric('PersonalityChanged', 1, { 
      from: fromPersonality, 
      to: toPersonality 
    });
  }

  trackError(errorType: string, component: string, message?: string) {
    this.addMetric('FrontendError', 1, { 
      errorType, 
      component,
      ...(message && { message: message.substring(0, 100) })
    });
  }

  trackPerformance(metric: string, value: number, component?: string) {
    this.addMetric('Performance', value, { 
      metric,
      ...(component && { component })
    });
  }

  trackProcessingResult(result: ProcessingResult) {
    // Track language detection
    this.addMetric('LanguageDetected', 1, { 
      language: result.language,
      isSouthIndian: result.is_south_indian_language?.toString() || 'false'
    });

    // Track processing times
    if (result.processing_time) {
      this.addMetric('TranscriptionTime', result.processing_time);
    }
    this.addMetric('TranscriptionConfidence', result.transcript_confidence * 100);

    // Track sentiment
    this.trackSentimentAnalysis(result.sentiment, result.sentiment_confidence);

    // Track emotions if available
    if (result.emotions) {
      this.trackEmotionDetected(
        result.emotions.primary_emotion,
        result.emotions.confidence,
        result.emotions.category
      );
    }
  }

  private addMetric(name: string, value: number, dimensions?: Record<string, string>) {
    if (!this.isProduction) {
      console.log(`📊 [DEV] Metric: ${name} = ${value}`, dimensions);
      return;
    }

    this.metricsQueue.push({
      name,
      value,
      dimensions,
      timestamp: new Date()
    });

    // Flush immediately if queue is full
    if (this.metricsQueue.length >= this.batchSize) {
      this.flushMetrics();
    }
  }

  // Real-time monitoring methods
  startRealTimeMonitoring() {
    if (!this.isProduction) return;

    // Track page performance
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.trackPerformance('PageLoadTime', navigation.loadEventEnd - navigation.loadEventStart);
        this.trackPerformance('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
      }
    }

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackError('JavaScriptError', 'Global', event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('UnhandledPromiseRejection', 'Global', event.reason?.toString());
    });
  }

  // Cleanup method
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flushMetrics(); // Send any remaining metrics
  }
}

// Create singleton instance
export const cloudWatchService = new CloudWatchService();

// Start monitoring and cleanup on page unload
if (typeof window !== 'undefined') {
  cloudWatchService.startRealTimeMonitoring();
  
  window.addEventListener('beforeunload', () => {
    cloudWatchService.destroy();
  });
}