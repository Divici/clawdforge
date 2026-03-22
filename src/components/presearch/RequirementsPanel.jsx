import './RequirementsPanel.css';

export function RequirementsPanel({ requirements }) {
  if (!requirements || requirements.length === 0) return null;

  return (
    <section className="requirements-panel">
      <h3 className="requirements-panel__heading">
        <span className="requirements-panel__dot" />
        Requirements Checklist
      </h3>
      <div className="requirements-panel__list">
        {requirements.map((req) => (
          <div key={req.id} className="requirements-panel__item">
            <span className={`requirements-panel__check ${req.phase ? 'requirements-panel__check--done' : 'requirements-panel__check--pending'}`}>
              {req.phase ? '\u2611' : '\u2610'}
            </span>
            <div className="requirements-panel__text-group">
              <p className={`requirements-panel__name ${req.phase ? '' : 'requirements-panel__name--pending'}`}>{req.text}</p>
              <p className="requirements-panel__status">
                Status: {req.phase ? 'Verified' : 'Pending Selection'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
