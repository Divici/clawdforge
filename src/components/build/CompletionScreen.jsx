import { Button } from '../shared/Button';
import './CompletionScreen.css';

function MetricCard({ icon, label, value, subtitle, colorVar }) {
  return (
    <div className="cs-metric">
      <div className="cs-metric__header">
        <span className="cs-metric__icon">{icon}</span>
        <span className="cs-metric__label">{label}</span>
      </div>
      <div className="cs-metric__value" style={colorVar ? { color: `var(${colorVar})` } : undefined}>
        {value}
      </div>
      {subtitle && <div className="cs-metric__subtitle">{subtitle}</div>}
    </div>
  );
}

function IssueItem({ issue }) {
  if (typeof issue === 'string') {
    return (
      <div className="cs-issue">
        <span className="cs-issue__desc">{issue}</span>
      </div>
    );
  }
  return (
    <div className="cs-issue" data-severity={issue.severity}>
      <span className="cs-issue__id">{issue.id}</span>
      <span className="cs-issue__desc">{issue.description}</span>
      {issue.severity && (
        <span className={`badge badge--${issue.severity}`}>{issue.severity}</span>
      )}
    </div>
  );
}

export function CompletionScreen({ summary, onNewProject }) {
  const s = summary || {};
  const projectName = s.projectName || 'Untitled';
  const issues = s.issues || [];
  const issueCount = issues.length;

  return (
    <div className="cs">
      {/* Hero Section — 8+4 grid */}
      <div className="cs-hero">
        <div className="cs-hero__left">
          <span className="cs-hero__status">SYSTEM_STATUS: DEPLOY_READY</span>
          <h2 className="cs-hero__title">Forge Completion: {projectName}</h2>
          <p className="cs-hero__desc">
            All build phases finalized. The forge output is ready for deployment review.
          </p>
          <div className="cs-hero__actions">
            <Button variant="primary">🚀 Initiate Deployment</Button>
            {onNewProject && (
              <Button variant="secondary" onClick={onNewProject}>Archive Build</Button>
            )}
          </div>
        </div>
        <div className="cs-hero__right">
          <div className="cs-mascot" data-testid="clawd-mascot">
            <span className="cs-mascot__sprite" role="img" aria-label="Claw'd mascot">🦞</span>
          </div>
          <span className="cs-mascot__validation">✓ Validation Passed</span>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="cs-metrics">
        <MetricCard
          icon="account_tree"
          label="PHASES COMPLETED"
          value={s.totalPhases ? `${s.phases}/${s.totalPhases}` : (s.phases ?? '—')}
          subtitle={s.totalPhases ? `${s.phases} of ${s.totalPhases} phases` : undefined}
        />
        <MetricCard
          icon="fact_check"
          label="TESTS PASSED"
          value={s.tests ?? '—'}
          subtitle={s.testCount ? `${s.testCount} total tests` : undefined}
          colorVar="--color-tertiary"
        />
        <MetricCard
          icon="timer"
          label="TOTAL FORGE TIME"
          value={s.elapsed ?? '—'}
        />
        <MetricCard
          icon="bug_report"
          label="KNOWN ISSUES"
          value={issueCount}
          colorVar={issueCount > 0 ? '--color-error' : undefined}
        />
      </div>

      {/* Detail Section — 8+4 grid */}
      {(s.deployed || s.buildLog || issueCount > 0) && (
        <div className="cs-detail">
          <div className="cs-detail__left">
            {s.deployed && (
              <div className="cs-deploy-card">
                <div className="cs-deploy-card__header">
                  <span className="cs-deploy-card__dot" />
                  <span className="cs-deploy-card__label">Target Environment</span>
                </div>
                <a className="cs-deploy-card__url" href={s.deployed}>{s.deployed}</a>
              </div>
            )}
            {s.buildLog && s.buildLog.length > 0 && (
              <div className="cs-build-log">
                {s.buildLog.map((line, i) => (
                  <div key={i} className="cs-build-log__line">{line}</div>
                ))}
              </div>
            )}
          </div>
          {issueCount > 0 && (
            <div className="cs-detail__right">
              <h3 className="cs-detail__heading">Known Artifacts / Issues</h3>
              <div className="cs-issues-list">
                {issues.map((issue, i) => (
                  <IssueItem key={i} issue={issue} />
                ))}
              </div>
              <Button variant="secondary">Review Full Bug List</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
