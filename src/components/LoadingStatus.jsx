import { useState, useEffect, useRef } from 'preact/hooks';
import './LoadingStatus.css';

const LOADING_MESSAGES = [
  'Analyzing project structure...',
  'Reading requirements...',
  'Evaluating constraints...',
  'Exploring codebase...',
  'Researching options...',
  'Comparing architectures...',
  'Churning through decisions...',
  'Mapping dependencies...',
  'Checking compatibility...',
  'Weighing trade-offs...',
  'Building mental model...',
  'Deep in thought...',
  'Scanning for patterns...',
  'Almost there...',
  'Still thinking...',
  'Crunching possibilities...',
  'Forging ahead...',
];

/**
 * Rotating loading status messages, similar to Claude CLI's loading indicators.
 * Cycles through messages at a set interval with a fade transition.
 */
export function LoadingStatus({ interval = 6000, prefix = '' }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFading(false);
      }, 300);
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [interval]);

  return (
    <div className={`loading-status ${fading ? 'loading-status--fading' : ''}`}>
      {prefix && <span className="loading-status__prefix">{prefix}</span>}
      <span className="loading-status__dot" />
      <span className="loading-status__text">{LOADING_MESSAGES[index]}</span>
    </div>
  );
}
