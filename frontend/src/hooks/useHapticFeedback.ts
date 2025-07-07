import { useCallback } from 'react';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticFeedbackHook {
  triggerHaptic: (pattern: HapticPattern) => void;
  isSupported: boolean;
}

export const useHapticFeedback = (): HapticFeedbackHook => {
  const isSupported = 'vibrate' in navigator || 'hapticFeedback' in navigator;

  const triggerHaptic = useCallback((pattern: HapticPattern) => {
    if (!isSupported) return;

    // iOS Haptic Feedback (if available)
    if ('hapticFeedback' in navigator) {
      const hapticFeedback = (navigator as any).hapticFeedback;
      
      switch (pattern) {
        case 'light':
          hapticFeedback?.impactOccurred?.('light');
          break;
        case 'medium':
          hapticFeedback?.impactOccurred?.('medium');
          break;
        case 'heavy':
          hapticFeedback?.impactOccurred?.('heavy');
          break;
        case 'success':
          hapticFeedback?.notificationOccurred?.('success');
          break;
        case 'warning':
          hapticFeedback?.notificationOccurred?.('warning');
          break;
        case 'error':
          hapticFeedback?.notificationOccurred?.('error');
          break;
        case 'selection':
          hapticFeedback?.selectionChanged?.();
          break;
      }
      return;
    }

    // Fallback to vibration API
    if ('vibrate' in navigator) {
      const vibrationPatterns: Record<HapticPattern, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 50,
        success: [10, 50, 10],
        warning: [50, 50, 50],
        error: [100, 50, 100],
        selection: 5
      };

      navigator.vibrate(vibrationPatterns[pattern]);
    }
  }, [isSupported]);

  return {
    triggerHaptic,
    isSupported
  };
};