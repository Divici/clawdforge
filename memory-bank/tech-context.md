# Tech Context — Claw'd Forge v2

## Stack
| Layer | Technology |
|-------|-----------|
| Shell | Electron 30.x |
| UI Framework | Preact + preact/compat |
| Bundler | Vite |
| Canvas | Vanilla JS (30fps) |
| Terminal | node-pty (hidden) |
| CSS | CSS Modules / vanilla CSS |
| Testing | Vitest + @testing-library/preact |
| Packaging | electron-builder |

## Dependencies (Runtime)
- `node-pty` — pseudo-terminal for Claude CLI
- `preact` + `preact/compat` — UI framework
- `electron-reload` — dev-only hot reload

## Dependencies (Dev)
- `vite` + `@preact/preset-vite` — bundler + JSX
- `vitest` + `@testing-library/preact` — testing
- `eslint` — linting
- `electron` + `electron-builder` — shell + packaging

## Constraints
- Windows primary, Electron cross-platform
- node-pty requires prebuilt binaries (no native compile)
- `launch.js` deletes `ELECTRON_RUN_AS_NODE` for VS Code compatibility
- Sprite assets are AI-generated horizontal sprite sheets (~96x96/frame)

## Deployment
- `electron-builder` produces `.exe` (unsigned, triggers Defender warning)
- Output to `dist/`
