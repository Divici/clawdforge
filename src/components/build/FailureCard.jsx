import { useState } from 'preact/hooks';
import './FailureCard.css';

export function FailureCard({ title, retryCount, errorDetails, onRetry, onSkip, onPause }) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="failure-card">
      <span className="failure-card__icon">✗</span>
      <div className="failure-card__content">
        <div className="failure-card__header">
          <span className="failure-card__label">Build Failure</span>
        </div>
        <span className="failure-card__title">{title}</span>
        <p className="failure-card__desc">Failed after {retryCount} retries + 1 alternative approach</p>
        {errorDetails && (
          <div className="failure-card__error" onClick={() => setShowError(!showError)}>
            <span>{showError ? '▾' : '▸'} Error details</span>
            {showError && <pre className="failure-card__error-text">{errorDetails}</pre>}
          </div>
        )}
        <div className="failure-card__actions">
          {onRetry && <button className="failure-card__btn failure-card__btn--resolve" onClick={onRetry}>Retry with instructions</button>}
          {onSkip && <button className="failure-card__btn failure-card__btn--ghost" onClick={onSkip}>Skip task</button>}
          {onPause && <button className="failure-card__btn failure-card__btn--ghost" onClick={onPause}>Pause</button>}
        </div>
      </div>
    </div>
  );
}
