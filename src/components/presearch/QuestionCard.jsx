import { useState } from 'preact/hooks';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import './QuestionCard.css';

export function QuestionCard({ id, question, options, onSelect }) {
  const [expandedOption, setExpandedOption] = useState(
    options.findIndex(o => o.recommended) >= 0
      ? options.findIndex(o => o.recommended)
      : 0
  );
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (option) => {
    onSelect(id, option);
  };

  return (
    <Card className="question-card">
      <h3 className="question-card__title">{question}</h3>
      <div className="question-card__options">
        {options.map((opt, i) => (
          <div
            key={i}
            className={`question-card__option${i === expandedOption ? ' question-card__option--expanded' : ''}`}
            onClick={() => { setExpandedOption(i); setShowCustom(false); }}
          >
            <div className="question-card__option-header">
              {opt.recommended && <Badge variant="warning">{'\u2605'} Recommended</Badge>}
              <span className="question-card__option-name">{opt.name}</span>
              {i !== expandedOption && <span className="question-card__expand">{'\u25B8'}</span>}
            </div>
            {i === expandedOption && (
              <div className="question-card__option-body">
                {opt.pros && opt.pros.map((p, j) => (
                  <div key={j} className="question-card__pro">{'\u2713'} {p}</div>
                ))}
                {opt.cons && opt.cons.map((c, j) => (
                  <div key={j} className="question-card__con">{'\u2717'} {c}</div>
                ))}
                {opt.bestWhen && <div className="question-card__best-when">Best when: {opt.bestWhen}</div>}
                <Button onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}>Select</Button>
              </div>
            )}
          </div>
        ))}
        <div
          className={`question-card__option${showCustom ? ' question-card__option--expanded' : ''}`}
          onClick={() => { setShowCustom(true); setExpandedOption(-1); }}
        >
          <div className="question-card__option-header">
            <span className="question-card__option-name">Other...</span>
            {!showCustom && <span className="question-card__expand">{'\u25B8'}</span>}
          </div>
          {showCustom && (
            <div className="question-card__option-body">
              <input
                type="text"
                className="question-card__custom-input"
                placeholder="Type your answer..."
                value={customText}
                onInput={(e) => setCustomText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                onClick={(e) => { e.stopPropagation(); handleSelect({ name: customText, custom: true }); }}
                disabled={!customText.trim()}
              >
                Select
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
