# email-preview

Interactive development tool for the `email-notifications` email templates. Renders templates live in a browser with editable props, raw JSON editing, and in-browser JSX source editing.

## Running

```sh
# From the repo root (recommended):
npm run preview:dev

# Or directly:
cd preview && npm install && npm run dev
```

Opens at **http://localhost:3001**. The preview reads and writes source files in the parent `src/emails/` directory directly, so changes persist as real file edits.

## Features

### Form tab
Edit all template props through labeled inputs. Changes trigger a re-render automatically after a 150 ms debounce.

### JSON tab
Edit the full props object as raw JSON. Click **Apply** to parse and update the preview. Parse errors are shown inline.

### JSX tab
Browse and edit the React Email source files in a Monaco editor. File switcher in the toolbar lets you jump between the root template and any of its component files.

**Save & verify flow:**
1. Click **Save** — the new source is written to disk.
2. Status shows "Verifying…" while the tool waits 2 s for Next.js HMR to reload the module.
3. A test render is performed against the current props.
4. If the render returns an error (HTTP 5xx), the original source is restored to disk and in the editor, and "Render failed — changes were reverted" is shown in red.
5. If the render succeeds, the preview iframe updates immediately.

### Dark mode toggle
The **DARK** button in the top bar applies `invert(1) hue-rotate(180deg)` to the preview iframe, simulating how the email looks in a dark-mode email client. Click **LIGHT** to return to normal.

### Resizable pane
Drag the divider between the editor panel and the preview panel. Each panel has a minimum width of 300 px. The divider highlights blue while dragging.

### Template switcher
Dropdown in the top bar to switch between available templates. Currently only `NotificationEmail` is registered.

## Adding a new template

1. Create the component in `../src/emails/`.
2. Register it in `COMPONENTS` in `src/app/api/render/route.tsx`.
3. Add its file path(s) to `FILE_PATHS` in `src/app/api/source/route.ts`.
4. Add it to `TEMPLATE_NAMES`, `TEMPLATE_DEFAULTS`, and `JSX_FILES` in `src/app/page.tsx`.

## Testing

```sh
npm test         # run Vitest tests once
npm run test:watch
```

The four tests in `src/__tests__/render.test.tsx` import the email components directly and verify the render path works end-to-end outside of Next.js. Run these if the preview dev server isn't available.

## Project structure

```
src/
  app/
    layout.tsx              Root Next.js layout
    page.tsx                Preview UI — split pane, all tabs, dark mode, resize
    api/
      render/route.tsx      POST /api/render  — renders a template to HTML
      source/route.ts       GET /api/source   — reads a source file from disk
                            POST /api/source  — writes a source file to disk
  __tests__/
    render.test.tsx         Render path integration tests
next.config.mjs             Webpack extensionAlias for NodeNext .js imports
```
