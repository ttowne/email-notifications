# Claude context — email-notifications/preview

## Module resolution

This is a Next.js app using `"moduleResolution": "bundler"`. The webpack config in `next.config.mjs` sets `extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }` so NodeNext-style `.js` imports from the parent `src/emails/` directory resolve to their actual `.ts`/`.tsx` files. Without this alias the build fails with "Module not found" errors on any import that uses a `.js` extension.

## Monaco Editor

`@monaco-editor/react` must be dynamically imported with `{ ssr: false }`:

```tsx
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
```

Static or server-side imports will fail at build time.

## Save & verify flow

`saveJsx` in `page.tsx`:
1. Captures `jsxOriginalsRef.current[activeJsxFile]` as the revert target (what's currently on disk).
2. POSTs new source to `/api/source`.
3. Waits 2 s — Next.js needs this time to detect the file change and invalidate its server-side module cache. Reducing this risks the test render serving a cached (pre-change) module.
4. POSTs to `/api/render` to test the new source.
5. On non-2xx: POSTs the original source back to `/api/source` and resets editor state.
6. On success: updates `jsxOriginalsRef` and sets the iframe HTML directly (no extra render cycle).

## JSX source caching

`jsxSources` state holds the current *editor content* (may have unsaved edits). `jsxOriginalsRef` holds what is actually on disk per file. Loading a file sets both. A successful save updates only `jsxOriginalsRef`. A reverted save resets both to the original.

`loadedJsxFiles` (a `useRef<Set<string>>`) prevents duplicate fetches when switching between files rapidly.

## ESLint

`eslint: { ignoreDuringBuilds: true }` is set in `next.config.mjs` because the parent project's strict ESLint config (explicit return types, Prettier enforcement) would otherwise fail the Next.js production build.

## Workspace root warning

`outputFileTracingRoot` in `next.config.mjs` is set to the preview directory to suppress Next.js warnings about multiple `package-lock.json` files from the parent workspace.

## Test runner

Uses Vitest with `@vitejs/plugin-react`. Run with `npx vitest run`. The four tests in `src/__tests__/render.test.tsx` bypass Next.js entirely and call `render()` directly, making them useful for diagnosing template errors without starting the dev server.
