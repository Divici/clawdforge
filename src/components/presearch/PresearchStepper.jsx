import './PresearchStepper.css';

const LOOPS = ['Constraints', 'Discovery', 'Refinement', 'Plan', 'Gap Analysis'];

export function PresearchStepper({ currentLoop, completedLoops }) {
  const total = LOOPS.length;
  const stepLabel = String(currentLoop).padStart(2, '0');

  return (
    <section className="presearch-stepper">
      <div className="presearch-stepper__header">
        <span className="presearch-stepper__phase-label">System Initialization Phase</span>
        <span className="presearch-stepper__step-count">Step {stepLabel} / {String(total).padStart(2, '0')}</span>
      </div>
      <div className="presearch-stepper__bar" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {LOOPS.map((name, i) => {
          const loopNum = i + 1;
          const isComplete = completedLoops.includes(loopNum);
          const isCurrent = currentLoop === loopNum;
          const isFuture = !isComplete && !isCurrent;
          let cls = 'presearch-stepper__segment';
          if (isComplete) cls += ' presearch-stepper__segment--complete';
          if (isCurrent) cls += ' presearch-stepper__segment--active';
          if (isFuture) cls += ' presearch-stepper__segment--future';
          return <div key={name} className={cls} />;
        })}
      </div>
      <div className="presearch-stepper__labels" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {LOOPS.map((name, i) => {
          const loopNum = i + 1;
          const isCurrent = currentLoop === loopNum;
          const isFuture = !completedLoops.includes(loopNum) && !isCurrent;
          let cls = 'presearch-stepper__label';
          if (isCurrent) cls += ' presearch-stepper__label--active';
          if (isFuture) cls += ' presearch-stepper__label--future';
          return <span key={name} className={cls}>{name}</span>;
        })}
      </div>
    </section>
  );
}
