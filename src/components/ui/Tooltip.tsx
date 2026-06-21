import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div ref={tooltipRef} className={`tooltip tooltip--${position}`}>
          {content}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
}

// HelpBadge component for inline help
interface HelpBadgeProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpBadge({ text, position = 'top' }: HelpBadgeProps) {
  return (
    <Tooltip content={text} position={position}>
      <span className="help-badge">?</span>
    </Tooltip>
  );
}

// Feature highlight for onboarding
interface FeatureHighlightProps {
  id: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
  onDismiss?: () => void;
  show?: boolean;
}

export function FeatureHighlight({
  id,
  title,
  description,
  position = 'bottom',
  children,
  onDismiss,
  show = true,
}: FeatureHighlightProps) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`feature-dismissed-${id}`) === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem(`feature-dismissed-${id}`, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed || !show) {
    return <>{children}</>;
  }

  return (
    <div className="feature-highlight-wrapper">
      {children}
      <div className={`feature-highlight feature-highlight--${position}`}>
        <div className="feature-highlight-content">
          <h4>{title}</h4>
          <p>{description}</p>
          <button className="btn btn--sm" onClick={handleDismiss}>
            Got it
          </button>
        </div>
        <div className="feature-highlight-arrow" />
      </div>
    </div>
  );
}
