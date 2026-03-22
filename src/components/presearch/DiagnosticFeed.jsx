import { useRef, useEffect } from 'preact/hooks';
import './DiagnosticFeed.css';

export function DiagnosticFeed({ events }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  if (!events || events.length === 0) return null;

  return (
    <section className="diagnostic-feed">
      <h3 className="diagnostic-feed__heading">Diagnostic Feed</h3>
      <div className="diagnostic-feed__list" ref={listRef}>
        {events.map((evt, i) => (
          <p key={i} className="diagnostic-feed__entry">
            <span className={`diagnostic-feed__prefix diagnostic-feed__prefix--${evt.level || 'sys'}`}>
              [{(evt.level || 'SYS').toUpperCase()}]
            </span>
            {' '}{evt.message}
          </p>
        ))}
      </div>
    </section>
  );
}
