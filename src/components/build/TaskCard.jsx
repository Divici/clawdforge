import { useState } from 'preact/hooks';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import './TaskCard.css';

export function TaskCard({ title, commit, files, tests, qualityGates, timestamp, expanded: initialExpanded }) {
  const [expanded, setExpanded] = useState(initialExpanded || false);

  const timeAgo = timestamp ? formatTimeAgo(timestamp) : '';

  return (
    <Card className={`task-card ${expanded ? 'task-card--expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="task-card__header">
        <span className="task-card__icon">{expanded ? '◉' : '✓'}</span>
        <span className="task-card__title">{title}</span>
        {timeAgo && <span className="task-card__time">{timeAgo}</span>}
      </div>
      {expanded && (
        <div className="task-card__body">
          {commit && <div className="task-card__commit">{commit}</div>}
          {files && files.length > 0 && (
            <div className="task-card__files">
              <span className="task-card__files-label">Files changed:</span>
              {files.map((f, i) => <div key={i} className="task-card__file">+ {f}</div>)}
            </div>
          )}
          {tests && (
            <div className="task-card__tests">
              Tests: {tests.added} added, {tests.passing} passing ✓
            </div>
          )}
          {qualityGates && (
            <div className="task-card__gates">
              Quality gates:
              {qualityGates.lint !== undefined && <Badge variant={qualityGates.lint ? 'success' : 'error'}>lint {qualityGates.lint ? '✓' : '✗'}</Badge>}
              {qualityGates.typecheck !== undefined && <Badge variant={qualityGates.typecheck ? 'success' : 'error'}>typecheck {qualityGates.typecheck ? '✓' : '✗'}</Badge>}
              {qualityGates.test !== undefined && <Badge variant={qualityGates.test ? 'success' : 'error'}>test {qualityGates.test ? '✓' : '✗'}</Badge>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
