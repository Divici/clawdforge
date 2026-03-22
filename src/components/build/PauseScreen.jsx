import { useState } from 'preact/hooks';
import { Button } from '../shared/Button';
import './PauseScreen.css';

export function PauseScreen({ phase, taskProgress, onResume }) {
  const [instructions, setInstructions] = useState('');

  return (
    <div className="pause-screen">
      <h2 className="pause-screen__title">⏸ Build Paused</h2>
      <p className="pause-screen__info">after: {phase}, {taskProgress}</p>
      <label className="pause-screen__label">Instructions for Claude (optional):</label>
      <textarea
        className="pause-screen__textarea"
        rows={4}
        placeholder="Any changes or instructions before resuming..."
        value={instructions}
        onInput={(e) => setInstructions(e.target.value)}
      />
      <Button onClick={() => onResume(instructions)}>▶ Resume Build</Button>
    </div>
  );
}
