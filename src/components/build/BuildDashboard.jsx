import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PhaseStepper } from './PhaseStepper';
import { CardLog } from './CardLog';
import { TaskCard } from './TaskCard';
import { BlockerCard } from './BlockerCard';
import { ContextCard } from './ContextCard';
import { PauseScreen } from './PauseScreen';
import { CompletionScreen } from './CompletionScreen';
import { ToolActivityFeed } from './ToolActivityFeed';
import { LoadingStatus } from '../LoadingStatus';
import './BuildDashboard.css';

function isNoiseLine(line) {
  const t = line.trim();
  if (!t || t.length <= 2) return true;
  return false;
}

function classifyLine(line) {
  const t = line.trim();
  if (/^\[?(INFO|SYS)\]?/i.test(t) || /^(Reading|Scanning|Analyzing|Creating|Writing|Planning)/i.test(t)) return 'info';
  if (/^\[?(DONE|OK|SUCCESS|PASS)\]?/i.test(t) || /^(✓|Created|Completed|Merged|Tests? pass)/i.test(t)) return 'done';
  if (/^\[?(ERROR|FAIL|ERR)\]?/i.test(t) || /^(✗|Failed|Error)/i.test(t)) return 'error';
  if (/^\[?(WARN)\]?/i.test(t)) return 'warn';
  if (/^(Launching agent|Dispatching|Spawning|Agent)/i.test(t)) return 'agent';
  if (/^(feat|fix|chore|refactor|test|docs)\(/i.test(t)) return 'commit';
  return 'default';
}

export function BuildDashboard({ onComplete }) {
  const [phases, setPhases] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('');
  const [completedPhases, setCompletedPhases] = useState([]);
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({ agents: 0, decisions: 0, tests: 0, artifacts: 0 });
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [summary, setSummary] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleEvent = (event) => {
      switch (event.type) {
        case 'forge:phase':
          if (event.phase) {
            setCurrentPhase((prev) => {
              if (prev && prev !== event.phase) {
                setCompletedPhases((cp) => [...cp, prev]);
              }
              return event.phase;
            });
          }
          if (event.phaseNames) setPhases(event.phaseNames);
          break;

        case 'forge:task':
          setCards((prev) => [...prev, {
            type: 'task',
            title: event.content || event.status,
            commit: event.content,
            timestamp: new Date().toISOString(),
          }]);
          break;

        case 'forge:agent-spawn':
          setStats((prev) => ({ ...prev, agents: event.count || prev.agents + 1 }));
          break;

        case 'forge:agent-done':
          setStats((prev) => ({ ...prev, agents: event.count || Math.max(0, prev.agents - 1) }));
          break;

        case 'forge:decision':
        case 'decision:lock':
          setStats((prev) => ({ ...prev, decisions: prev.decisions + 1 }));
          break;

        case 'forge:blocker':
          setCards((prev) => [...prev, {
            type: 'blocker',
            title: `Blocker: ${event.content || event.type}`,
            description: event.content,
          }]);
          break;

        case 'forge:context-warning':
          setCards((prev) => [...prev, {
            type: 'context',
            phase: currentPhase,
            pct: event.pct,
          }]);
          break;

        case 'forge:complete':
          setComplete(true);
          setSummary(event.summary || {});
          if (onComplete) onComplete();
          break;
      }
    };

    window.forgeAPI.onForgeEvent(handleEvent);

    // Raw output → styled build log (text is clean from stream-json, no ANSI stripping)
    if (window.forgeAPI.onRawOutput) {
      window.forgeAPI.onRawOutput((text) => {
        const lines = text.split('\n');
        const meaningful = lines
          .map(l => l.trimEnd())
          .filter(l => !isNoiseLine(l));

        if (meaningful.length > 0) {
          setLogLines(prev => {
            const next = [...prev, ...meaningful.map(l => ({
              text: l.trim(),
              type: classifyLine(l),
              time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            }))];
            return next.slice(-300);
          });
        }
      });
    }
  }, [currentPhase, onComplete]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const handleResume = useCallback((instructions) => {
    setPaused(false);
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('resume', { instructions: instructions || '' });
    }
  }, []);

  const handleSkipMock = useCallback(() => {
    if (window.forgeAPI) window.forgeAPI.sendForgeResponse('skip-mock', {});
  }, []);

  if (complete) {
    return <CompletionScreen summary={summary} />;
  }

  if (paused) {
    return <PauseScreen phase={currentPhase} taskProgress={`${cards.length} tasks`} onResume={handleResume} />;
  }

  const hasStructuredCards = cards.length > 0;

  return (
    <div className="build-dashboard">
      <PhaseStepper
        phases={phases}
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        stats={stats}
      />
      <div className="build-dashboard__content">
        {/* Structured cards if forge events arrive */}
        {hasStructuredCards && (
          <CardLog>
            {cards.map((card, i) => {
              switch (card.type) {
                case 'task':
                  return <TaskCard key={i} {...card} expanded={i === cards.length - 1} />;
                case 'blocker':
                  return <BlockerCard key={i} title={card.title} description={card.description} onSkipMock={handleSkipMock} />;
                case 'context':
                  return <ContextCard key={i} phase={card.phase} taskProgress={`${card.pct}% context used`} onResume={() => handleResume('')} />;
                default:
                  return null;
              }
            })}
          </CardLog>
        )}

        {/* Tool activity feed — real-time tool calls from stream-json */}
        <ToolActivityFeed />

        {/* Build log — always visible, styled like Stitch diagnostic feed */}
        <div className="build-log" ref={logRef}>
          <div className="build-log__header">
            <span className="build-log__header-dot" />
            <span className="build-log__header-text">Build Log</span>
          </div>
          <div className="build-log__body">
            {logLines.length === 0 && (
              <div className="build-log__waiting">
                <LoadingStatus interval={2500} />
              </div>
            )}
            {logLines.map((line, i) => (
              <div key={i} className={`build-log__line build-log__line--${line.type}`}>
                <span className="build-log__time">{line.time}</span>
                <span className="build-log__text">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
