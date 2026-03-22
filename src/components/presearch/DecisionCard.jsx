import './DecisionCard.css';

export function DecisionCard({ summary, onReopen }) {
  return (
    <div className="decision-card">
      <div className="decision-card__content">
        <span className="decision-card__check">{'\u2713'}</span>
        <span className="decision-card__summary">{summary}</span>
        {onReopen && (
          <button className="decision-card__reopen" onClick={onReopen}>Change {'\u21A9'}</button>
        )}
      </div>
    </div>
  );
}
