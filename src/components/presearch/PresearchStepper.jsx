import './PresearchStepper.css';

const LOOPS = ['Constraints', 'Discovery', 'Refinement', 'Plan', 'Gap Analysis'];

export function PresearchStepper({ currentLoop, completedLoops }) {
  return (
    <div className="presearch-stepper">
      {LOOPS.map((name, i) => {
        const loopNum = i + 1;
        const isComplete = completedLoops.includes(loopNum);
        const isCurrent = currentLoop === loopNum;
        return (
          <div
            key={name}
            className={`presearch-stepper__step${isCurrent ? ' presearch-stepper__step--active' : ''}${isComplete ? ' presearch-stepper__step--complete' : ''}`}
          >
            <span className="presearch-stepper__dot">
              {isComplete ? '\u2713' : isCurrent ? '\u25CF' : '\u25CB'}
            </span>
            <span className="presearch-stepper__label">{name}</span>
          </div>
        );
      })}
    </div>
  );
}
