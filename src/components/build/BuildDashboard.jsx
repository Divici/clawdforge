import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { CardLog } from './CardLog';
import { TaskCard } from './TaskCard';
import { BlockerCard } from './BlockerCard';
import { PauseScreen } from './PauseScreen';
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

/** Classify a line into a structured event for the Activity column, or null if not notable. */
function classifyEvent(line) {
  const t = line.trim();
  // Commits
  if (/^(feat|fix|chore|refactor|test|docs)\(/i.test(t)) {
    return { category: 'commit', icon: '\u25CF', label: t };
  }
  // Agent spawns
  if (/^(Launching agent|Dispatching|Spawning)/i.test(t)) {
    return { category: 'agent', icon: '\u25B6', label: t };
  }
  // Test results
  const testMatch = t.match(/(\d+)\s+tests?\s+(pass|fail)/i) || t.match(/^(All\s+\d+\s+tests)/i);
  if (testMatch || /^Tests?\s+pass/i.test(t)) {
    return { category: 'test', icon: '\u2713', label: t };
  }
  // Phase transitions
  if (/^(Phase|Now |Starting phase|Moving to)/i.test(t)) {
    return { category: 'phase', icon: '\u25C8', label: t };
  }
  // Errors
  if (/^(ERROR|FAIL|✗|Failed)/i.test(t)) {
    return { category: 'error', icon: '\u2717', label: t };
  }
  // Completions
  if (/^(✓|Created|Completed|Merged|Build complete|Build succeeds)/i.test(t)) {
    return { category: 'done', icon: '\u2713', label: t };
  }
  return null;
}

/** Extract counter signals from a raw line. Returns an object of deltas. */
function extractCounterSignals(line) {
  const t = line.trim();
  const signals = {};
  if (/^(Launching agent|Dispatching|Spawning)/i.test(t)) {
    signals.agentSpawned = 1;
  }
  if (/^(Agent completed|Agent finished|Agent done)/i.test(t)) {
    signals.agentCompleted = 1;
  }
  const testMatch = t.match(/^(\d+)\s+tests?\s+pass/i) || t.match(/^All\s+(\d+)\s+tests/i);
  if (testMatch) {
    signals.testCount = parseInt(testMatch[1], 10);
  }
  if (/^(✓|Completed|Merged|Task complete)/i.test(t) && !/^(✓ Saved|Completed build)/i.test(t)) {
    signals.taskCompleted = 1;
  }
  if (/^(Phase .+ complete|Completed phase|Moving to)/i.test(t)) {
    signals.phaseCompleted = 1;
  }
  return signals;
}

export function BuildDashboard({ state, buildState, onComplete }) {
  const [paused, setPaused] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [events, setEvents] = useState([]);
  const [parsedCounters, setParsedCounters] = useState({
    agents: 0, agentsCompleted: 0, tests: 0, tasks: 0, phases: 0,
  });
  const logRef = useRef(null);
  const eventsRef = useRef(null);

  const buildPhases = buildState?.phases || [];
  const phaseNames = buildPhases.map(p => p.name);
  const currentPhase = state?.build?.currentPhase || '';
  const completedPhases = state?.build?.completedPhases || [];
  const blockers = state?.build?.blockers || [];
  const stateAgents = buildState?.agents || { active: 0, totalSpawned: 0, totalCompleted: 0 };
  const stateSummary = buildState?.summary || null;
  const isComplete = state?.mode === 'complete';

  const totalTasks = buildPhases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const completedTasks = buildPhases.reduce((sum, p) =>
    sum + (p.tasks?.filter(t => t.status === 'complete').length || 0), 0);

  // Use buildState values if available, otherwise fall back to parsed counters
  const displayAgents = stateAgents.totalSpawned || parsedCounters.agents;
  const displayTests = stateSummary?.tests || parsedCounters.tests || '\u2014';
  const displayTasks = completedTasks || parsedCounters.tasks;
  const displayPhases = completedPhases.length || parsedCounters.phases;

  // Build log from raw claude:text events
  useEffect(() => {
    if (!window.forgeAPI?.onRawOutput) return;
    window.forgeAPI.onRawOutput((text) => {
      const lines = text.split('\n');
      const meaningful = lines
        .map(l => l.trimEnd())
        .filter(l => l.trim() && l.trim().length > 2);

      if (meaningful.length > 0) {
        const now = new Date().toLocaleTimeString('en-US', { hour12: false });
        const newLines = meaningful.map(l => ({
          text: l.trim(),
          type: classifyLine(l),
          time: now,
        }));

        setLogLines(prev => [...prev, ...newLines].slice(-300));

        // Extract structured events for Activity column
        const newEvents = [];
        for (const l of meaningful) {
          const evt = classifyEvent(l);
          if (evt) newEvents.push({ ...evt, time: now });
        }
        if (newEvents.length > 0) {
          setEvents(prev => [...prev, ...newEvents].slice(-100));
        }

        // Parse counter signals from output
        for (const l of meaningful) {
          const signals = extractCounterSignals(l);
          if (Object.keys(signals).length > 0) {
            setParsedCounters(prev => ({
              agents: prev.agents + (signals.agentSpawned || 0),
              agentsCompleted: prev.agentsCompleted + (signals.agentCompleted || 0),
              tests: signals.testCount || prev.tests,
              tasks: prev.tasks + (signals.taskCompleted || 0),
              phases: prev.phases + (signals.phaseCompleted || 0),
            }));
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  useEffect(() => {
    if (eventsRef.current) eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
  }, [events]);

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

  if (paused) {
    return <PauseScreen phase={currentPhase} taskProgress={`${completedTasks}/${totalTasks} tasks`} onResume={handleResume} />;
  }

  const unresolvedBlockers = blockers.filter(b => !b.resolved);
  const stepLabel = completedPhases.length + (currentPhase ? 1 : 0);

  return (
    <div className="build-dashboard">
      {/* Stepper */}
      <section className="build-stepper">
        <div className="build-stepper__header">
          <span className="build-stepper__phase-label">Build Phase{currentPhase ? `: ${currentPhase}` : ''}</span>
          <span className="build-stepper__step-count">
            Phase {String(stepLabel).padStart(2, '0')} / {String(phaseNames.length || '?').padStart(2, '0')}
          </span>
        </div>
        {phaseNames.length > 0 && (
          <>
            <div className="build-stepper__bar" style={{ gridTemplateColumns: `repeat(${phaseNames.length}, 1fr)` }}>
              {phaseNames.map((name) => {
                const isComp = completedPhases.includes(name);
                const isCurr = currentPhase === name;
                let cls = 'build-stepper__segment';
                if (isComp) cls += ' build-stepper__segment--complete';
                else if (isCurr) cls += ' build-stepper__segment--active';
                else cls += ' build-stepper__segment--future';
                return <div key={name} className={cls} />;
              })}
            </div>
            <div className="build-stepper__labels" style={{ gridTemplateColumns: `repeat(${phaseNames.length}, 1fr)` }}>
              {phaseNames.map((name) => {
                const isCurr = currentPhase === name;
                const isComp = completedPhases.includes(name);
                let cls = 'build-stepper__label';
                if (isCurr) cls += ' build-stepper__label--active';
                else if (!isComp) cls += ' build-stepper__label--future';
                return <span key={name} className={cls}>{name}</span>;
              })}
            </div>
          </>
        )}
        <div className="build-stepper__stats">
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{displayAgents}</span> agents
          </span>
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{displayTasks}</span>/{totalTasks || '\u2014'} tasks
          </span>
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{displayTests}</span> tests
          </span>
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{displayPhases}</span>/{phaseNames.length || '\u2014'} phases
          </span>
        </div>
      </section>

      {/* Blockers */}
      {unresolvedBlockers.length > 0 && (
        <div className="build-dashboard__blockers">
          {unresolvedBlockers.map((b, i) => (
            <BlockerCard key={`b-${i}`} title={`Blocker: ${b.message || b.type}`} description={b.message} onSkipMock={handleSkipMock} />
          ))}
        </div>
      )}

      {/* Two-column content: activity highlights | full build log */}
      <div className="build-dashboard__columns">
        {/* Left: structured activity events (commits, agents, tests, phases) */}
        <div className="build-dashboard__highlights" ref={eventsRef}>
          <div className="build-dashboard__col-header">
            <span className="build-dashboard__col-dot build-dashboard__col-dot--green" />
            <span className="build-dashboard__col-title">Activity</span>
            <span className="build-dashboard__col-count">{events.length}</span>
          </div>
          <div className="build-dashboard__col-body">
            {events.length === 0 && (
              <div className="build-dashboard__col-waiting">
                <LoadingStatus prefix={currentPhase ? `Building ${currentPhase}` : 'Starting build'} />
              </div>
            )}
            {events.map((evt, i) => (
              <div key={i} className={`build-event build-event--${evt.category}`}>
                <span className="build-event__icon">{evt.icon}</span>
                <span className="build-event__label">{evt.label}</span>
                <span className="build-event__time">{evt.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: full build log */}
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
