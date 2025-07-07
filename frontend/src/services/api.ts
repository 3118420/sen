import axios from 'axios';
import { ProcessingResult, SupportedEmotions } from '../types';

// Set the FastAPI backend URL via Vite environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set. Please check your .env file.');
}

console.log('API Base URL:', API_BASE_URL);

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`Making API request to: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('API response error:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found');
    }
    if (error.response?.status >= 500) {
      throw new Error('Server error - please try again later');
    }
    return Promise.reject(error);
  }
);
/**
 * Uploads the audio file and receives transcript + sentiment analysis result with precise emotions
 * @param audioFile Audio file to be processed
 * @param language Optional language code
 * @param autoDetect Whether to auto-detect language
 * @returns ProcessingResult object from backend
 */
export const processAudio = async (
  audioFile: File, 
  language?: string, 
  autoDetect: boolean = true
): Promise<ProcessingResult> => {
  const startTime = Date.now();

  try {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    // Build query parameters
    const params = new URLSearchParams();
    if (language && language !== 'auto') {
      params.append('language', language);
    }
    params.append('auto_detect', autoDetect.toString());

    const url = `/api/process-audio${params.toString() ? '?' + params.toString() : ''}`;
    
    // Use FormData content type for file uploads
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const totalProcessingTime = (Date.now() - startTime) / 1000;

    return {
      ...response.data,
      totalProcessingTime,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to process audio');
    }
    throw error;
  }
};

/**
 * Detect the language of an audio file
 * @param audioFile Audio file to analyze
 * @returns Language detection result
 */
export const detectLanguage = async (audioFile: File) => {
  try {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    const response = await api.post('/api/detect-language', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to detect language');
    }
    throw error;
  }
};

/**
 * Get supported languages
 * @returns List of supported languages
 */
export const getSupportedLanguages = async () => {
  try {
    const response = await api.get('/api/supported-languages');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to get supported languages');
    }
    throw error;
  }
};

/**
 * Get supported emotions
 * @returns List of supported emotions and categories
 */
export const getSupportedEmotions = async (): Promise<SupportedEmotions> => {
  try {
    const response = await api.get('/api/supported-emotions');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to get supported emotions');
    }
    throw error;
  }
};

/**
 * Analyze sentiment with precise emotions
 * @param text Text to analyze
 * @param language Optional language code
 * @returns Sentiment and emotion analysis result
 */
export const analyzeSentiment = async (text: string, language?: string) => {
  try {
    const params = new URLSearchParams();
    if (language) {
      params.append('language', language);
    }

    const response = await api.post(
      `/api/analyze-sentiment${params.toString() ? '?' + params.toString() : ''}`,
      { text },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to analyze sentiment');
    }
    throw error;
  }
};

/**
 * Get model information
 * @returns Model information and capabilities
 */
export const getModelInfo = async () => {
  try {
    const response = await api.get('/api/model-info');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to get model info');
    }
    throw error;
  }
};