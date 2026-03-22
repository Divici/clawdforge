import { Badge } from '../shared/Badge';
import './PhaseStepper.css';

export function PhaseStepper({ phases, currentPhase, completedPhases, stats }) {
  return (
    <div className="phase-stepper">
      <div className="phase-stepper__phases">
        {phases.map((name, i) => {
          const isComplete = completedPhases.includes(name);
          const isCurrent = currentPhase === name;
          return (
            <div key={name} className="phase-stepper__phase">
              {i > 0 && (
                <div
                  className={`phase-stepper__line ${isComplete || isCurrent ? 'phase-stepper__line--active' : ''}`}
                />
              )}
              <div
                className={`phase-stepper__dot ${isCurrent ? 'phase-stepper__dot--active' : ''} ${isComplete ? 'phase-stepper__dot--complete' : ''}`}
              >
                {isComplete ? '✓' : isCurrent ? '◉' : '○'}
              </div>
              <span className="phase-stepper__name">{name}</span>
              {isCurrent && <span className="phase-stepper__status">in progress</span>}
              {isComplete && <span className="phase-stepper__status">complete</span>}
            </div>
          );
        })}
      </div>
      {stats && (
        <div className="phase-stepper__stats">
          {stats.agents !== undefined && <Badge>Agents: {stats.agents}</Badge>}
          {stats.decisions !== undefined && <Badge variant="success">Decisions: {stats.decisions}</Badge>}
          {stats.tests !== undefined && <Badge variant="success">Tests: {stats.tests}</Badge>}
          {stats.artifacts !== undefined && <Badge>Artifacts: {stats.artifacts}</Badge>}
        </div>
      )}
    </div>
  );
}
