import { useState } from 'preact/hooks';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import './BlockerCard.css';

export function BlockerCard({ title, description, triedApproaches, onSubmitKey, onSkipMock, onSkip }) {
  const [key, setKey] = useState('');
  const [showTried, setShowTried] = useState(false);

  return (
    <Card className="blocker-card">
      <div className="blocker-card__header">
        <span className="blocker-card__icon">⚠</span>
        <span className="blocker-card__title">{title}</span>
      </div>
      <p className="blocker-card__desc">{description}</p>
      {triedApproaches && (
        <div className="blocker-card__tried" onClick={() => setShowTried(!showTried)}>
          <span>{showTried ? '▾' : '▸'} What was tried ({triedApproaches.length} approaches)</span>
          {showTried && triedApproaches.map((a, i) => <p key={i}>{a}</p>)}
        </div>
      )}
      {onSubmitKey && (
        <div className="blocker-card__input">
          <input
            type="text"
            placeholder="Paste API key here..."
            value={key}
            onInput={(e) => setKey(e.target.value)}
          />
          <Button onClick={() => onSubmitKey(key)} disabled={!key.trim()}>Submit Key</Button>
        </div>
      )}
      <div className="blocker-card__actions">
        {onSkipMock && <Button variant="secondary" onClick={onSkipMock}>Skip & Use Mock</Button>}
        {onSkip && <Button variant="secondary" onClick={onSkip}>Skip for Now</Button>}
      </div>
    </Card>
  );
}
