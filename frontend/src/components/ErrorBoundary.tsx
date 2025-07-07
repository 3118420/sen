import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from 'lucide-react';
import { env, debugMode, logEnvironmentInfo } from '../config/environment';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log environment info for debugging
    if (debugMode) {
      logEnvironmentInfo();
      console.group('🐛 Error Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Send error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In production, you might want to send this to a monitoring service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        environment: env.environment,
        apiUrl: env.apiUrl,
        errorId: this.state.errorId
      };

      if (debugMode) {
        console.log('📊 Error Report:', errorReport);
      }

      // You can send this to your error tracking service
      // Example: Sentry, LogRocket, etc.
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleReportIssue = () => {
    const errorDetails = encodeURIComponent(
      `Error ID: ${this.state.errorId}\n` +
      `Message: ${this.state.error?.message}\n` +
      `Environment: ${env.environment}\n` +
      `API URL: ${env.apiUrl}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `URL: ${window.location.href}\n` +
      `Timestamp: ${new Date().toISOString()}`
    );
    
    const issueUrl = `https://github.com/your-repo/issues/new?title=Frontend%20Error&body=${errorDetails}`;
    window.open(issueUrl, '_blank');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
              </p>

              {/* Error ID for support */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Error ID: <code className="font-mono">{this.state.errorId}</code>
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRefresh}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </button>
                
                <button
                  onClick={this.handleReportIssue}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Report Issue
                </button>
              </div>

              {/* Development error details */}
              {debugMode && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center">
                    <Bug className="w-4 h-4 mr-1" />
                    Error Details (Development)
                  </summary>
                  <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    <div className="mb-2">
                      <strong>Message:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{this.state.error.message}</pre>
                    </div>
                    
                    {this.state.error.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Environment info for debugging */}
              {debugMode && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-left">
                  <strong>Environment Info:</strong>
                  <div className="mt-1 space-y-1">
                    <div>Environment: {env.environment}</div>
                    <div>API URL: {env.apiUrl}</div>
                    <div>Debug Mode: {debugMode ? 'On' : 'Off'}</div>
                    <div>User Agent: {navigator.userAgent}</div>
                    <div>URL: {window.location.href}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;