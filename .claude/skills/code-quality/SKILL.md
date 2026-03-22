# Code Quality Skill — Claw'd Forge

## Quality Gate Commands
Run ALL before finishing any task:

```bash
# Tests (unit + component)
npx vitest run

# Lint
npx eslint src/ --ext .js,.jsx
```

## Standards
- **No `console.log`** in production code (use only in development/debug)
- **Preact imports**: Use `import { h } from 'preact'` or JSX with preact/compat alias
- **CSS**: Use CSS custom properties from `src/styles/theme.css` — never hardcode colors
- **Event handling**: Always use the ForgeBus event system, never direct DOM events for cross-component communication
- **IPC**: Always use `window.forgeAPI` from preload — never import `electron` directly in renderer

## File Organization
- One component per file
- Co-locate component-specific styles as CSS modules
- Hooks in `src/hooks/`, shared components in `src/components/shared/`
- Bridge modules are CommonJS (main process), components are ESM (renderer)
