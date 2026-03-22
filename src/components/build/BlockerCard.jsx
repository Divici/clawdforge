import { useState } from 'preact/hooks';
import './BlockerCard.css';

export function BlockerCard({ title, description, errorCode, triedApproaches, onSubmitKey, onSkipMock, onSkip }) {
  const [key, setKey] = useState('');
  const [showTried, setShowTried] = useState(false);

  return (
    <div className="blocker-card">
      <span className="blocker-card__icon">⚠</span>
      <div className="blocker-card__content">
        <div className="blocker-card__header">
          <span className="blocker-card__label">Intervention Required</span>
          {errorCode && <span className="blocker-card__code">{errorCode}</span>}
        </div>
        <p className="blocker-card__desc">{description || title}</p>
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
            <button className="blocker-card__btn blocker-card__btn--resolve" onClick={() => onSubmitKey(key)} disabled={!key.trim()}>Submit Key</button>
          </div>
        )}
        <div className="blocker-card__actions">
          {onSkipMock && (
            <button className="blocker-card__btn blocker-card__btn--resolve" onClick={onSkipMock}>
              Resolve Now
            </button>
          )}
          {onSkip && (
            <button className="blocker-card__btn blocker-card__btn--ghost" onClick={onSkip}>
              Ignore Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
