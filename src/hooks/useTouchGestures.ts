import { useRef, useCallback, useEffect } from 'react';
import type { TouchState, Point } from '../utils/touch-handlers';
import {
  createTouchState,
  processTouchStart,
  processTouchMove,
  processTouchEnd,
  isTap,
  isHorizontalSwipe,
  isVerticalSwipe,
} from '../utils/touch-handlers';

export interface TouchGestureCallbacks {
  onPinch?: (scale: number, center: Point) => void;
  onPan?: (delta: Point) => void;
  onTap?: (point: Point) => void;
  onDoubleTap?: (point: Point) => void;
  onLongPress?: (point: Point) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface UseTouchGesturesOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks,
  options: UseTouchGesturesOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    longPressDelay = 500,
    doubleTapDelay = 300,
  } = options;

  const stateRef = useRef<TouchState>(createTouchState());
  const startPointRef = useRef<Point | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<number | null>(null);
  const currentScaleRef = useRef(1);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    const state = stateRef.current;
    processTouchStart(state, e, currentScaleRef.current);

    if (e.touches.length === 1) {
      const point = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startPointRef.current = point;
      state.initialCenter = point;

      // Set up long press detection
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        if (callbacks.onLongPress && startPointRef.current) {
          callbacks.onLongPress(startPointRef.current);
        }
      }, longPressDelay);
    }
  }, [enabled, preventDefault, longPressDelay, callbacks, clearLongPressTimer]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    clearLongPressTimer();

    const state = stateRef.current;
    const result = processTouchMove(state, e);

    if (result) {
      if (result.scale !== undefined && callbacks.onPinch && state.initialCenter) {
        currentScaleRef.current = result.scale;
        callbacks.onPinch(result.scale, state.initialCenter);
      }
      if (result.pan && callbacks.onPan) {
        callbacks.onPan(result.pan);
      }
    }
  }, [enabled, preventDefault, callbacks, clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    if (preventDefault) e.preventDefault();

    clearLongPressTimer();

    const state = stateRef.current;
    const endPoint = e.changedTouches.length > 0
      ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
      : null;

    if (endPoint && startPointRef.current) {
      // Check for tap
      if (isTap(startPointRef.current, endPoint)) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < doubleTapDelay) {
          // Double tap
          if (callbacks.onDoubleTap) {
            callbacks.onDoubleTap(endPoint);
          }
          lastTapTimeRef.current = 0;
        } else {
          // Single tap
          if (callbacks.onTap) {
            callbacks.onTap(endPoint);
          }
          lastTapTimeRef.current = now;
        }
      } else {
        // Check for swipes
        const hSwipe = isHorizontalSwipe(startPointRef.current, endPoint);
        const vSwipe = isVerticalSwipe(startPointRef.current, endPoint);

        if (hSwipe === 'left' && callbacks.onSwipeLeft) {
          callbacks.onSwipeLeft();
        } else if (hSwipe === 'right' && callbacks.onSwipeRight) {
          callbacks.onSwipeRight();
        } else if (vSwipe === 'up' && callbacks.onSwipeUp) {
          callbacks.onSwipeUp();
        } else if (vSwipe === 'down' && callbacks.onSwipeDown) {
          callbacks.onSwipeDown();
        }
      }
    }

    processTouchEnd(state, e);
    startPointRef.current = null;
  }, [enabled, preventDefault, doubleTapDelay, callbacks, clearLongPressTimer]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [elementRef, enabled, preventDefault, handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);

  // Return methods for manual control
  return {
    resetScale: () => { currentScaleRef.current = 1; },
    setScale: (scale: number) => { currentScaleRef.current = scale; },
  };
}

// Hook for simple pinch-to-zoom on a canvas or container
export function usePinchZoom(
  elementRef: React.RefObject<HTMLElement>,
  options: {
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onZoomChange?: (zoom: number) => void;
  } = {}
) {
  const {
    initialZoom = 1,
    minZoom = 0.5,
    maxZoom = 3,
    onZoomChange,
  } = options;

  const zoomRef = useRef(initialZoom);

  const handlePinch = useCallback((scale: number) => {
    const newZoom = Math.max(minZoom, Math.min(maxZoom, scale));
    zoomRef.current = newZoom;
    onZoomChange?.(newZoom);
  }, [minZoom, maxZoom, onZoomChange]);

  useTouchGestures(elementRef, {
    onPinch: handlePinch,
  });

  return {
    zoom: zoomRef.current,
    setZoom: (zoom: number) => { zoomRef.current = zoom; },
  };
}
