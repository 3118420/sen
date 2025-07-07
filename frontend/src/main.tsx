import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { CloudWatchProvider } from './components/CloudWatchProvider';
import { ToastContainer, useToast } from './components/ToastNotification';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithProviders />
  </StrictMode>
);
