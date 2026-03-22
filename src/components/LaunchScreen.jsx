import { useState } from 'preact/hooks';
import { Button } from './shared/Button';
import './LaunchScreen.css';

export function LaunchScreen({ onLaunch }) {
  const [projectDir, setProjectDir] = useState('');
  const [prdFiles, setPrdFiles] = useState([]);
  const [selectedPrd, setSelectedPrd] = useState('');
  const [description, setDescription] = useState('');
  const [hasResume, setHasResume] = useState(false);
  const [startMode, setStartMode] = useState('prd'); // 'prd' | 'describe' | 'resume'
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
      prdFile: startMode === 'prd' ? selectedPrd : null,
      description: startMode === 'describe' ? description : null,
    });
  };

  return (
    <div className="launch-screen">
      <div className="launch-screen__dialog">
        <h1 className="launch-screen__title">CLAW'D FORGE</h1>

        <label className="launch-screen__label">Project Directory</label>
        <div className="launch-screen__dir-picker">
          <span className="launch-screen__dir-path">
            {projectDir || 'No directory selected'}
          </span>
          <Button variant="secondary" onClick={handleBrowse}>Browse</Button>
        </div>

        {projectDir && (
          <div className="launch-screen__options">
            <label className="launch-screen__label">How would you like to start?</label>

            <label className="launch-screen__radio">
              <input
                type="radio"
                name="startMode"
                value="prd"
                checked={startMode === 'prd'}
                onChange={() => setStartMode('prd')}
                disabled={prdFiles.length === 0}
              />
              <span>Use a PRD file</span>
            </label>
            {startMode === 'prd' && prdFiles.length > 0 && (
              <select
                className="launch-screen__select"
                value={selectedPrd}
                onChange={(e) => setSelectedPrd(e.target.value)}
              >
                {prdFiles.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            )}

            <label className="launch-screen__radio">
              <input
                type="radio"
                name="startMode"
                value="describe"
                checked={startMode === 'describe'}
                onChange={() => setStartMode('describe')}
              />
              <span>Describe your project</span>
            </label>
            {startMode === 'describe' && (
              <textarea
                className="launch-screen__textarea"
                rows={4}
                placeholder="Describe what you want to build..."
                value={description}
                onInput={(e) => setDescription(e.target.value)}
              />
            )}

            {hasResume && (
              <label className="launch-screen__radio">
                <input
                  type="radio"
                  name="startMode"
                  value="resume"
                  checked={startMode === 'resume'}
                  onChange={() => setStartMode('resume')}
                />
                <span>Resume existing workflow</span>
              </label>
            )}
          </div>
        )}

        <Button
          variant="primary"
          disabled={!canStart}
          onClick={handleStart}
        >
          Start Forge
        </Button>
      </div>
    </div>
  );
}
