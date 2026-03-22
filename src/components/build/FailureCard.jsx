import { useState } from 'preact/hooks';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import './FailureCard.css';

export function FailureCard({ title, retryCount, errorDetails, onRetry, onSkip, onPause }) {
  const [showError, setShowError] = useState(false);

  return (
    <Card className="failure-card">
      <div className="failure-card__header">
        <span className="failure-card__icon">✗</span>
        <span className="failure-card__title">{title}</span>
      </div>
      <p className="failure-card__desc">Failed after {retryCount} retries + 1 alternative approach</p>
      {errorDetails && (
        <div className="failure-card__error" onClick={() => setShowError(!showError)}>
          <span>{showError ? '▾' : '▸'} Error details</span>
          {showError && <pre className="failure-card__error-text">{errorDetails}</pre>}
        </div>
      )}
      <div className="failure-card__actions">
        {onRetry && <Button onClick={onRetry}>Retry with instructions</Button>}
        {onSkip && <Button variant="secondary" onClick={onSkip}>Skip task</Button>}
        {onPause && <Button variant="secondary" onClick={onPause}>Pause</Button>}
      </div>
    </Card>
  );
}
