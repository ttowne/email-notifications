import { describe, it, expect } from 'vitest';
import { render } from 'react-email';
import { NotificationEmail } from '../../../src/emails/NotificationEmail.js';
import type { NotificationEmailProps } from '../../../src/emails/NotificationEmail.js';

const BASE_PROPS: NotificationEmailProps = {
  title: 'Test Alert',
  totalHits: 10,
  frequency: 'daily',
  emailType: 'normal',
  effectiveFailureCount: 0,
  exceededWindows: [],
  viewResultsUrl: 'https://example.com/results',
  notificationSettingsUrl: 'https://example.com/settings',
  linksEnabled: false,
  documents: [],
  countsEnabled: false,
  counts: { last24h: 3, last7d: 10, last30d: 40 },
};

describe('preview render', () => {
  it('renders a normal email to HTML', async () => {
    const html = await render(<NotificationEmail {...BASE_PROPS} />);
    expect(html).toContain('Test Alert');
    expect(html).toContain('10');
  });

  it('renders a warning email with the banner', async () => {
    const html = await render(
      <NotificationEmail
        {...BASE_PROPS}
        emailType="warning"
        effectiveFailureCount={2}
        exceededWindows={[{ window: '24h', count: 150, threshold: 100 }]}
      />,
    );
    expect(html).toContain('Result Limit Exceeded');
  });

  it('renders a disabled email with both banner and notice', async () => {
    const html = await render(
      <NotificationEmail
        {...BASE_PROPS}
        emailType="disabled"
        effectiveFailureCount={3}
        exceededWindows={[{ window: '7d', count: 600, threshold: 500 }]}
      />,
    );
    expect(html).toContain('Result Limit Exceeded');
    expect(html).toContain('Notification Automatically Disabled');
  });

  it('renders with counts and document links', async () => {
    const html = await render(
      <NotificationEmail
        {...BASE_PROPS}
        countsEnabled={true}
        linksEnabled={true}
        documents={[{ id: 'd1', title: 'CVE-2025-1234', url: 'https://example.com/d1' }]}
      />,
    );
    expect(html).toContain('Last 24 hours');
    expect(html).toContain('CVE-2025-1234');
  });
});
