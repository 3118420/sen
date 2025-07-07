import { useCallback, useRef, useState } from 'react';

export interface GestureState {
  isSwipeLeft: boolean;
  isSwipeRight: boolean;
  isSwipeUp: boolean;
  isSwipeDown: boolean;
  isPinching: boolean;
  pinchScale: number;
  isLongPress: boolean;
}

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onLongPress?: () => void;
}

export const useGestureControls = (handlers: GestureHandlers = {}) => {
  const [gestureState, setGestureState] = useState<GestureState>({
    isSwipeLeft: false,
    isSwipeRight: false,
    isSwipeUp: false,
    isSwipeDown: false,
    isPinching: false,
    pinchScale: 1,
    isLongPress: false
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchesRef = useRef<TouchList | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    lastTouchesRef.current = e.touches;

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setGestureState(prev => ({ ...prev, isLongPress: true }));
      handlers.onLongPress?.();
    }, 500);

    // Handle pinch start
    if (e.touches.length === 2) {
      setGestureState(prev => ({ ...prev, isPinching: true }));
    }
  }, [handlers.onLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && lastTouchesRef.current?.length === 2) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const lastDistance = Math.hypot(
        lastTouchesRef.current[0].clientX - lastTouchesRef.current[1].clientX,
        lastTouchesRef.current[0].clientY - lastTouchesRef.current[1].clientY
      );

      const scale = currentDistance / lastDistance;
      setGestureState(prev => ({ ...prev, pinchScale: prev.pinchScale * scale }));
      handlers.onPinch?.(scale);
    }

    lastTouchesRef.current = e.touches;
  }, [handlers.onPinch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touchStart = touchStartRef.current;
    if (!touchStart || e.touches.length > 0) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Minimum swipe distance and maximum time for swipe detection
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (deltaTime > maxSwipeTime) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > minSwipeDistance && absX > absY) {
      // Horizontal swipe
      if (deltaX > 0) {
        setGestureState(prev => ({ ...prev, isSwipeRight: true }));
        handlers.onSwipeRight?.();
        setTimeout(() => setGestureState(prev => ({ ...prev, isSwipeRight: false })), 100);
      } else {
        setGestureState(prev => ({ ...prev, isSwipeLeft: true }));
        handlers.onSwipeLeft?.();
        setTimeout(() => setGestureState(prev => ({ ...prev, isSwipeLeft: false })), 100);
      }
    } else if (absY > minSwipeDistance && absY > absX) {
      // Vertical swipe
      if (deltaY > 0) {
        setGestureState(prev => ({ ...prev, isSwipeDown: true }));
        handlers.onSwipeDown?.();
        setTimeout(() => setGestureState(prev => ({ ...prev, isSwipeDown: false })), 100);
      } else {
        setGestureState(prev => ({ ...prev, isSwipeUp: true }));
        handlers.onSwipeUp?.();
        setTimeout(() => setGestureState(prev => ({ ...prev, isSwipeUp: false })), 100);
      }
    }

    // Reset gesture state
    setGestureState(prev => ({
      ...prev,
      isPinching: false,
      pinchScale: 1,
      isLongPress: false
    }));

    touchStartRef.current = null;
    lastTouchesRef.current = null;
  }, [handlers.onSwipeLeft, handlers.onSwipeRight, handlers.onSwipeUp, handlers.onSwipeDown]);

  const gestureProps = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style: { touchAction: 'none' }
  };

  return {
    gestureState,
    gestureProps
  };
};