import { apiClient } from './api-client';
import { ProcessingResult, SupportedEmotions } from '../types';
import { debugMode } from '../config/environment';

/**
 * Enhanced API service with proper error handling and retry logic
 */

/**
 * Process audio file with enhanced error handling and progress tracking
 */
export const processAudio = async (
  audioFile: File, 
  language?: string, 
  autoDetect: boolean = true,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> => {
  const startTime = Date.now();

  try {
    if (debugMode) {
      console.log('🎵 Processing audio file:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type,
        language,
        autoDetect
      });
    }

    // Validate file
    if (!audioFile.type.startsWith('audio/')) {
      throw new Error('Invalid file type. Please select an audio file.');
    }

    if (audioFile.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File too large. Please select a file smaller than 50MB.');
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (language && language !== 'auto') {
      queryParams.append('language', language);
    }
    queryParams.append('auto_detect', autoDetect.toString());

    const url = `/process-audio${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    // Upload file with progress tracking
    const result = await apiClient.uploadFile(url, audioFile, {}, onProgress);
    
    const totalProcessingTime = (Date.now() - startTime) / 1000;

    return {
      ...result,
      totalProcessingTime,
    };
  } catch (error: any) {
    console.error('❌ Audio processing failed:', error);
    
    // Provide user-friendly error messages
    if (error.name === 'APINetworkError') {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else if (error.status === 413) {
      throw new Error('File too large. Please select a smaller audio file.');
    } else if (error.status === 415) {
      throw new Error('Unsupported file format. Please use WAV, MP3, or other common audio formats.');
    } else if (error.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (error.status >= 500) {
      throw new Error('Server error. Please try again in a few moments.');
    }
    
    throw new Error(error.message || 'Failed to process audio file');
  }
};

/**
 * Detect language of audio file
 */
export const detectLanguage = async (audioFile: File) => {
  try {
    if (debugMode) {
      console.log('🌐 Detecting language for:', audioFile.name);
    }

    return await apiClient.uploadFile('/api/detect-language', audioFile);
  } catch (error: any) {
    console.error('❌ Language detection failed:', error);
    throw new Error(error.message || 'Failed to detect language');
  }
};

/**
 * Get supported languages
 */
export const getSupportedLanguages = async () => {
  try {
    if (debugMode) {
      console.log('📋 Fetching supported languages...');
    }

    return await apiClient.get('/api/supported-languages');
  } catch (error: any) {
    console.error('❌ Failed to get supported languages:', error);
    throw new Error(error.message || 'Failed to get supported languages');
  }
};

/**
 * Get supported emotions
 */
export const getSupportedEmotions = async (): Promise<SupportedEmotions> => {
  try {
    if (debugMode) {
      console.log('😊 Fetching supported emotions...');
    }

    return await apiClient.get('/api/supported-emotions');
  } catch (error: any) {
    console.error('❌ Failed to get supported emotions:', error);
    throw new Error(error.message || 'Failed to get supported emotions');
  }
};

/**
 * Analyze sentiment with precise emotions
 */
export const analyzeSentiment = async (text: string, language?: string) => {
  try {
    if (debugMode) {
      console.log('💭 Analyzing sentiment for text:', text.substring(0, 100) + '...');
    }

    const queryParams = new URLSearchParams();
    if (language) {
      queryParams.append('language', language);
    }

    const url = `/api/analyze-sentiment${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return await apiClient.post(url, { text });
  } catch (error: any) {
    console.error('❌ Sentiment analysis failed:', error);
    throw new Error(error.message || 'Failed to analyze sentiment');
  }
};

/**
 * Get model information
 */
export const getModelInfo = async () => {
  try {
    if (debugMode) {
      console.log('ℹ️ Fetching model information...');
    }

    return await apiClient.get('/api/model-info');
  } catch (error: any) {
    console.error('❌ Failed to get model info:', error);
    throw new Error(error.message || 'Failed to get model information');
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async () => {
  try {
    return await apiClient.get('/health');
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    throw new Error(error.message || 'Health check failed');
  }
};

/**
 * Send metrics to CloudWatch (if enabled)
 */
export const sendMetrics = async (metrics: Record<string, any>) => {
  try {
    if (debugMode) {
      console.log('📊 Sending metrics:', metrics);
    }

    return await apiClient.post('/api/metrics', {
      metrics,
      source: 'frontend',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    // Don't throw for metrics errors - just log them
    console.warn('⚠️ Failed to send metrics:', error);
    return null;
  }
};

/**
 * Test API connectivity
 */
export const testConnectivity = async (): Promise<{
  success: boolean;
  latency: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  try {
    await healthCheck();
    const latency = Date.now() - startTime;
    
    if (debugMode) {
      console.log('✅ API connectivity test passed:', { latency });
    }
    
    return { success: true, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    console.error('❌ API connectivity test failed:', error);
    
    return { 
      success: false, 
      latency, 
      error: error.message || 'Connection failed' 
    };
  }
};