import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import './RegistryCard.css';

export function RegistryCard({ requirements, onConfirm }) {
  const mapped = requirements?.filter(r => r.phase) || [];
  const total = requirements?.length || 0;

  return (
    <Card className="registry-card">
      <div className="registry-card__header">
        <h3 className="registry-card__title">Requirements Registry</h3>
        <span className="registry-card__count">{mapped.length}/{total} mapped</span>
      </div>
      <div className="registry-card__list">
        {requirements?.map((req) => (
          <div key={req.id} className="registry-card__item">
            <span className="registry-card__check">{req.phase ? '\u2611' : '\u2610'}</span>
            <span className="registry-card__id">{req.id}</span>
            <span className="registry-card__text">{req.text}</span>
            <Badge variant={req.priority === 'Must-have' ? 'success' : req.priority === 'Cut' ? 'error' : 'warning'}>
              {req.priority}
            </Badge>
          </div>
        ))}
      </div>
      <Button onClick={onConfirm}>Confirm Registry</Button>
    </Card>
  );
}
