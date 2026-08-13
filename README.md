# file-manager

A file manager built with **Electron** and **Vue 3**.

![Screenshot](screenshot.png)

---

## Features

- **Three file views** — switch between a compact list, a zoomable icon grid and
  a sortable table.
- **Tabs** — work in multiple directories at once; dock tabs to the sidebar.
- **Sidebar & tree** — quick access to your drives and directories with a
  collapsible, auto-hiding layout.
- **Full file operations** — create files and folders, rename, copy, cut, paste,
  move to trash, restore, empty trash and view properties.
- **Rich selection** — single, multi and inverted selection, select-all, cut
  highlighting and keyboard navigation.
- **Smart address bar** — editable breadcrumbs, history back/forward/up,
  bookmark star and dropdown pickers for location, file types and search scope.
- **Instant search** — search mode that filters the current view (or a chosen
  location) by filename, type and more.
- **Preview panel** — inline previews for images, folder icon grids, markdown,
  text and source code with syntax highlighting (dark-theme aware)
- **Tasks widget** — background operations (copy, move, delete) with live
  progress bars and per-task logs.
- **Themes** — built-in Light, Dark and high-contrast Contrast-dark themes, plus
  support for your own `themes/*.json` files. The chosen theme is remembered.
- **Customizable chrome** — auto-hide the top and left panels, show hidden
  files, choose between native or themed HTML menus.
