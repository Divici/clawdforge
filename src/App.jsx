import { useState, useCallback, useEffect } from 'preact/hooks';
import { HeaderBar } from './components/HeaderBar';
import { LaunchScreen } from './components/LaunchScreen';
import { PresearchWizard } from './components/presearch/PresearchWizard';
import { BuildDashboard } from './components/build/BuildDashboard';
import { CompletionScreen } from './components/build/CompletionScreen';
import { ClawdStage } from './clawd/ClawdStage';
import { setCostume, spawnHelper, removeHelper } from './clawd/stage-renderer';
import { useElapsedTimer } from './hooks/useElapsedTimer';
import { useForgeState } from './hooks/useForgeState';

export function App() {
  const [mode, setMode] = useState('launch'); // 'launch' | 'presearch' | 'build' | 'complete'
  const [projectName, setProjectName] = useState('');
  const [running, setRunning] = useState(false);
  const elapsed = useElapsedTimer(running);
  const { state, presearch, build } = useForgeState();

  // Drive mode transitions from disk state
  useEffect(() => {
    if (!state?.mode) return;
    const newMode = state.mode;
    if (newMode === 'presearch' || newMode === 'build' || newMode === 'complete') {
      setMode(newMode);
    }
    if (newMode === 'error') {
      setMode('complete'); // show completion with error state
    }
  }, [state?.mode]);

  // Drive Claw'd costumes from disk state
  useEffect(() => {
    if (!state) return;

    if (state.mode === 'presearch') {
      const loopCostumeMap = {
        'Constraints': 'presearch-constraints',
        'Discovery': 'presearch-discovery',
        'Refinement': 'presearch-refinement',
        'Plan': 'presearch-planning',
        'GapAnalysis': 'presearch-gap',
      };
      const loopName = state.presearch?.currentLoopName;
      setCostume(loopCostumeMap[loopName] || 'presearch-constraints');
    } else if (state.mode === 'build') {
      setCostume('build-executing');
    } else if (state.mode === 'complete') {
      setCostume('complete');
    }
  }, [state?.mode, state?.presearch?.currentLoopName]);

  // Agent spawn/done from build state
  useEffect(() => {
    if (!build?.agents) return;
    // Simple approach: sync helper count with active agents
    const active = build.agents.active || 0;
    // This is a rough sync — we'd need prev state for precise spawn/done
    if (active > 0) spawnHelper();
  }, [build?.agents?.active]);


  const handleLaunch = useCallback((config) => {
    const dirName = config.projectDir.split(/[/\\]/).pop();
    setProjectName(dirName);
    setRunning(true);
    setMode('presearch');

    if (window.forgeAPI) {
      window.forgeAPI.spawnClaude({
        projectDir: config.projectDir,
        prompt: config.description,
        prdFile: config.prdFile,
        runMode: config.runMode || 'autonomous',
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
      <div className="grain-overlay" />
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
        {mode === 'presearch' && <PresearchWizard state={state} presearch={presearch} />}
        {mode === 'build' && (
          <BuildDashboard
            state={state}
            buildState={build}
            onComplete={() => setMode('complete')}
          />
        )}
        {mode === 'complete' && <CompletionScreen summary={build?.summary || {}} onNewProject={() => { setMode('launch'); setRunning(false); }} />}
      </div>
      <div className="app-layout__stage">
        <ClawdStage />
      </div>
    </div>
  );
}
