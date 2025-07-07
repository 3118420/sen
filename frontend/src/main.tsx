import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { CloudWatchProvider } from './components/CloudWatchProvider';
import { ToastContainer, useToast } from './components/ToastNotification';
import ErrorBoundary from './components/ErrorBoundary';
import { logEnvironmentInfo, debugMode } from './config/environment';
import './index.css';

// Log environment info on startup
if (debugMode) {
  logEnvironmentInfo();
}

function AppWithProviders() {
  const { toasts, removeToast } = useToast();

  return (
    <ErrorBoundary>
      <CloudWatchProvider>
        <App />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </CloudWatchProvider>
    </ErrorBoundary>
  );
}

// Add global error handlers for unhandled errors
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
  if (debugMode) {
    console.error('Error details:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  if (debugMode) {
    console.error('Rejection details:', {
      reason: event.reason,
      promise: event.promise
    });
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithProviders />
  </StrictMode>
);