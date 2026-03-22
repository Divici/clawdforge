import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PresearchStepper } from './PresearchStepper';
import { QuestionCard } from './QuestionCard';
import { TextCard } from './TextCard';
import { DecisionCard } from './DecisionCard';
import { AccordionCard } from './AccordionCard';
import { RegistryCard } from './RegistryCard';
import './PresearchWizard.css';

export function PresearchWizard() {
  const [currentLoop, setCurrentLoop] = useState(1);
  const [completedLoops, setCompletedLoops] = useState([]);
  const [cards, setCards] = useState([]);
  const pendingQuestion = useRef(null);
  const pendingOptions = useRef([]);

  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleEvent = (event) => {
      switch (event.type) {
        case 'forge:loop':
          setCompletedLoops(prev => {
            const completed = [...prev];
            if (event.loop > 1 && !completed.includes(event.loop - 1)) {
              completed.push(event.loop - 1);
            }
            return completed;
          });
          setCurrentLoop(event.loop);
          break;

        case 'forge:question':
          pendingQuestion.current = { id: event.id, question: event.content };
          pendingOptions.current = [];
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
            setCards(prev => [...prev, {
              type: 'question',
              id: pendingQuestion.current.id,
              question: pendingQuestion.current.question,
              options: [...pendingOptions.current],
            }]);
            pendingQuestion.current = null;
            pendingOptions.current = [];
          }
          break;

        case 'forge:text-question':
          setCards(prev => [...prev, { type: 'text', id: event.id, question: event.content }]);
          break;

        case 'forge:decision':
          setCards(prev => [...prev, { type: 'decision', summary: event.content }]);
          break;

        case 'forge:registry':
          if (event.requirements) {
            setCards(prev => [...prev, { type: 'registry', requirements: event.requirements }]);
          }
          break;
      }
    };

    window.forgeAPI.onForgeEvent(handleEvent);
  }, []);

  const handleSelect = useCallback((id, option) => {
    if (window.forgeAPI) {
      if (option.recommended) {
        window.forgeAPI.sendForgeResponse('select-recommended', { name: option.name });
      } else if (option.custom) {
        window.forgeAPI.sendForgeResponse('custom-text', { text: option.name });
      } else {
        window.forgeAPI.sendForgeResponse('select-option', { name: option.name });
      }
    }
  }, []);

  const handleTextSubmit = useCallback((id, text) => {
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('custom-text', { text });
    }
  }, []);

  const handleRegistryConfirm = useCallback(() => {
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('confirm-registry', {});
    }
  }, []);

  return (
    <div className="presearch-wizard">
      <PresearchStepper currentLoop={currentLoop} completedLoops={completedLoops} />
      <div className="presearch-wizard__cards">
        {cards.map((card, i) => {
          switch (card.type) {
            case 'question':
              return <QuestionCard key={i} id={card.id} question={card.question} options={card.options} onSelect={handleSelect} />;
            case 'text':
              return <TextCard key={i} id={card.id} question={card.question} onSubmit={handleTextSubmit} />;
            case 'decision':
              return <DecisionCard key={i} summary={card.summary} />;
            case 'registry':
              return <RegistryCard key={i} requirements={card.requirements} onConfirm={handleRegistryConfirm} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
