import './ContextCard.css';

export function ContextCard({ phase, taskProgress, onResume }) {
  return (
    <div className="context-card">
      <span className="context-card__icon">⚠</span>
      <div className="context-card__content">
        <div className="context-card__header">
          <span className="context-card__label">Context Limit Warning</span>
        </div>
        <p className="context-card__desc">Context reaching limit — save point reached</p>
        <p className="context-card__info">Current phase: {phase} ({taskProgress})</p>
        <p className="context-card__info">State saved to WORKFLOW_STATE.md</p>
        <div className="context-card__actions">
          <button className="context-card__btn" onClick={onResume}>Clear & Resume</button>
        </div>
      </div>
    </div>
  );
}
