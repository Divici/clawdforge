import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PresearchStepper } from './PresearchStepper';
import { QuestionCard } from './QuestionCard';
import { TextCard } from './TextCard';
import { DecisionCard } from './DecisionCard';
import { RequirementsPanel } from './RequirementsPanel';
import { DiagnosticFeed } from './DiagnosticFeed';
import { LoadingStatus } from '../LoadingStatus';
import './PresearchWizard.css';

export function PresearchWizard() {
  const [currentLoop, setCurrentLoop] = useState(1);
  const [currentLoopName, setCurrentLoopName] = useState('');
  const [completedLoops, setCompletedLoops] = useState([]);
  const [cards, setCards] = useState([]);
  const [thinking, setThinking] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [diagnosticEvents, setDiagnosticEvents] = useState([]);
  const pendingQuestion = useRef(null);
  const pendingOptions = useRef([]);
  const seenQuestions = useRef(new Set());

  const addDiagnostic = useCallback((level, message) => {
    setDiagnosticEvents(prev => [...prev, { level, message }]);
  }, []);

  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleEvent = (event) => {
      switch (event.type) {
        case 'forge:loop': {
          setThinking(true);
          // Clamp loop to 1-5 range (Claude may send 0 for "Setup" or other unexpected values)
          const loopNum = Math.max(1, Math.min(5, Number(event.loop) || 1));
          setCompletedLoops(prev => {
            const completed = [...prev];
            if (loopNum > 1 && !completed.includes(loopNum - 1)) {
              completed.push(loopNum - 1);
            }
            return completed;
          });
          setCurrentLoop(loopNum);
          setCurrentLoopName(event.name || '');
          // Clear previous loop's cards so the UI resets for the new phase
          setCards([]);
          addDiagnostic('sys', `Entering loop: ${event.name || `Loop ${loopNum}`}`);
          break;
        }

        case 'forge:question':
          pendingQuestion.current = { id: event.id, question: event.content };
          pendingOptions.current = [];
          addDiagnostic('sys', `Processing question: ${event.id}`);
          break;

        case 'forge:option': {
          const parts = event.content.split('|').map(s => s.trim());
          const name = parts[0] || '';
          const pros = [];
          const cons = [];
          const descriptions = [];
          let bestWhen = '';
          for (let i = 1; i < parts.length; i++) {
            const p = parts[i];
            if (p.startsWith('\u2713')) {
              const text = p.slice(1).trim();
              if (text) pros.push(text);
            } else if (p.startsWith('\u2717')) {
              const text = p.slice(1).trim();
              if (text) cons.push(text);
            } else if (p.toLowerCase().startsWith('best when:')) {
              bestWhen = p.slice(10).trim();
            } else if (p) {
              // No prefix — collect as description text
              descriptions.push(p);
            }
          }
          pendingOptions.current = [...pendingOptions.current, {
            name, pros, cons, bestWhen,
            description: descriptions.join('. '),
            recommended: event.recommended === true,
          }];
          break;
        }

        case 'forge:option-end':
          if (pendingQuestion.current) {
            const qText = pendingQuestion.current.question;
            // Skip duplicate questions (Claude re-asks across loops)
            if (!seenQuestions.current.has(qText)) {
              seenQuestions.current.add(qText);
              setThinking(false);
              setCards(prev => [...prev, {
                type: 'question',
                id: pendingQuestion.current.id,
                question: qText,
                options: [...pendingOptions.current],
              }]);
            }
            pendingQuestion.current = null;
            pendingOptions.current = [];
            addDiagnostic('ok', 'Options ready for selection');
          }
          break;

        case 'forge:text-question': {
          const tqText = event.content || '';
          if (!seenQuestions.current.has(tqText)) {
            seenQuestions.current.add(tqText);
            setThinking(false);
            setCards(prev => [...prev, { type: 'text', id: event.id, question: tqText }]);
          }
          addDiagnostic('sys', `Text input requested: ${event.id}`);
          break;
        }

        case 'forge:decision': {
          // Don't add standalone decision cards — answered questions already
          // show as DecisionCards. Claude's forge:decision events are echoes.
          const content = event.content || '';
          addDiagnostic('ok', `Decision locked: ${content}`);
          break;
        }

        case 'forge:registry':
          // Don't set thinking=false — registry populates the right panel, not the left
          if (event.requirements) {
            setRequirements(event.requirements);
            addDiagnostic('ok', `Registry updated: ${event.requirements.length} requirements`);
          }
          break;
      }
    };

    window.forgeAPI.onForgeEvent(handleEvent);
  }, [addDiagnostic]);

  const handleSelect = useCallback((id, option) => {
    setThinking(true);
    addDiagnostic('log', `User selected: ${option.name}`);
    // Mark the question as answered — keeps the card but shows it collapsed with the selection
    setCards(prev => prev.map(card =>
      card.type === 'question' && card.id === id
        ? { ...card, answered: true, selectedOption: option.name }
        : card
    ));
    if (window.forgeAPI) {
      if (option.recommended) {
        window.forgeAPI.sendForgeResponse('select-recommended', { name: option.name });
      } else if (option.custom) {
        window.forgeAPI.sendForgeResponse('custom-text', { text: option.name });
      } else {
        window.forgeAPI.sendForgeResponse('select-option', { name: option.name });
      }
    }
  }, [addDiagnostic]);

  const handleTextSubmit = useCallback((id, text) => {
    setThinking(true);
    addDiagnostic('log', 'User submitted text response');
    // Mark as answered
    setCards(prev => prev.map(card =>
      card.type === 'text' && card.id === id
        ? { ...card, answered: true, selectedOption: text }
        : card
    ));
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('custom-text', { text });
    }
  }, [addDiagnostic]);

  const handleRegistryConfirm = useCallback(() => {
    setThinking(true);
    addDiagnostic('sys', 'Registry confirmed by user');
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('confirm-registry', {});
    }
  }, [addDiagnostic]);

  return (
    <div className="presearch-wizard">
      <PresearchStepper currentLoop={currentLoop} completedLoops={completedLoops} />

      <div className="presearch-wizard__content">
        {/* Left column: AI status + cards */}
        <div className="presearch-wizard__left">
          {(thinking || cards.length === 0) && (
            <div className="presearch-wizard__thinking-block">
              <div className="presearch-wizard__thinking">
                <LoadingStatus
                  interval={3000}
                  prefix={currentLoopName ? `Working on ${currentLoopName}` : ''}
                />
              </div>
              {cards.length === 0 && (
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
                  <div className="skeleton-tree__row" style={{ animationDelay: '0.9s' }}>
                    <span className="skeleton-tree__indent" />
                    <span className="skeleton-tree__icon skeleton-tree__icon--sm" />
                    <span className="skeleton-tree__bar skeleton-tree__bar--med" />
                  </div>
                  <div className="skeleton-tree__header" style={{ animationDelay: '1.05s' }}>
                    <span className="skeleton-tree__icon" />
                    <span className="skeleton-tree__bar skeleton-tree__bar--med" />
                  </div>
                  {[1, 2, 3].map(n => (
                    <div key={`b${n}`} className="skeleton-tree__row" style={{ animationDelay: `${1.2 + n * 0.15}s` }}>
                      <span className="skeleton-tree__indent" />
                      <span className="skeleton-tree__icon skeleton-tree__icon--sm" />
                      <span className={`skeleton-tree__bar skeleton-tree__bar--${n === 2 ? 'wide' : 'short'}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="presearch-wizard__cards">
            {cards.map((card, i) => {
              switch (card.type) {
                case 'question':
                  if (card.answered) {
                    return (
                      <DecisionCard
                        key={i}
                        summary={`${card.question}: ${card.selectedOption}`}
                        onReopen={() => {
                          setCards(prev => prev.map((c, idx) =>
                            idx === i ? { ...c, answered: false, selectedOption: null } : c
                          ));
                        }}
                      />
                    );
                  }
                  return <QuestionCard key={i} id={card.id} question={card.question} options={card.options} onSelect={handleSelect} />;
                case 'text':
                  if (card.answered) {
                    return (
                      <DecisionCard
                        key={i}
                        summary={card.selectedOption}
                        onReopen={() => {
                          setCards(prev => prev.map((c, idx) =>
                            idx === i ? { ...c, answered: false, selectedOption: null } : c
                          ));
                        }}
                      />
                    );
                  }
                  return <TextCard key={i} id={card.id} question={card.question} onSubmit={handleTextSubmit} />;
                case 'decision':
                  return <DecisionCard key={i} summary={card.summary} />;
                default:
                  return null;
              }
            })}
          </div>
        </div>

        {/* Right column: Requirements + Diagnostic */}
        <div className="presearch-wizard__right">
          <RequirementsPanel requirements={requirements} />
          <DiagnosticFeed events={diagnosticEvents} />
        </div>
      </div>
    </div>
  );
}
