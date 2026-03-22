import './HeaderBar.css';

export function HeaderBar({ projectName, elapsed, mode, onPause }) {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <header className="header-bar">
      <span className="header-bar__logo">CLAW'D FORGE</span>
      {projectName && <span className="header-bar__project">{projectName}</span>}
      <span className="header-bar__timer">{formatTime(elapsed)}</span>
      {mode === 'build' && (
        <button className="header-bar__pause" onClick={onPause} title="Pause build">
          ⏸
        </button>
      )}
    </header>
  );
}
