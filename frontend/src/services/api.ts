import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { env, debugMode, isProduction } from '../config/environment';

// Enhanced retry configuration for Lambda cold starts
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: any) => boolean;
  onRetry?: (retryCount: number, error: any) => void;
}

class APIClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;

  constructor() {
    this.retryConfig = {
      retries: 3,
      retryDelay: 1000,
      retryCondition: (error) => {
        // Retry on network errors, timeouts, and 5xx errors
        return (
          !error.response ||
          error.code === 'ECONNABORTED' ||
          error.code === 'NETWORK_ERROR' ||
          (error.response?.status >= 500 && error.response?.status < 600) ||
          error.response?.status === 429 // Rate limiting
        );
      },
      onRetry: (retryCount, error) => {
        if (debugMode) {
          console.warn(`🔄 API Retry ${retryCount}:`, {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message
          });
        }
      }
    };

    this.client = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    const baseURL = env.apiUrl;
    
    if (debugMode) {
      console.log('🌐 Creating API client with base URL:', baseURL);
    }

    return axios.create({
      baseURL,
      timeout: 30000, // 30 seconds for Lambda cold starts
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add headers for CORS and API Gateway
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache'
      },
      // Important for CORS
      withCredentials: false,
      // Handle different response types
      responseType: 'json',
      // Validate status codes
      validateStatus: (status) => status < 500
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp for debugging
        config.metadata = { startTime: Date.now() };
        
        // Log request in development
        if (debugMode) {
          console.log('📤 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            headers: config.headers,
            data: config.data instanceof FormData ? 'FormData' : config.data
          });
        }

        // Ensure proper headers for different content types
        if (config.data instanceof FormData) {
          // Let browser set Content-Type for FormData (includes boundary)
          delete config.headers['Content-Type'];
        }

        return config;
      },
      (error) => {
        console.error('📤 Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || 0);
        
        if (debugMode) {
          console.log('📥 API Response:', {
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status,
            duration: `${duration}ms`,
            data: response.data
          });
        }

        return response;
      },
      async (error) => {
        const config = error.config;
        const duration = Date.now() - (config?.metadata?.startTime || 0);

        // Log error details
        console.error('📥 API Error:', {
          method: config?.method?.toUpperCase(),
          url: config?.url,
          status: error.response?.status,
          duration: `${duration}ms`,
          message: error.message,
          response: error.response?.data
        });

        // Implement retry logic
        if (config && this.shouldRetry(error, config)) {
          return this.retryRequest(config, error);
        }

        return Promise.reject(this.enhanceError(error));
      }
    );
  }

  private shouldRetry(error: any, config: any): boolean {
    const retryCount = config.__retryCount || 0;
    return (
      retryCount < this.retryConfig.retries &&
      this.retryConfig.retryCondition(error)
    );
  }

  private async retryRequest(config: any, error: any): Promise<AxiosResponse> {
    config.__retryCount = (config.__retryCount || 0) + 1;
    
    // Call retry callback
    this.retryConfig.onRetry?.(config.__retryCount, error);

    // Calculate delay with exponential backoff
    const delay = this.retryConfig.retryDelay * Math.pow(2, config.__retryCount - 1);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    // Reset metadata for new request
    config.metadata = { startTime: Date.now() };

    return this.client.request(config);
  }

  private enhanceError(error: any): Error {
    const enhancedError = new Error();
    
    if (error.response) {
      // Server responded with error status
      enhancedError.name = 'APIResponseError';
      enhancedError.message = error.response.data?.detail || 
                              error.response.data?.message || 
                              `HTTP ${error.response.status}: ${error.response.statusText}`;
      (enhancedError as any).status = error.response.status;
      (enhancedError as any).data = error.response.data;
    } else if (error.request) {
      // Request was made but no response received
      enhancedError.name = 'APINetworkError';
      enhancedError.message = 'Network error - please check your connection and try again';
    } else {
      // Something else happened
      enhancedError.name = 'APIError';
      enhancedError.message = error.message || 'An unexpected error occurred';
    }

    (enhancedError as any).originalError = error;
    return enhancedError;
  }

  // Public methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // File upload method with progress tracking
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('audio_file', file);
    
    // Add additional form data
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const config: AxiosRequestConfig = {
      headers: {
        // Don't set Content-Type - let browser set it with boundary
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
      // Longer timeout for file uploads
      timeout: 60000
    };

    const response = await this.client.post(url, formData, config);
    return response.data;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  }

  // Get client instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export for backward compatibility
export default apiClient;

// Types for API responses
export interface ProcessingResult {
  transcript: string;
  confidence: number;
  language: string;
  emotions: EmotionResult[];
  totalProcessingTime?: number;
}

export interface EmotionResult {
  emotion: string;
  confidence: number;
  timestamp: number;
}

export interface SupportedLanguages {
  [key: string]: string;
}

export interface SupportedEmotions {
  emotions: string[];
  descriptions: { [key: string]: string };
}

// API Functions
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

    const url = `/api/process-audio${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    // Upload file with progress tracking
    const result = await apiClient.uploadFile(url, audioFile, {
      language: language || 'auto',
      auto_detect: autoDetect.toString()
    }, onProgress);
    
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
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. The file might be too large or the server is busy. Please try again.');
    } else if (error.status === 413) {
      throw new Error('File too large. Please select a smaller audio file.');
    } else if (error.status === 415) {
      throw new Error('Unsupported file format. Please use WAV, MP3, or other common audio formats.');
    } else if (error.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    } else if (error.status === 0 || error.message.includes('CORS')) {
      throw new Error('Connection blocked. Please try refreshing the page or contact support.');
    } else if (error.status >= 500) {
      throw new Error('Server error. Please try again in a few moments.');
    }
    
    throw new Error(error.message || 'Failed to process audio file');
  }
};

export const getSupportedLanguages = async () => {
  try {
    if (debugMode) {
      console.log('📋 Fetching supported languages...');
    }

    return await apiClient.get('/api/api/supported-languages');
  } catch (error: any) {
    console.error('❌ Failed to get supported languages:', error);
    throw new Error(error.message || 'Failed to get supported languages');
  }
};

export const getSupportedEmotions = async (): Promise<SupportedEmotions> => {
  try {
    if (debugMode) {
      console.log('😊 Fetching supported emotions...');
    }

    return await apiClient.get('/api/api/supported-emotions');
  } catch (error: any) {
    console.error('❌ Failed to get supported emotions:', error);
    throw new Error(error.message || 'Failed to get supported emotions');
  }
};

export const getModelInfo = async () => {
  try {
    if (debugMode) {
      console.log('ℹ️ Fetching model information...');
    }

    return await apiClient.get('/api/api/model-info');
  } catch (error: any) {
    console.error('❌ Failed to get model info:', error);
    throw new Error(error.message || 'Failed to get model information');
  }
};

export const healthCheck = async () => {
  try {
    return await apiClient.get('/api/health');
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    throw new Error(error.message || 'Health check failed');
  }
};