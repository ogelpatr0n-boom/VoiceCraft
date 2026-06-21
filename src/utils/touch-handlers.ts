// Touch gesture utilities for mobile support

export interface Point {
  x: number;
  y: number;
}

export interface TouchState {
  touches: Map<number, Point>;
  initialDistance: number | null;
  initialCenter: Point | null;
  initialScale: number;
}

// Calculate distance between two points
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate center point between two points
export function getCenter(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// Get touch point from touch event
export function getTouchPoint(touch: Touch): Point {
  return { x: touch.clientX, y: touch.clientY };
}

// Calculate pinch scale factor
export function getPinchScale(
  currentDistance: number,
  initialDistance: number
): number {
  return currentDistance / initialDistance;
}

// Calculate pan delta from initial position
export function getPanDelta(
  currentCenter: Point,
  initialCenter: Point
): Point {
  return {
    x: currentCenter.x - initialCenter.x,
    y: currentCenter.y - initialCenter.y,
  };
}

// Detect if touch is a tap (minimal movement)
export function isTap(
  startPoint: Point,
  endPoint: Point,
  threshold = 10
): boolean {
  return getDistance(startPoint, endPoint) < threshold;
}

// Detect if gesture is a horizontal swipe
export function isHorizontalSwipe(
  startPoint: Point,
  endPoint: Point,
  minDistance = 50
): 'left' | 'right' | null {
  const dx = endPoint.x - startPoint.x;
  const dy = Math.abs(endPoint.y - startPoint.y);

  if (Math.abs(dx) > minDistance && Math.abs(dx) > dy * 2) {
    return dx > 0 ? 'right' : 'left';
  }
  return null;
}

// Detect if gesture is a vertical swipe
export function isVerticalSwipe(
  startPoint: Point,
  endPoint: Point,
  minDistance = 50
): 'up' | 'down' | null {
  const dy = endPoint.y - startPoint.y;
  const dx = Math.abs(endPoint.x - startPoint.x);

  if (Math.abs(dy) > minDistance && Math.abs(dy) > dx * 2) {
    return dy > 0 ? 'down' : 'up';
  }
  return null;
}

// Create touch state tracker
export function createTouchState(): TouchState {
  return {
    touches: new Map(),
    initialDistance: null,
    initialCenter: null,
    initialScale: 1,
  };
}

// Process touch start event
export function processTouchStart(
  state: TouchState,
  e: TouchEvent,
  currentScale = 1
): void {
  for (const touch of Array.from(e.changedTouches)) {
    state.touches.set(touch.identifier, getTouchPoint(touch));
  }

  if (state.touches.size === 2) {
    const [p1, p2] = Array.from(state.touches.values());
    state.initialDistance = getDistance(p1, p2);
    state.initialCenter = getCenter(p1, p2);
    state.initialScale = currentScale;
  }
}

// Process touch move event
export function processTouchMove(
  state: TouchState,
  e: TouchEvent
): { scale?: number; pan?: Point } | null {
  for (const touch of Array.from(e.changedTouches)) {
    if (state.touches.has(touch.identifier)) {
      state.touches.set(touch.identifier, getTouchPoint(touch));
    }
  }

  if (state.touches.size === 2 && state.initialDistance && state.initialCenter) {
    const [p1, p2] = Array.from(state.touches.values());
    const currentDistance = getDistance(p1, p2);
    const currentCenter = getCenter(p1, p2);

    const scale = state.initialScale * getPinchScale(currentDistance, state.initialDistance);
    const pan = getPanDelta(currentCenter, state.initialCenter);

    return { scale, pan };
  }

  if (state.touches.size === 1) {
    const [p1] = Array.from(state.touches.values());
    if (state.initialCenter) {
      const pan = getPanDelta(p1, state.initialCenter);
      return { pan };
    }
  }

  return null;
}

// Process touch end event
export function processTouchEnd(state: TouchState, e: TouchEvent): void {
  for (const touch of Array.from(e.changedTouches)) {
    state.touches.delete(touch.identifier);
  }

  if (state.touches.size < 2) {
    state.initialDistance = null;
    state.initialCenter = null;
  }

  if (state.touches.size === 1) {
    const [p1] = Array.from(state.touches.values());
    state.initialCenter = p1;
  }
}

// Prevent default and stop propagation for touch events
export function preventTouchDefault(e: TouchEvent): void {
  e.preventDefault();
  e.stopPropagation();
}
