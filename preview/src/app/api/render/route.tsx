import { type NextRequest, NextResponse } from 'next/server';
import { render } from 'react-email';
import { NotificationEmail } from '../../../../../src/emails/NotificationEmail.js';

/**
 * Registry of available templates. Add new entries here when new email
 * templates are created in src/emails/. The key is the template name used
 * by the preview UI; the value is the React component to render.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<string, React.ComponentType<any>> = {
  NotificationEmail,
};

/**
 * POST /api/render
 *
 * Accepts { template?, props } as JSON, renders the specified template using
 * react-email, and returns the HTML string. Returns 404 for unknown templates
 * and 500 with an inline error <pre> for render failures (so the preview
 * iframe shows the error in context rather than a blank screen).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { template = 'NotificationEmail', props } = (await request.json()) as {
      template?: string;
      props: Record<string, unknown>;
    };

    const Component = COMPONENTS[template];
    if (!Component) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
    }

    const html = await render(<Component {...props} />);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      `<pre style="color:red;padding:20px;font-family:monospace">Render error:\n${message}</pre>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}
