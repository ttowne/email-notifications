import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Map of file identifiers (used by the preview UI) to paths relative to the
 * email-notifications repo root (the parent of this preview/ directory).
 * Add an entry here whenever a new component should be editable in the JSX tab.
 */
const FILE_PATHS: Record<string, string> = {
  NotificationEmail: 'src/emails/NotificationEmail.tsx',
  ResultsSummary: 'src/emails/components/ResultsSummary.tsx',
  CountsTable: 'src/emails/components/CountsTable.tsx',
  DocumentLinks: 'src/emails/components/DocumentLinks.tsx',
  WarningBanner: 'src/emails/components/WarningBanner.tsx',
  DisabledNotice: 'src/emails/components/DisabledNotice.tsx',
};

// Resolved at startup — process.cwd() is the preview/ directory when running
// under Next.js, so we go one level up to reach the repo root.
const ROOT = path.resolve(process.cwd(), '..');

/**
 * GET /api/source?file=<key>
 * Returns the raw TypeScript source of the requested email component.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const file = request.nextUrl.searchParams.get('file') ?? 'NotificationEmail';
  const rel = FILE_PATHS[file];
  if (!rel) return NextResponse.json({ error: 'Unknown file' }, { status: 404 });

  const source = await readFile(path.join(ROOT, rel), 'utf-8');
  return new NextResponse(source, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/**
 * POST /api/source
 * Body: { file: string, source: string }
 *
 * Writes new source content to disk. Next.js HMR picks up the change and
 * reloads the module, which is why the preview UI waits ~2 s before testing
 * the render after a save.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { file, source } = (await request.json()) as { file: string; source: string };
  const rel = FILE_PATHS[file];
  if (!rel) return NextResponse.json({ error: 'Unknown file' }, { status: 404 });

  await writeFile(path.join(ROOT, rel), source, 'utf-8');
  return NextResponse.json({ ok: true });
}
