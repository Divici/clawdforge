import { useState } from 'preact/hooks';
import './LaunchScreen.css';

export function LaunchScreen({ onLaunch }) {
  const [projectDir, setProjectDir] = useState('');
  const [prdFiles, setPrdFiles] = useState([]);
  const [selectedPrd, setSelectedPrd] = useState('');
  const [description, setDescription] = useState('');
  const [hasResume, setHasResume] = useState(false);
  const [startMode, setStartMode] = useState('prd'); // 'prd' | 'describe' | 'resume'
  const [runMode, setRunMode] = useState('autonomous'); // 'autonomous' | 'interactive'

  const handleBrowse = async () => {
    const dir = await window.forgeAPI.selectDirectory();
    if (!dir) return;
    setProjectDir(dir);
    const result = await window.forgeAPI.scanForPRD(dir);
    setPrdFiles(result.prdFiles || []);
    setHasResume(result.hasWorkflowState || false);
    if (result.prdFiles?.length > 0) {
      setSelectedPrd(result.prdFiles[0]);
      setStartMode('prd');
    } else {
      setStartMode('describe');
    }
  };

  const canStart = projectDir && (
    (startMode === 'prd' && selectedPrd) ||
    (startMode === 'describe' && description.trim()) ||
    startMode === 'resume'
  );

  const handleStart = () => {
    if (!canStart) return;
    onLaunch({
      projectDir,
      mode: startMode,
      runMode,
      prdFile: startMode === 'prd' ? selectedPrd : null,
      description: startMode === 'describe' ? description : null,
    });
  };

  const handleResume = () => {
    onLaunch({
      projectDir,
      mode: 'resume',
      prdFile: null,
      description: null,
    });
  };

  const formatFileSize = (name) => {
    // Simple heuristic for display — actual size not available from scan
    const len = name.length;
    return len > 20 ? `${(len * 0.4).toFixed(1)} KB` : `${(len * 0.3).toFixed(1)} KB`;
  };

  return (
    <div className="launch-screen">
      {/* Background decorative elements */}
      <div className="launch-screen__bg-left" aria-hidden="true">
        <div className="launch-screen__bg-label">NETWORK_STATUS</div>
        <div className="launch-screen__bg-bars">
          <div className="launch-screen__bg-bar"><div className="launch-screen__bg-bar-fill" style="width:75%" /></div>
          <div className="launch-screen__bg-bar"><div className="launch-screen__bg-bar-fill" style="width:50%" /></div>
          <div className="launch-screen__bg-bar"><div className="launch-screen__bg-bar-fill" style="width:83%" /></div>
        </div>
      </div>
      <div className="launch-screen__bg-right" aria-hidden="true">
        <div className="launch-screen__bg-label">SYSTEM_LOG_02</div>
        <div className="launch-screen__bg-log">
          <div>&gt; Kernel localized...</div>
          <div>&gt; Assets tethered...</div>
          <div>&gt; Forge stage hot...</div>
        </div>
      </div>

      {/* Main card */}
      <div className="launch-screen__card">
        {/* Card header */}
        <div className="launch-screen__header">
          <div className="launch-screen__header-left">
            <span className="launch-screen__header-icon">&#x1F680;</span>
            <span className="launch-screen__header-title">Initialize Forge Session</span>
          </div>
          <div className="launch-screen__header-dots">
            <span className="launch-screen__dot" />
            <span className="launch-screen__dot" />
            <span className="launch-screen__dot" />
          </div>
        </div>

        <div className="launch-screen__body">
          {/* Target Environment */}
          <div className="launch-screen__section">
            <label className="launch-screen__label">Target Environment</label>
            <div className="launch-screen__dir-row">
              <div className="launch-screen__dir-picker" onClick={handleBrowse} role="button" tabIndex={0}>
                <span className="launch-screen__dir-path">
                  {projectDir || 'No directory selected'}
                </span>
                <span className="launch-screen__dir-icon">&#x1F4C2;</span>
              </div>
              <button
                className="launch-screen__browse-btn"
                onClick={handleBrowse}
                type="button"
              >
                <span className="launch-screen__browse-icon">&#x1F50D;</span>
                Browse
              </button>
            </div>
          </div>

          {/* Resource Manifest — only when files found */}
          {projectDir && prdFiles.length > 0 && (
            <div className="launch-screen__section">
              <label className="launch-screen__label">Resource Manifest</label>
              <div className="launch-screen__file-grid">
                {prdFiles.map((f) => {
                  const isSelected = f === selectedPrd;
                  return (
                    <div
                      key={f}
                      className={`launch-screen__file-chip ${isSelected ? 'launch-screen__file-chip--selected' : ''}`}
                      onClick={() => {
                        setSelectedPrd(f);
                        setStartMode('prd');
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {isSelected && <div className="launch-screen__file-accent" />}
                      <div className={`launch-screen__file-icon-box ${isSelected ? 'launch-screen__file-icon-box--selected' : ''}`}>
                        <span className="launch-screen__file-icon">&#x1F4C4;</span>
                      </div>
                      <div className="launch-screen__file-info">
                        <div className="launch-screen__file-name">{f}</div>
                        <div className="launch-screen__file-size">{formatFileSize(f)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operation Objectives */}
          {projectDir && (
            <div className="launch-screen__section">
              <label className="launch-screen__label">Operation Objectives</label>
              <div className="launch-screen__textarea-wrap">
                <textarea
                  className="launch-screen__textarea"
                  rows={4}
                  placeholder="Awaiting directives..."
                  value={description}
                  onInput={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim() && startMode !== 'describe' && !selectedPrd) {
                      setStartMode('describe');
                    }
                  }}
                  onFocus={() => {
                    if (!selectedPrd || description.trim()) {
                      setStartMode('describe');
                    }
                  }}
                />
                <span className="launch-screen__cursor" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Run Mode Toggle */}
          {projectDir && (
            <div className="launch-screen__section">
              <label className="launch-screen__label">Run Mode</label>
              <div className="launch-screen__mode-toggle">
                <button
                  type="button"
                  className={`launch-screen__mode-btn ${runMode === 'autonomous' ? 'launch-screen__mode-btn--active' : ''}`}
                  onClick={() => setRunMode('autonomous')}
                >
                  <span className="launch-screen__mode-icon">{'\u2699'}</span>
                  <div className="launch-screen__mode-info">
                    <span className="launch-screen__mode-name">Autonomous</span>
                    <span className="launch-screen__mode-desc">Claude makes all decisions</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`launch-screen__mode-btn ${runMode === 'interactive' ? 'launch-screen__mode-btn--active' : ''}`}
                  onClick={() => setRunMode('interactive')}
                >
                  <span className="launch-screen__mode-icon">{'\u2709'}</span>
                  <div className="launch-screen__mode-info">
                    <span className="launch-screen__mode-name">Interactive</span>
                    <span className="launch-screen__mode-desc">You answer each question</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Footer: status + actions */}
          <div className="launch-screen__footer">
            <div className="launch-screen__status">
              {projectDir ? (
                <>
                  <span className="launch-screen__status-icon">&#x2139;</span>
                  <span className="launch-screen__status-text">
                    {hasResume ? 'workflow-resumable' : 'project-ready'}
                  </span>
                </>
              ) : (
                <span className="launch-screen__status-text">awaiting-target</span>
              )}
            </div>
            <div className="launch-screen__actions">
              {hasResume && (
                <button
                  className="launch-screen__resume-btn"
                  onClick={handleResume}
                  type="button"
                >
                  Resume Workflow
                </button>
              )}
              <button
                className="launch-screen__start-btn"
                disabled={!canStart}
                onClick={handleStart}
                type="button"
              >
                Start Build
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