- **Hotkeys** — keyboard-first navigation (see [Hotkeys](#hotkeys)).

## Tech stack

| Layer        | Technology                                                          |
| ------------ | ------------------------------------------------------------------- |
| Shell        | [Electron](https://www.electronjs.org/) (main + preload in TS)      |
| UI           | [Vue 3](https://vuejs.org/) (Options API, `<script lang="ts">`)      |
| Language     | [TypeScript](https://www.typescriptlang.org/)                        |
| Build        | vue-cli 5 (Webpack)                                                  |
| Icons        | [pure-nerd-font](https://www.npmjs.com/package/@azurity/pure-nerd-font) |
| Preview      | [highlight.js](https://highlightjs.org/), [marked](https://marked.js.org/), [DOMPurify](https://github.com/cure53/DOMPurify) |
| Tests        | [Vitest](https://vitest.dev/) (unit), [Playwright](https://playwright.dev/) (E2E + smoke) |

## Getting started

### Prerequisites

- Node.js 20 LTS or newer (targets Electron 41)
- npm

### Install

```bash
npm install
```

> **Note:** you may need `--legacy-peer-deps`. The pre-existing `cache-loader`
> ↔ `webpack` peer conflict is a known quirk of vue-cli 5.

### Run the desktop app

```bash
npm start
```

Compiles the Electron main process into `dist-electron/`, builds the renderer
into `dist/`, then launches Electron.

### Development with hot reload

```bash
npm run serve
```

Builds the Electron main process, starts the vue-cli dev server on port
**8081**, and launches Electron pointed at it.

## Browser preview (no Electron, no server)

The whole app runs on static files only:

```bash
npm run preview:web
```

This builds the renderer and opens `dist/index.html` in your default browser.
A browser-only backend (`src/web/`) installs an in-memory mock of the Electron
API plus a virtual file system, so every feature — navigation, tabs, file
operations, search, trash — works with zero backend. Changes live in memory and
are lost on reload.

To test the built web version manually, just open:

```
file:///path/to/file-manager/dist/index.html
```

## Scripts

| Command                  | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `npm start`              | Build electron main + renderer, then launch Electron               |
| `npm run serve`          | Hot-reload dev server (port 8081) + Electron                       |
| `npm run build`          | Build electron main + minified production renderer (`dist/`)       |
| `npm run lint`           | ESLint on `src` and `e2e` (TypeScript + Vue)                       |
| `npm run typecheck`      | `vue-tsc --noEmit` + electron `tsc --noEmit`                       |
| `npm test`               | Run Vitest unit tests                                              |
| `npm run test:watch`     | Run Vitest in watch mode                                           |
| `npm run test:web`       | Headless web smoke test against `dist/index.html` (no server)      |
| `npm run test:e2e`       | Playwright E2E (requires a display)                                |
| `npm run test:e2e:headed`| Playwright E2E in a visible window                                 |
| `npm run preview:web`    | Build and open the browser-only preview                            |

## Project structure

```
├── src/
│   ├── components/        # Vue components (TopPanel, SideBar, DirEntry, …)
│   ├── stores/            # Reactive state (theme, tasks, menus, …)
│   ├── web/               # Browser-only mock of the Electron API + virtual FS
│   ├── App.vue            # Root component / main layout
│   ├── electron-main.ts   # Electron main process (filesystem, IPC, thumbnails)
│   ├── preload.ts         # Context-isolated preload bridge
│   └── types/             # Shared IPC/type definitions
├── themes/                # JSON theme files (light, dark, contrast-dark, custom)
├── e2e/                   # Playwright end-to-end tests
├── dist/                  # Built renderer output
└── dist-electron/         # Compiled Electron main process
```

## Themes

Themes live in the `themes/` folder. Each theme is a single `.json` file using
the key structure of `themes/light.json`. The app ships with three built-in
themes:

| Name            | File                          | Description                            |
| --------------- | ----------------------------- | -------------------------------------- |
| Light           | `themes/light.json`           | Default light theme                    |
| Dark            | `themes/dark.json`            | Dark theme                             |
| Contrast-dark   | `themes/contrast-dark.json`   | High-contrast black theme              |

To add your own theme, drop a `mytheme.json` file into `themes/` and restart the
app — it appears automatically in **View → Theme**. Your choice is remembered
between sessions.

- Partial themes are **merged over the Light defaults**, so you only override
  the keys you care about.
- Set `"dark": true` to opt into dark-optimized styling (e.g. syntax
  highlighting colors in the file preview).
- Key categories include `background`, `fontColor`, `menu.*`, `dropDown.*`,
  `addressBar.*`, `tabBar.*`, `fileIcon.*`, `input.*`, `code.*` and more.

Example — a minimal custom theme:

```json
{
  "dark": true,
  "background": "#0b0f1a",
  "fontColor": "#e6f1ff",
  "menu": {
    "background": "#0b0f1a",
    "textColor": "#e6f1ff"
  }
}
```

## Hotkeys

| Shortcut                     | Action                                   |
| ---------------------------- | ---------------------------------------- |
| `↑` `↓` `←` `→`             | Move selection (Home / End to jump)      |
| `Enter`                      | Open the selected item                   |
| `Alt+Enter`                  | Open Properties                          |
| `Backspace`                  | Go up one level                          |
| `Delete`                     | Move selection to trash                  |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / cut / paste                     |
| `Ctrl+A`                     | Select all                               |
| `Space`                      | Toggle selection (icons view)            |
| `Ctrl++` / `Ctrl+-` / `Ctrl+0` | Zoom in / out / reset (icons view)    |
| `Escape`                     | Close dialogs and menus                  |

## Testing

The project is covered by three layers:

1. **Unit tests** (`npm test`) — Vitest + `@vue/test-utils` for stores and
   components (e.g. theme store behavior, the tasks widget).
2. **Web smoke test** (`npm run test:web`) — loads the built `dist/index.html`
   over the `file://` protocol in headless Chromium and drives the UI (menus,
   creating folders, moving files to trash) plus the in-memory backend (restore,
   copy, move, search, clipboard).
3. **End-to-end tests** (`npm run test:e2e`) — Playwright against the real
   Electron app; requires a display.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-change`.
3. Make your changes and run `npm run lint` and `npm run typecheck`.
4. Add tests where it makes sense and run `npm test`.
5. Open a pull request.
