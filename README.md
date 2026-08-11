# file-manager
Just a file manager on electron+vue

![Screenshot](screenshot.png)

## Stack
- Electron (main + preload in TypeScript, compiled to `dist-electron/`)
- Vue 3 (Options API, `<script lang="ts">`)
- TypeScript (`tsc` for type-checking, ESLint + `@vue/typescript/recommended` for linting)
- Vitest — unit tests
- Playwright — end-to-end tests

## Project setup
```
npm install
```

Note: install may require `--legacy-peer-deps` (pre-existing `cache-loader` ↔ `webpack` peer conflict in vue-cli 5).

## Start app
```
npm start
```
Builds the electron main process (`dist-electron/`), compiles the renderer, then launches Electron.

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints files (TypeScript + Vue)
```
npm run lint
```

### Type-checks the renderer
```
npm run typecheck
```

### Web live preview (no server, runs entirely in the browser)
```
npm run preview:web
```
Builds the renderer and opens `dist/index.html` in the default browser.
No backend and no server are involved: the app boots into a browser-only mode
that installs an in-memory mock of the Electron API and a virtual file system
(`src/web/`) so the whole file manager works with nothing but static files.
All changes made inside the preview live in memory and are lost on reload.

### Web smoke test (headless, no server)
```
npm run test:web
```
Loads the built `dist/index.html` via the `file://` protocol in headless
Chromium and exercises the UI (menus, creating a folder, moving a file to the
trash) plus the in-memory backend (restore, copy, move, search, clipboard).

### Runs unit tests
```
npm test
```

### Runs end-to-end tests (requires a display)
```
npm run test:e2e
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
