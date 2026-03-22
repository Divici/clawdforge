import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { PresearchStepper } from './PresearchStepper';
import { QuestionCard } from './QuestionCard';
import { TextCard } from './TextCard';
import { DecisionCard } from './DecisionCard';
import { RegistryCard } from './RegistryCard';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import './PresearchWizard.css';

/**
 * Strip ANSI escape codes and control sequences from PTY output.
 * Keeps printable text and basic whitespace.
 */
function stripAnsi(text) {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')   // CSI sequences
    .replace(/\x1b\][^\x07]*\x07/g, '')        // OSC sequences (title set etc)
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')   // DEC private modes
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''); // control chars except \t \n \r
}

/**
 * Check if a line is noise (spinners, progress, empty decorations).
 */
function isNoiseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.length <= 2) return true; // single char spinners
  // Filter spinner chars and very short status-only lines
  if (/^[✻✶✢✽·*●⠂⠐⏵⏸⎿]+$/.test(trimmed)) return true;
  // Filter bare prompt lines
  if (trimmed === '>') return true;
  // Filter progress percentage lines with nothing else
  if (/^\[[-]+\]\s*\d+%/.test(trimmed) && trimmed.length < 20) return true;
  return false;
}

export function PresearchWizard() {
  const [currentLoop, setCurrentLoop] = useState(1);
  const [completedLoops, setCompletedLoops] = useState([]);
  const [cards, setCards] = useState([]);
  const [outputBlocks, setOutputBlocks] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [hasStructuredMarkers, setHasStructuredMarkers] = useState(false);
  const [claudeReady, setClaudeReady] = useState(false);
  const outputRef = useRef(null);
  const pendingQuestion = useRef(null);
  const pendingOptions = useRef([]);
  const rawBuffer = useRef('');

  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleEvent = (event) => {
      switch (event.type) {
        case 'forge:loop':
          setHasStructuredMarkers(true);
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
          setHasStructuredMarkers(true);
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
          setHasStructuredMarkers(true);
          setCards(prev => [...prev, { type: 'text', id: event.id, question: event.content }]);
          break;

        case 'forge:decision':
          setHasStructuredMarkers(true);
          setCards(prev => [...prev, { type: 'decision', summary: event.content }]);
          break;

        case 'forge:registry':
          setHasStructuredMarkers(true);
          if (event.requirements) {
            setCards(prev => [...prev, { type: 'registry', requirements: event.requirements }]);
          }
          break;

        // v1 fallback events from regex parser
        case 'mode:change':
        case 'stage:change':
          break;
      }
    };

    window.forgeAPI.onForgeEvent(handleEvent);

    // Raw output — accumulate into readable blocks for fallback display
    if (window.forgeAPI.onRawOutput) {
      window.forgeAPI.onRawOutput((text) => {
        rawBuffer.current += text;
        const cleaned = stripAnsi(rawBuffer.current);
        const lines = cleaned.split('\n');

        // Keep incomplete last line in buffer
        rawBuffer.current = lines.pop() || '';

        const meaningful = lines
          .map(l => l.trimEnd())
          .filter(l => !isNoiseLine(l));

        if (meaningful.length > 0) {
          setClaudeReady(true);
          setOutputBlocks(prev => {
            const next = [...prev, ...meaningful];
            // Keep last 100 lines to prevent memory bloat
            return next.slice(-100);
          });
        }
      });
    }
  }, []);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputBlocks]);

  const handleSend = useCallback(() => {
    const text = userInput.trim();
    if (!text || !window.forgeAPI) return;
    // Send raw text to Claude's stdin via terminal input
    window.forgeAPI.sendTerminalInput(text + '\r');
    setUserInput('');
    setOutputBlocks(prev => [...prev, `> ${text}`]);
  }, [userInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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

  // If structured markers are arriving, use the card-based UI
  if (hasStructuredMarkers) {
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

  // Fallback: show raw Claude output with text input for responses
  return (
    <div className="presearch-wizard">
      <PresearchStepper currentLoop={currentLoop} completedLoops={completedLoops} />
      <div className="presearch-wizard__fallback">
        {!claudeReady && (
          <div className="presearch-wizard__waiting">
            <div className="presearch-wizard__spinner">●</div>
            <p className="presearch-wizard__waiting-text">Starting Claude...</p>
          </div>
        )}
        {claudeReady && (
          <>
            <div className="presearch-wizard__output" ref={outputRef}>
              {outputBlocks.map((line, i) => (
                <div
                  key={i}
                  className={`presearch-wizard__output-line ${line.startsWith('> ') ? 'presearch-wizard__output-line--user' : ''}`}
                >
                  {line}
                </div>
              ))}
            </div>
            <div className="presearch-wizard__input-bar">
              <textarea
                className="presearch-wizard__input"
                rows={2}
                placeholder="Type your response to Claude..."
                value={userInput}
                onInput={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button onClick={handleSend} disabled={!userInput.trim()}>Send</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
