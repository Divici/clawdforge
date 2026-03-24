import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { PresearchStepper } from './PresearchStepper';
import { QuestionCard } from './QuestionCard';
import { TextCard } from './TextCard';
import { DecisionCard } from './DecisionCard';
import { RequirementsPanel } from './RequirementsPanel';
import { LoadingStatus } from '../LoadingStatus';
import './PresearchWizard.css';

export function PresearchWizard({ state, presearch }) {
  const [reopenedIds, setReopenedIds] = useState(new Set());
  const cardsEndRef = useRef(null);

  const currentLoop = state?.presearch?.currentLoop || 1;
  const currentLoopName = state?.presearch?.currentLoopName || '';
  const completedLoops = state?.presearch?.completedLoops || [];
  const waitingForInput = state?.presearch?.waitingForInput || false;
  const presearchStatus = state?.presearch?.status || 'running';
  const questions = presearch?.questions || [];
  const requirements = presearch?.requirements || [];

  // Show loading when presearch is still running (not complete)
  const isWorking = presearchStatus === 'running' && !waitingForInput;

  // Auto-scroll to bottom when new questions arrive
  useEffect(() => {
    if (cardsEndRef.current?.scrollIntoView) {
      cardsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [questions.length]);

  const handleSelect = useCallback((id, option) => {
    setReopenedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('select-option', {
        requestId: id,
        answer: option.name,
        name: option.name,
      });
    }
  }, []);

  const handleTextSubmit = useCallback((id, text) => {
    setReopenedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('custom-text', {
        requestId: id,
        answer: text,
        text,
      });
    }
  }, []);

  const handleReopen = useCallback((id) => {
    setReopenedIds(prev => new Set(prev).add(id));
  }, []);

  return (
    <div className="presearch-wizard">
      <PresearchStepper currentLoop={currentLoop} completedLoops={completedLoops} />

      <div className="presearch-wizard__content">
        <div className="presearch-wizard__left">
          {/* Skeleton only on initial load (no questions yet) */}
          {questions.length === 0 && (
            <div className="presearch-wizard__thinking-block">
              <div className="presearch-wizard__thinking">
                <LoadingStatus prefix={currentLoopName ? `Working on ${currentLoopName}` : ''} />
              </div>
              <div className="skeleton-tree">
                <div className="skeleton-tree__header">
                  <span className="skeleton-tree__icon" />
                  <span className="skeleton-tree__bar skeleton-tree__bar--wide" />
                </div>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="skeleton-tree__row" style={{ animationDelay: `${n * 0.15}s` }}>
                    <span className="skeleton-tree__indent" />
                    <span className="skeleton-tree__icon skeleton-tree__icon--sm" />
                    <span className={`skeleton-tree__bar skeleton-tree__bar--${n % 3 === 0 ? 'short' : n % 2 === 0 ? 'wide' : 'med'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="presearch-wizard__cards">
            {questions.map((q) => {
              const isAnswered = q.status === 'answered' && !reopenedIds.has(q.id);
              const isPending = q.status === 'pending' || reopenedIds.has(q.id);

              if (isAnswered) {
                return (
                  <DecisionCard
                    key={q.id}
                    summary={`${q.question}: ${q.answer}`}
                    onReopen={state?.runMode === 'interactive' ? () => handleReopen(q.id) : undefined}
                  />
                );
              }

              if (isPending && q.type === 'text') {
                return <TextCard key={q.id} id={q.id} question={q.question} onSubmit={handleTextSubmit} />;
              }

              if (isPending && q.options?.length > 0) {
                return <QuestionCard key={q.id} id={q.id} question={q.question} options={q.options} onSelect={handleSelect} />;
              }

              return <DecisionCard key={q.id} summary={q.answer || q.question} />;
            })}
            <div ref={cardsEndRef} />
          </div>

          {/* Show working indicator at bottom when Claude is still processing */}
          {isWorking && questions.length > 0 && (
            <div className="presearch-wizard__working">
              <LoadingStatus prefix={currentLoopName ? `Working on ${currentLoopName}` : 'Processing'} />
            </div>
          )}
        </div>

        <div className="presearch-wizard__right">
          <RequirementsPanel requirements={requirements} />
        </div>
      </div>
    </div>
  );
}
