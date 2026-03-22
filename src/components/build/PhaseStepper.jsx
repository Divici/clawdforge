import { Badge } from '../shared/Badge';
import './PhaseStepper.css';

export function PhaseStepper({ phases, currentPhase, completedPhases, stats }) {
  return (
    <div className="phase-stepper">
      {/* Single connecting line behind all steps */}
      <div className="phase-stepper__line" />
      {phases.map((name) => {
        const isComplete = completedPhases.includes(name);
        const isCurrent = currentPhase === name;
        const phaseClass = [
          'phase-stepper__phase',
          isCurrent ? 'phase-stepper__phase--active' : '',
          isComplete ? 'phase-stepper__phase--complete' : '',
        ].filter(Boolean).join(' ');
        const dotClass = [
          'phase-stepper__dot',
          isCurrent ? 'phase-stepper__dot--active' : '',
          isComplete ? 'phase-stepper__dot--complete' : '',
          !isCurrent && !isComplete ? 'phase-stepper__dot--future' : '',
        ].filter(Boolean).join(' ');
        return (
          <div key={name} className={phaseClass}>
            <div className={dotClass}>
              {isComplete ? '✓' : isCurrent ? '◉' : '○'}
            </div>
            <span className="phase-stepper__name">{name}</span>
          </div>
        );
      })}
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
