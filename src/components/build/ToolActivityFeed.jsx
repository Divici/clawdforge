import { useState, useEffect, useRef } from 'preact/hooks';
import './ToolActivityFeed.css';

const TOOL_ICONS = {
  Read: '📄',
  Edit: '✏️',
  Write: '📝',
  Bash: '⚡',
  Grep: '🔍',
  Glob: '📁',
  Skill: '🔧',
  Agent: '🤖',
  Task: '🤖',
  WebFetch: '🌐',
  WebSearch: '🌐',
  TodoWrite: '📋',
};

function summarizeInput(name, input) {
  if (!input) return '';
  switch (name) {
    case 'Read':
      return input.file_path?.split(/[/\\]/).pop() || '';
    case 'Edit':
      return input.file_path?.split(/[/\\]/).pop() || '';
    case 'Write':
      return input.file_path?.split(/[/\\]/).pop() || '';
    case 'Bash':
      return (input.command || '').slice(0, 60);
    case 'Grep':
      return input.pattern || '';
    case 'Glob':
      return input.pattern || '';
    case 'Skill':
      return input.skill || '';
    case 'Agent':
    case 'Task':
      return (input.description || input.prompt || '').slice(0, 50);
    default:
      return '';
  }
}

export function ToolActivityFeed() {
  const [events, setEvents] = useState([]);
  const feedRef = useRef(null);

  useEffect(() => {
    if (!window.forgeAPI) return;

    if (window.forgeAPI.onToolUse) {
      window.forgeAPI.onToolUse((data) => {
        setEvents((prev) => {
          const next = [...prev, {
            id: data.id,
            name: data.name,
            summary: summarizeInput(data.name, data.input),
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            status: 'running',
          }];
          return next.slice(-100);
        });
      });
    }

    if (window.forgeAPI.onToolResult) {
      window.forgeAPI.onToolResult((data) => {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === data.tool_use_id ? { ...e, status: 'done' } : e
          )
        );
      });
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="tool-feed" ref={feedRef}>
      <div className="tool-feed__header">
        <span className="tool-feed__header-dot" />
        <span className="tool-feed__header-text">Tool Activity</span>
        <span className="tool-feed__count">{events.length}</span>
      </div>
      <div className="tool-feed__body">
        {events.length === 0 && (
          <div className="tool-feed__waiting">
            Waiting for tool activity...
          </div>
        )}
        {events.map((evt, i) => (
          <div
            key={evt.id || i}
            className={`tool-feed__item tool-feed__item--${evt.status}`}
          >
            <span className="tool-feed__icon">
              {TOOL_ICONS[evt.name] || '🔧'}
            </span>
            <span className="tool-feed__name">{evt.name}</span>
            <span className="tool-feed__summary">{evt.summary}</span>
            <span className="tool-feed__time">{evt.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
