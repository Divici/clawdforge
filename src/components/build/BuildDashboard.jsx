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

function isHighlightLine(line) {
  const t = line.trim();
  // Show commits, completions, phase markers, test results, errors, agent activity
  return /^(feat|fix|chore|refactor|test|docs)\(/i.test(t) ||
    /^(✓|✗|Created|Completed|Merged|Tests? pass|All \d+ tests)/i.test(t) ||
    /^(ERROR|FAIL|Build complete|Build succeeds|phase|Now |Let me)/i.test(t) ||
    /^(Launching agent|Agent|Dispatching|Spawning)/i.test(t) ||
    /^\*\*/i.test(t) ||
    /^\d+ tests? (pass|fail)/i.test(t);
}

export function BuildDashboard({ state, buildState, onComplete }) {
  const [paused, setPaused] = useState(false);
  const [logLines, setLogLines] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const logRef = useRef(null);
  const highlightsRef = useRef(null);

  const buildPhases = buildState?.phases || [];
  const phaseNames = buildPhases.map(p => p.name);
  const currentPhase = state?.build?.currentPhase || '';
  const completedPhases = state?.build?.completedPhases || [];
  const blockers = state?.build?.blockers || [];
  const agents = buildState?.agents || { active: 0, totalSpawned: 0, totalCompleted: 0 };
  const summary = buildState?.summary || null;
  const isComplete = state?.mode === 'complete';

  const totalTasks = buildPhases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const completedTasks = buildPhases.reduce((sum, p) =>
    sum + (p.tasks?.filter(t => t.status === 'complete').length || 0), 0);

  // Build log from raw claude:text events
  useEffect(() => {
    if (!window.forgeAPI?.onRawOutput) return;
    window.forgeAPI.onRawOutput((text) => {
      const lines = text.split('\n');
      const meaningful = lines
        .map(l => l.trimEnd())
        .filter(l => l.trim() && l.trim().length > 2);

      if (meaningful.length > 0) {
        const newLines = meaningful.map(l => ({
          text: l.trim(),
          type: classifyLine(l),
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        }));

        setLogLines(prev => [...prev, ...newLines].slice(-300));

        // Extract highlight lines for left column
        const newHighlights = newLines.filter(l => isHighlightLine(l.text));
        if (newHighlights.length > 0) {
          setHighlights(prev => [...prev, ...newHighlights].slice(-100));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  useEffect(() => {
    if (highlightsRef.current) highlightsRef.current.scrollTop = highlightsRef.current.scrollHeight;
  }, [highlights]);

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
            <span className="build-stepper__stat-value">{agents.totalSpawned}</span> agents
          </span>
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{completedTasks}</span>/{totalTasks} tasks
          </span>
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{summary?.tests || '—'}</span> tests
          </span>
          <span className="build-stepper__stat">
            <span className="build-stepper__stat-value">{completedPhases.length}</span>/{phaseNames.length} phases
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
        {/* Left: activity highlights (commits, completions, key status) */}
        <div className="build-dashboard__highlights" ref={highlightsRef}>
          <div className="build-dashboard__col-header">
            <span className="build-dashboard__col-dot build-dashboard__col-dot--green" />
            <span className="build-dashboard__col-title">Activity</span>
            <span className="build-dashboard__col-count">{highlights.length}</span>
          </div>
          <div className="build-dashboard__col-body">
            {highlights.length === 0 && (
              <div className="build-dashboard__col-waiting">
                <LoadingStatus prefix={currentPhase ? `Building ${currentPhase}` : 'Starting build'} />
              </div>
            )}
            {highlights.map((line, i) => (
              <div key={i} className={`build-log__line build-log__line--${line.type}`}>
                <span className="build-log__time">{line.time}</span>
                <span className="build-log__text">{line.text}</span>
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
