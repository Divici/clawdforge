import { useEffect } from 'preact/hooks';

export function useForgeEvents(handler) {
  useEffect(() => {
    if (!window.forgeAPI) return;
    window.forgeAPI.onForgeEvent(handler);
  }, [handler]);
}
