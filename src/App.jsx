import { useState, useCallback, useEffect } from 'preact/hooks';
import { HeaderBar } from './components/HeaderBar';
import { LaunchScreen } from './components/LaunchScreen';
import { PresearchWizard } from './components/presearch/PresearchWizard';
import { BuildDashboard } from './components/build/BuildDashboard';
import { CompletionScreen } from './components/build/CompletionScreen';
import { ClawdStage } from './clawd/ClawdStage';
import { setCostume, spawnHelper, removeHelper } from './clawd/stage-renderer';
import { useElapsedTimer } from './hooks/useElapsedTimer';

export function App() {
  const [mode, setMode] = useState('launch'); // 'launch' | 'presearch' | 'build' | 'complete'
  const [projectName, setProjectName] = useState('');
  const [running, setRunning] = useState(false);
  const elapsed = useElapsedTimer(running);

  // Wire forge events to Claw'd stage costumes and helpers
  useEffect(() => {
    if (!window.forgeAPI) return;

    const handleForgeEvent = (event) => {
      switch (event.type) {
        case 'forge:mode':
          setMode(event.mode);
          if (event.mode === 'presearch') setCostume('presearch-constraints');
          if (event.mode === 'build') setCostume('build-bootstrap');
          break;
        case 'forge:loop': {
          const loopCostumeMap = {
            'Constraints': 'presearch-constraints',
            'Discovery': 'presearch-discovery',
            'Refinement': 'presearch-refinement',
            'Plan': 'presearch-planning',
            'GapAnalysis': 'presearch-gap',
          };
          setCostume(loopCostumeMap[event.name] || 'idle');
          break;
        }
        case 'forge:phase':
          setCostume('build-executing');
          break;
        case 'forge:agent-spawn':
          spawnHelper();
          break;
        case 'forge:agent-done':
          removeHelper();
          break;
        case 'forge:complete':
          setMode('complete');
          setCostume('complete');
          break;
      }
    };

    window.forgeAPI.onForgeEvent(handleForgeEvent);
  }, []);

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
