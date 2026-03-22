import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PresearchStepper } from './PresearchStepper';
import { QuestionCard } from './QuestionCard';
import { TextCard } from './TextCard';
import { DecisionCard } from './DecisionCard';
import { RequirementsPanel } from './RequirementsPanel';
import { DiagnosticFeed } from './DiagnosticFeed';
import './PresearchWizard.css';

export function PresearchWizard() {
  const [currentLoop, setCurrentLoop] = useState(0);
  const [currentLoopName, setCurrentLoopName] = useState('');
  const [completedLoops, setCompletedLoops] = useState([]);
  const [cards, setCards] = useState([]);
  const [thinking, setThinking] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [diagnosticEvents, setDiagnosticEvents] = useState([]);
  const pendingQuestion = useRef(null);
  const pendingOptions = useRef([]);

  const addDiagnostic = useCallback((level, message) => {
    setDiagnosticEvents(prev => [...prev, { level, message }]);
  }, []);

  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleEvent = (event) => {
      switch (event.type) {
        case 'forge:loop':
          setThinking(true);
          setCompletedLoops(prev => {
            const completed = [...prev];
            if (event.loop > 1 && !completed.includes(event.loop - 1)) {
              completed.push(event.loop - 1);
            }
            return completed;
          });
          setCurrentLoop(event.loop);
          setCurrentLoopName(event.name || '');
          addDiagnostic('sys', `Entering loop: ${event.name || `Loop ${event.loop}`}`);
          break;

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
          let bestWhen = '';
          for (let i = 1; i < parts.length; i++) {
            const p = parts[i];
            if (p.startsWith('\u2713')) pros.push(p.slice(1).trim());
            else if (p.startsWith('\u2717')) cons.push(p.slice(1).trim());
            else if (p.toLowerCase().startsWith('best when:')) bestWhen = p.slice(10).trim();
          }
          pendingOptions.current = [...pendingOptions.current, {
            name, pros, cons, bestWhen,
            recommended: event.recommended === true,
          }];
          break;
        }

        case 'forge:option-end':
          if (pendingQuestion.current) {
            setThinking(false);
            setCards(prev => [...prev, {
              type: 'question',
              id: pendingQuestion.current.id,
              question: pendingQuestion.current.question,
              options: [...pendingOptions.current],
            }]);
            pendingQuestion.current = null;
            pendingOptions.current = [];
            addDiagnostic('ok', 'Options ready for selection');
          }
          break;

        case 'forge:text-question':
          setThinking(false);
          setCards(prev => [...prev, { type: 'text', id: event.id, question: event.content }]);
          addDiagnostic('sys', `Text input requested: ${event.id}`);
          break;

        case 'forge:decision':
          setThinking(false);
          setCards(prev => [...prev, { type: 'decision', summary: event.content }]);
          addDiagnostic('ok', `Decision locked: ${event.content}`);
          break;

        case 'forge:registry':
          setThinking(false);
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
    // Remove the answered question — Claude's forge:decision event will add the lock card
    setCards(prev => prev.filter(card => !(card.type === 'question' && card.id === id)));
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
    // Remove the answered text card — Claude's forge:decision event will add the lock card
    setCards(prev => prev.filter(card => !(card.type === 'text' && card.id === id)));
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
          {thinking && (
            <div className="presearch-wizard__thinking">
              <span className="presearch-wizard__thinking-text">
                {currentLoopName
                  ? `AI Thinking: Working on ${currentLoopName}`
                  : 'AI Thinking: Analyzing your project'}
              </span>
            </div>
          )}

          <div className="presearch-wizard__cards">
            {cards.map((card, i) => {
              switch (card.type) {
                case 'question':
                  return <QuestionCard key={i} id={card.id} question={card.question} options={card.options} onSelect={handleSelect} />;
                case 'text':
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
