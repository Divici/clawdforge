export function useForgeAPI() {
  return typeof window !== 'undefined' && window.forgeAPI ? window.forgeAPI : null;
}
