// Environment configuration with proper fallbacks and validation
interface EnvironmentConfig {
  apiUrl: string;
  environment: 'development' | 'production' | 'staging';
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableCloudWatch: boolean;
  enableHapticFeedback: boolean;
}

// Validate required environment variables
const validateEnvironment = (): EnvironmentConfig => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    console.error('VITE_API_URL is not defined. Using fallback URL.');
  }

  const config: EnvironmentConfig = {
    apiUrl: apiUrl || 'https://1treu6p055.execute-api.us-east-1.amazonaws.com/prod',
    environment: (import.meta.env.VITE_ENVIRONMENT as any) || 'production',
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV,
    logLevel: (import.meta.env.VITE_LOG_LEVEL as any) || 'error',
    enableCloudWatch: import.meta.env.VITE_ENABLE_CLOUDWATCH !== 'false',
    enableHapticFeedback: import.meta.env.VITE_ENABLE_HAPTIC_FEEDBACK !== 'false'
  };

  // Log configuration in development
  if (config.debugMode) {
    console.log('Environment Configuration:', {
      ...config,
      buildTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href
    });
  }

  return config;
};

export const env = validateEnvironment();

// Export individual values for convenience
export const {
  apiUrl,
  environment,
  debugMode,
  logLevel,
  enableCloudWatch,
  enableHapticFeedback
} = env;

// Helper functions
export const isDevelopment = () => environment === 'development' || import.meta.env.DEV;
export const isProduction = () => environment === 'production' || import.meta.env.PROD;
export const isLocalhost = () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Debug helpers
export const logEnvironmentInfo = () => {
  if (debugMode) {
    console.group('🔧 Environment Debug Info');
    console.log('API URL:', apiUrl);
    console.log('Environment:', environment);
    console.log('Is Development:', isDevelopment());
    console.log('Is Production:', isProduction());
    console.log('Is Localhost:', isLocalhost());
    console.log('Debug Mode:', debugMode);
    console.log('Import Meta Env:', import.meta.env);
    console.log('Window Location:', window.location);
    console.groupEnd();
  }
};