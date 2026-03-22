import { Card } from '../shared/Card';
import './AccordionCard.css';

export function AccordionCard({ id: _id, title, sections, completedSections, activeSection, children }) {
  return (
    <Card className="accordion-card">
      <div className="accordion-card__header">
        <h3 className="accordion-card__title">{title}</h3>
        <span className="accordion-card__count">
          {completedSections?.length || 0}/{sections?.length || 0}
        </span>
      </div>
      <div className="accordion-card__sections">
        {sections?.map((section, i) => {
          const isComplete = completedSections?.includes(i);
          const isActive = activeSection === i;
          return (
            <div
              key={i}
              className={`accordion-card__section${isActive ? ' accordion-card__section--active' : ''}${isComplete ? ' accordion-card__section--complete' : ''}`}
            >
              <div className="accordion-card__section-header">
                <span>{isComplete ? '\u2713' : isActive ? '\u25BC' : '\u25B6'}</span>
                <span>{section.title}</span>
                {isComplete && <span className="accordion-card__locked">locked</span>}
              </div>
              {isActive && <div className="accordion-card__section-body">{children}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
