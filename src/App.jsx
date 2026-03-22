import { useState, useCallback } from 'preact/hooks';
import { HeaderBar } from './components/HeaderBar';
import { LaunchScreen } from './components/LaunchScreen';
import { PresearchWizard } from './components/presearch/PresearchWizard';
import { BuildDashboard } from './components/build/BuildDashboard';
import { CompletionScreen } from './components/build/CompletionScreen';
import { ClawdStage } from './clawd/ClawdStage';
import { useElapsedTimer } from './hooks/useElapsedTimer';

export function App() {
  const [mode, setMode] = useState('launch'); // 'launch' | 'presearch' | 'build' | 'complete'
  const [projectName, setProjectName] = useState('');
  const [running, setRunning] = useState(false);
  const elapsed = useElapsedTimer(running);

  const handleLaunch = useCallback((config) => {
    const dirName = config.projectDir.split(/[/\\]/).pop();
    setProjectName(dirName);
    setRunning(true);
    setMode('presearch');

    // Spawn Claude via IPC
    if (window.forgeAPI) {
      window.forgeAPI.spawnClaude({
        projectDir: config.projectDir,
        prompt: config.description,
        prdFile: config.prdFile,
      });
    }
  }, []);

  const handlePause = useCallback(() => {
    if (window.forgeAPI) {
      window.forgeAPI.sendForgeResponse('pause', {});
    }
  }, []);

  return (
    <div className="app-layout">
      <div className="app-layout__dashboard">
        {mode !== 'launch' && (
          <HeaderBar
            projectName={projectName}
            elapsed={elapsed}
            mode={mode}
            onPause={handlePause}
          />
        )}
        {mode === 'launch' && <LaunchScreen onLaunch={handleLaunch} />}
        {mode === 'presearch' && <PresearchWizard />}
        {mode === 'build' && <BuildDashboard onComplete={() => setMode('complete')} />}
        {mode === 'complete' && <CompletionScreen summary={{}} onNewProject={() => { setMode('launch'); setRunning(false); }} />}
      </div>
      <div className="app-layout__stage">
        <ClawdStage />
      </div>
    </div>
  );
}
