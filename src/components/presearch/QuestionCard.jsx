import { useState } from 'preact/hooks';
import './QuestionCard.css';

export function QuestionCard({ id, question, options, onSelect }) {
  const recommendedIdx = options.findIndex(o => o.recommended);
  const [expandedOption, setExpandedOption] = useState(
    recommendedIdx >= 0 ? recommendedIdx : 0
  );
  const [customText, setCustomText] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (option) => {
    onSelect(id, option);
  };

  return (
    <div className="question-card">
      <h3 className="question-card__title">{question}</h3>
      <div className="question-card__options">
        {options.map((opt, i) => {
          const isExpanded = i === expandedOption && !showCustom;
          const isRecommended = opt.recommended;

          if (isExpanded) {
            return (
              <div key={i} className="question-card__option question-card__option--expanded">
                {isRecommended && (
                  <div className="question-card__rec-banner">
                    <span className="question-card__rec-label">Recommended Architecture</span>
                    <span className="question-card__rec-star">{'\u2605'}</span>
                  </div>
                )}
                <div className="question-card__option-body">
                  <h2 className="question-card__option-heading">{opt.name}</h2>
                  {opt.bestWhen && (
                    <p className="question-card__option-desc">Best when: {opt.bestWhen}</p>
                  )}
                  <div className="question-card__pro-con-grid">
                    <div className="question-card__pro-col">
                      <h4 className="question-card__pro-con-heading">Pros</h4>
                      <ul className="question-card__pro-con-list">
                        {opt.pros && opt.pros.map((p, j) => (
                          <li key={j} className="question-card__pro-item">
                            <span className="question-card__icon-pro">{'\u2295'}</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="question-card__con-col">
                      <h4 className="question-card__pro-con-heading">Cons</h4>
                      <ul className="question-card__pro-con-list">
                        {opt.cons && opt.cons.map((c, j) => (
                          <li key={j} className="question-card__con-item">
                            <span className="question-card__icon-con">{'\u2296'}</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button
                    className="question-card__select-btn"
                    onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                  >
                    Select This Option
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="question-card__option question-card__option--collapsed"
              onClick={() => { setExpandedOption(i); setShowCustom(false); }}
            >
              <div className="question-card__collapsed-left">
                <span className="question-card__option-num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="question-card__collapsed-name">{opt.name}</h3>
              </div>
              <span className="question-card__chevron">{'\u25BC'}</span>
            </div>
          );
        })}

        {/* Custom / Other option */}
        <div
          className={`question-card__option ${showCustom ? 'question-card__option--expanded' : 'question-card__option--collapsed'}`}
          onClick={() => { if (!showCustom) { setShowCustom(true); setExpandedOption(-1); } }}
        >
          {showCustom ? (
            <div className="question-card__option-body">
              <h2 className="question-card__option-heading">Custom Response</h2>
              <input
                type="text"
                className="question-card__custom-input"
                placeholder="Type your answer..."
                value={customText}
                onInput={(e) => setCustomText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="question-card__select-btn"
                onClick={(e) => { e.stopPropagation(); handleSelect({ name: customText, custom: true }); }}
                disabled={!customText.trim()}
              >
                Submit Custom Response
              </button>
            </div>
          ) : (
            <>
              <div className="question-card__collapsed-left">
                <span className="question-card__option-num">{String(options.length + 1).padStart(2, '0')}</span>
                <h3 className="question-card__collapsed-name">Other...</h3>
              </div>
              <span className="question-card__chevron">{'\u25BC'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
