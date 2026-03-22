import { useRef, useEffect, useState } from 'preact/hooks';
import './CardLog.css';

export function CardLog({ children }) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  });

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(atBottom);
    setShowJump(!atBottom);
  };

  const jumpToLatest = () => {
    setAutoScroll(true);
    setShowJump(false);
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  return (
    <div className="card-log" ref={containerRef} onScroll={handleScroll}>
      <div className="card-log__content">
        {children}
      </div>
      {showJump && (
        <button className="card-log__jump" onClick={jumpToLatest}>
          ↓ Jump to latest
        </button>
      )}
    </div>
  );
}
