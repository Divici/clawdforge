import { useState, useEffect } from 'preact/hooks';

/**
 * Hook that subscribes to disk-state events from ForgeStateWatcher.
 * Returns { state, presearch, build } where each is the latest
 * JSON content from the corresponding .forge/ file, or null.
 */
export function useForgeState() {
  const [state, setState] = useState(null);
  const [presearch, setPresearch] = useState(null);
  const [build, setBuild] = useState(null);

  useEffect(() => {
    if (!window.forgeAPI) return;

    if (window.forgeAPI.onStateUpdate) {
      window.forgeAPI.onStateUpdate(setState);
    }
    if (window.forgeAPI.onPresearchUpdate) {
      window.forgeAPI.onPresearchUpdate(setPresearch);
    }
    if (window.forgeAPI.onBuildUpdate) {
      window.forgeAPI.onBuildUpdate(setBuild);
    }
  }, []);

  return { state, presearch, build };
}
