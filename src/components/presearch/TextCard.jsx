import { useState } from 'preact/hooks';
import './TextCard.css';

export function TextCard({ id, question, onSubmit }) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(id, text.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="text-card">
      <h3 className="text-card__title">{question}</h3>
      <textarea
        className="text-card__input"
        rows={3}
        placeholder="Type your answer..."
        value={text}
        onInput={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="text-card__submit"
        onClick={handleSubmit}
        disabled={!text.trim()}
      >
        Submit Response
      </button>
    </div>
  );
}
