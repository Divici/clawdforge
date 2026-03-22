import { useState, useEffect, useCallback } from 'preact/hooks';
import { PhaseStepper } from './PhaseStepper';
import { CardLog } from './CardLog';
import { TaskCard } from './TaskCard';
import { BlockerCard } from './BlockerCard';
import { ContextCard } from './ContextCard';
import { PauseScreen } from './PauseScreen';
import { CompletionScreen } from './CompletionScreen';
import './BuildDashboard.css';

export function BuildDashboard({ onComplete }) {
  const [phases, setPhases] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('');
  const [completedPhases, setCompletedPhases] = useState([]);
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({ agents: 0, decisions: 0, tests: 0, artifacts: 0 });
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [summary, setSummary] = useState(null);

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
  }, [currentPhase, onComplete]);

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
      <PhaseStepper
        phases={phases}
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        stats={stats}
      />
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
    </div>
  );
}
