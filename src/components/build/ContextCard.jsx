import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import './ContextCard.css';

export function ContextCard({ phase, taskProgress, onResume }) {
  return (
    <Card className="context-card">
      <div className="context-card__header">
        <span className="context-card__icon">⚠</span>
        <span className="context-card__title">Context reaching limit — save point reached</span>
      </div>
      <p className="context-card__info">Current phase: {phase} ({taskProgress})</p>
      <p className="context-card__info">State saved to WORKFLOW_STATE.md</p>
      <Button onClick={onResume}>Clear & Resume</Button>
    </Card>
  );
}
