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

/**
 * BuildDashboard — renders build state from .forge/ disk files.
 * Phases, tasks, blockers from build-state.json.
 * Tool activity from stream-json events (unchanged).
 * Raw build log from claude:text events (unchanged).
 */
export function BuildDashboard({ state, buildState, onComplete }) {
  const [paused, setPaused] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const logRef = useRef(null);

  // Derive state from disk files
  const buildPhases = buildState?.phases || [];
  const phaseNames = buildPhases.map(p => p.name);
  const currentPhase = state?.build?.currentPhase || '';
  const completedPhases = state?.build?.completedPhases || [];
  const blockers = state?.build?.blockers || [];
  const agents = buildState?.agents || { active: 0, totalSpawned: 0, totalCompleted: 0 };
  const summary = buildState?.summary || null;
  const isComplete = state?.mode === 'complete';

  // Flatten tasks from all phases for the card log
  const allTasks = buildPhases.flatMap(phase =>
    (phase.tasks || []).map(t => ({
      type: 'task',
      title: t.description || t.commit || t.id,
      commit: t.commit,
      timestamp: t.completedAt || '',
      status: t.status,
    }))
  );

  // Build log from raw claude:text events
  useEffect(() => {
    if (!window.forgeAPI?.onRawOutput) return;
    window.forgeAPI.onRawOutput((text) => {
      const lines = text.split('\n');
      const meaningful = lines
        .map(l => l.trimEnd())
        .filter(l => l.trim() && l.trim().length > 2);

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
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  // Completion detection
  useEffect(() => {
    if (isComplete && onComplete) onComplete();
  }, [isComplete, onComplete]);

  const handleResume = useCallback((instructions) => {
    setPaused(false);
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('resume', { instructions: instructions || '' });
    }
  }, []);

  const handleSkipMock = useCallback(() => {
    if (window.forgeAPI) window.forgeAPI.sendForgeResponse('skip-mock', {});
  }, []);

  const stats = {
    agents: agents.active,
    decisions: 0,
    tests: summary?.tests || 0,
    artifacts: 0,
  };

  if (isComplete) {
    return <CompletionScreen summary={summary} />;
  }

  if (paused) {
    return <PauseScreen phase={currentPhase} taskProgress={`${allTasks.length} tasks`} onResume={handleResume} />;
  }

  // Build blocker cards from state
  const blockerCards = blockers
    .filter(b => !b.resolved)
    .map(b => ({
      type: 'blocker',
      title: `Blocker: ${b.message || b.type}`,
      description: b.message,
      id: b.id,
    }));

  const hasCards = allTasks.length > 0 || blockerCards.length > 0;

  return (
    <div className="build-dashboard">
      <PhaseStepper
        phases={phaseNames}
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        stats={stats}
      />
      <div className="build-dashboard__content">
        {hasCards && (
          <CardLog>
            {allTasks.map((card, i) => (
              <TaskCard key={i} {...card} expanded={i === allTasks.length - 1} />
            ))}
            {blockerCards.map((card, i) => (
              <BlockerCard key={`b-${i}`} title={card.title} description={card.description} onSkipMock={handleSkipMock} />
            ))}
          </CardLog>
        )}

        {/* Tool activity feed — real-time tool calls from stream-json */}
        <ToolActivityFeed />

        {/* Build log — always visible */}
        <div className="build-log" ref={logRef}>
          <div className="build-log__header">
            <span className="build-log__header-dot" />
            <span className="build-log__header-text">Build Log</span>
          </div>
          <div className="build-log__body">
            {logLines.length === 0 && (
              <div className="build-log__waiting">
                <LoadingStatus />
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
