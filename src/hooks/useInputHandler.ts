import { useRef, useCallback } from 'react';

export interface InputState {
  isPressed: boolean;
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

export interface InputHandler {
  inputState: React.MutableRefObject<InputState>;
  handleTouchStart: (x: number, y: number) => void;
  handleTouchMove: (x: number, y: number) => void;
  handleTouchEnd: () => void;
  getMovementVector: () => { x: number; y: number };
  isActive: () => boolean;
}

export const useInputHandler = (
  deadzone: number = 10,
  sensitivity: number = 1.0
): InputHandler => {
  const inputState = useRef<InputState>({
    isPressed: false,
    currentX: 0,
    currentY: 0,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
  });

  const handleTouchStart = useCallback((x: number, y: number) => {
    inputState.current = {
      isPressed: true,
      currentX: x,
      currentY: y,
      startX: x,
      startY: y,
      deltaX: 0,
      deltaY: 0,
    };
  }, []);

  const handleTouchMove = useCallback((x: number, y: number) => {
    if (!inputState.current.isPressed) return;

    inputState.current.currentX = x;
    inputState.current.currentY = y;
    inputState.current.deltaX = x - inputState.current.startX;
    inputState.current.deltaY = y - inputState.current.startY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    inputState.current.isPressed = false;
    inputState.current.deltaX = 0;
    inputState.current.deltaY = 0;
  }, []);

  const getMovementVector = useCallback((): { x: number; y: number } => {
    if (!inputState.current.isPressed) {
      return { x: 0, y: 0 };
    }

    let { deltaX, deltaY } = inputState.current;

    // Apply deadzone
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < deadzone) {
      return { x: 0, y: 0 };
    }

    // Apply sensitivity
    deltaX *= sensitivity;
    deltaY *= sensitivity;

    // Normalize if too large
    const maxDistance = 200;
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      deltaX *= scale;
      deltaY *= scale;
    }

    return { x: deltaX, y: deltaY };
  }, [deadzone, sensitivity]);

  const isActive = useCallback((): boolean => {
    return inputState.current.isPressed;
  }, []);

  return {
    inputState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getMovementVector,
    isActive,
  };
};

// Touch event utilities
export const extractTouchCoordinates = (event: any): { x: number; y: number } => {
  if (event.nativeEvent?.touches?.[0]) {
    return {
      x: event.nativeEvent.touches[0].pageX,
      y: event.nativeEvent.touches[0].pageY,
    };
  }

  if (event.nativeEvent?.changedTouches?.[0]) {
    return {
      x: event.nativeEvent.changedTouches[0].pageX,
      y: event.nativeEvent.changedTouches[0].pageY,
    };
  }

  // Fallback for mouse events
  return {
    x: event.nativeEvent?.pageX || 0,
    y: event.nativeEvent?.pageY || 0,
  };
};

// Gesture recognition utilities
export interface GestureRecognizer {
  onSwipe: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void;
  onTap: (x: number, y: number) => void;
  onLongPress: (x: number, y: number) => void;
}

export const useGestureRecognizer = (
  callbacks: Partial<GestureRecognizer>,
  options: {
    swipeThreshold?: number;
    longPressThreshold?: number;
    tapThreshold?: number;
  } = {}
) => {
  const {
    swipeThreshold = 50,
    longPressThreshold = 500,
    tapThreshold = 10,
  } = options;

  const gestureState = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    longPressTimer: null as NodeJS.Timeout | null,
  });

  const handleGestureStart = useCallback((x: number, y: number) => {
    gestureState.current.startTime = Date.now();
    gestureState.current.startX = x;
    gestureState.current.startY = y;

    // Start long press timer
    gestureState.current.longPressTimer = setTimeout(() => {
      callbacks.onLongPress?.(x, y);
    }, longPressThreshold);
  }, [callbacks.onLongPress, longPressThreshold]);

  const handleGestureEnd = useCallback((x: number, y: number) => {
    const duration = Date.now() - gestureState.current.startTime;
    const deltaX = x - gestureState.current.startX;
    const deltaY = y - gestureState.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Clear long press timer
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer);
      gestureState.current.longPressTimer = null;
    }

    // Check for tap
    if (distance < tapThreshold && duration < longPressThreshold) {
      callbacks.onTap?.(x, y);
      return;
    }

    // Check for swipe
    if (distance > swipeThreshold) {
      const velocity = distance / duration;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        const direction = deltaX > 0 ? 'right' : 'left';
        callbacks.onSwipe?.(direction, velocity);
      } else {
        // Vertical swipe
        const direction = deltaY > 0 ? 'down' : 'up';
        callbacks.onSwipe?.(direction, velocity);
      }
    }
  }, [callbacks.onSwipe, callbacks.onTap, swipeThreshold, tapThreshold, longPressThreshold]);

  return {
    handleGestureStart,
    handleGestureEnd,
  };
};