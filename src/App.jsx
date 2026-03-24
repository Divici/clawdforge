import { useState, useCallback, useEffect } from 'preact/hooks';
import { HeaderBar } from './components/HeaderBar';
import { LaunchScreen } from './components/LaunchScreen';
import { PresearchWizard } from './components/presearch/PresearchWizard';
import { BuildDashboard } from './components/build/BuildDashboard';
import { ConfigScreen } from './components/build/ConfigScreen';
import { ClawdStage } from './clawd/ClawdStage';
import { setCostume, spawnHelper, removeHelper } from './clawd/stage-renderer';
import { useElapsedTimer } from './hooks/useElapsedTimer';
import { useForgeState } from './hooks/useForgeState';

export function App() {
  const [mode, setMode] = useState('launch'); // 'launch' | 'presearch' | 'build' | 'complete'
  const [projectName, setProjectName] = useState('');
  const [running, setRunning] = useState(false);
  const elapsed = useElapsedTimer(running);
  const { state, presearch, build, config } = useForgeState();

  // Drive mode transitions from disk state
  useEffect(() => {
    if (!state?.mode) return;
    const newMode = state.mode;
    if (newMode === 'presearch' || newMode === 'build' || newMode === 'complete') {
      setMode(newMode);
    }
    if (newMode === 'error') {
      setMode('complete');
    }
    // Stop timer on complete or error
    if (newMode === 'complete' || newMode === 'error') {
      setRunning(false);
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
    const active = build.agents.active || 0;
    if (active > 0) spawnHelper();
  }, [build?.agents?.active]);

  // Fallback completion detection: when Claude process exits,
  // if state.json wasn't updated to "complete", force transition
  useEffect(() => {
    if (!window.forgeAPI) return;
    window.forgeAPI.onClaudeExit((data) => {
      console.log('[app] Claude exited with code:', data?.code);
      // Give the watcher 2 seconds to pick up any final state.json write
      setTimeout(() => {
        if (mode === 'build' || mode === 'presearch') {
          console.log('[app] Claude exited during', mode, '— forcing completion');
          setMode('complete');
          setRunning(false);
        }
      }, 2000);
    });
  }, [mode]);


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
        {mode === 'complete' && (
          <ConfigScreen
            config={config}
            summary={{
              ...(build?.summary || {}),
              projectName: projectName,
              error: state?.error || null,
              phases: build?.phases?.length || 0,
            }}
            projectName={projectName}
            elapsed={`${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
            onSkip={() => { setMode('launch'); setRunning(false); }}
          />
        )}
      </div>
      <div className="app-layout__stage">
        <ClawdStage />
      </div>
    </div>
  );
}
