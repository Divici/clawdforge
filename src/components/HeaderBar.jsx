import './HeaderBar.css';

export function HeaderBar({ projectName, elapsed, mode, onPause }) {
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <header className="header-bar">
      <span className="header-bar__logo">Claw'd Forge</span>
      {projectName && (
        <>
          <div className="header-bar__divider" />
          <span className="header-bar__project">Project: {projectName}</span>
        </>
      )}
      <span className="header-bar__timer">
        <span className="header-bar__timer-dot" />
        {formatTime(elapsed)}
      </span>
      {mode === 'build' && (
        <button className="header-bar__pause" onClick={onPause} title="Pause build">
          ⏸
        </button>
      )}
    </header>
  );
}
