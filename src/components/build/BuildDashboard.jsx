import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PhaseStepper } from './PhaseStepper';
import { CardLog } from './CardLog';
import { TaskCard } from './TaskCard';
import { BlockerCard } from './BlockerCard';
import { ContextCard } from './ContextCard';
import { PauseScreen } from './PauseScreen';
import { CompletionScreen } from './CompletionScreen';
import './BuildDashboard.css';

function stripAnsi(text) {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

function isNoiseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.length <= 2) return true;
  if (/^[✻✶✢✽·*●⠂⠐⏵⏸⎿]+$/.test(trimmed)) return true;
  if (trimmed === '>') return true;
  return false;
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
  const [outputLines, setOutputLines] = useState([]);
  const [hasStructuredCards, setHasStructuredCards] = useState(false);
  const outputRef = useRef(null);
  const rawBuffer = useRef('');

  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleEvent = (event) => {
      switch (event.type) {
        case 'forge:phase':
          setHasStructuredCards(true);
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
          setHasStructuredCards(true);
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
          setHasStructuredCards(true);
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

    // Raw output fallback
    if (window.forgeAPI.onRawOutput) {
      window.forgeAPI.onRawOutput((text) => {
        rawBuffer.current += text;
        const cleaned = stripAnsi(rawBuffer.current);
        const lines = cleaned.split('\n');
        rawBuffer.current = lines.pop() || '';
        const meaningful = lines.map(l => l.trimEnd()).filter(l => !isNoiseLine(l));
        if (meaningful.length > 0) {
          setOutputLines(prev => [...prev, ...meaningful].slice(-200));
        }
      });
    }
  }, [currentPhase, onComplete]);

  // Auto-scroll raw output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

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

  return (
    <div className="build-dashboard">
      {(hasStructuredCards && phases.length > 0) && (
        <PhaseStepper
          phases={phases}
          currentPhase={currentPhase}
          completedPhases={completedPhases}
          stats={stats}
        />
      )}
      {hasStructuredCards ? (
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
      ) : (
        <div className="build-dashboard__raw-output" ref={outputRef}>
          {outputLines.map((line, i) => (
            <div key={i} className="build-dashboard__raw-line">{line}</div>
          ))}
          {outputLines.length === 0 && (
            <div className="build-dashboard__waiting">Building autonomously...</div>
          )}
        </div>
      )}
    </div>
  );
}
