import { describe, expect, it } from 'vitest';
import { render } from 'react-email';
import { NotificationEmail } from '../../emails/NotificationEmail.js';
import type { NotificationEmailProps } from '../../emails/NotificationEmail.js';
import type { Counts } from '../../types.js';

const BASE_COUNTS: Counts = { last24h: 5, last7d: 20, last30d: 80 };

function makeProps(overrides: Partial<NotificationEmailProps> = {}): NotificationEmailProps {
  return {
    title: 'My Notification',
    totalHits: 12,
    frequency: 'weekly',
    viewResultsUrl: 'https://app.example.com/results',
    emailType: 'normal',
    effectiveFailureCount: 0,
    exceededWindows: [],
    notificationSettingsUrl: 'https://app.example.com/settings/notifications',
    linksEnabled: false,
    documents: [],
    countsEnabled: false,
    counts: BASE_COUNTS,
    ...overrides,
  };
}

async function renderEmail(props: Partial<NotificationEmailProps> = {}): Promise<string> {
  const raw = await render(<NotificationEmail {...makeProps(props)} />);
  return raw.replace(/<!--.*?-->/gs, '');
}

describe('NotificationEmail', () => {
  describe('always-present content', () => {
    it('contains the notification title', async () => {
      const html = await renderEmail({ title: 'Quarterly Report' });
      expect(html).toContain('Quarterly Report');
    });

    it('contains the total hit count', async () => {
      const html = await renderEmail({ totalHits: 42 });
      expect(html).toContain('42');
    });

    it('contains a link to view results', async () => {
      const html = await renderEmail({ viewResultsUrl: 'https://example.com/r' });
      expect(html).toContain('https://example.com/r');
    });

    it('includes the frequency period label for daily', async () => {
      const html = await renderEmail({ frequency: 'daily' });
      expect(html).toContain('24 hours');
    });

    it('includes the frequency period label for weekly', async () => {
      const html = await renderEmail({ frequency: 'weekly' });
      expect(html).toContain('7 days');
    });

    it('includes the frequency period label for monthly', async () => {
      const html = await renderEmail({ frequency: 'monthly' });
      expect(html).toContain('30 days');
    });
  });

  describe('counts section', () => {
    it('does not include counts when countsEnabled is false', async () => {
      const html = await renderEmail({ countsEnabled: false });
      expect(html).not.toContain('Last 24 hours');
    });

    it('includes counts when countsEnabled is true', async () => {
      const html = await renderEmail({
        countsEnabled: true,
        counts: { last24h: 3, last7d: 15, last30d: 60 },
      });
      expect(html).toContain('Last 24 hours');
      expect(html).toContain('Last 7 days');
      expect(html).toContain('Last 30 days');
    });
  });

  describe('document links section', () => {
    it('does not include links section when linksEnabled is false', async () => {
      const html = await renderEmail({ linksEnabled: false, documents: [] });
      expect(html).not.toContain('Most Relevant Results Found');
    });

    it('includes document links when linksEnabled is true and documents are present', async () => {
      const html = await renderEmail({
        linksEnabled: true,
        documents: [
          { id: 'd1', title: 'Alpha Report', url: 'https://example.com/d1' },
          { id: 'd2', title: 'Beta Summary', url: 'https://example.com/d2' },
        ],
      });
      expect(html).toContain('Alpha Report');
      expect(html).toContain('https://example.com/d1');
      expect(html).toContain('Beta Summary');
    });

    it('caps document links at 10', async () => {
      const documents = Array.from({ length: 15 }, (_, i) => ({
        id: `d${i}`,
        title: `Doc ${i}`,
        url: `https://example.com/d${i}`,
      }));
      const html = await renderEmail({ linksEnabled: true, documents });
      expect(html).toContain('Doc 9');
      expect(html).not.toContain('Doc 10');
    });
  });

  describe('warning banner', () => {
    it('does not show warning for normal email type', async () => {
      const html = await renderEmail({ emailType: 'normal' });
      expect(html).not.toContain('Result Limit Exceeded');
    });

    it('shows warning banner for warning email type', async () => {
      const html = await renderEmail({
        emailType: 'warning',
        effectiveFailureCount: 1,
        exceededWindows: [{ window: '24h', count: 150, threshold: 100 }],
      });
      expect(html).toContain('Strike 1 of 3');
    });

    it('shows warning banner for disabled email type', async () => {
      const html = await renderEmail({
        emailType: 'disabled',
        effectiveFailureCount: 3,
        exceededWindows: [{ window: '24h', count: 200, threshold: 100 }],
      });
      expect(html).toContain('Strike 3 of 3');
    });
  });

  describe('disabled notice', () => {
    it('does not show disabled notice for normal email type', async () => {
      const html = await renderEmail({ emailType: 'normal' });
      expect(html).not.toContain('Notification Automatically Disabled');
    });

    it('does not show disabled notice for warning email type', async () => {
      const html = await renderEmail({ emailType: 'warning', effectiveFailureCount: 1 });
      expect(html).not.toContain('Notification Automatically Disabled');
    });

    it('shows disabled notice for disabled email type', async () => {
      const html = await renderEmail({
        emailType: 'disabled',
        effectiveFailureCount: 3,
        notificationSettingsUrl: 'https://app.example.com/settings',
      });
      expect(html).toContain('Notification Automatically Disabled');
      expect(html).toContain('https://app.example.com/settings');
    });
  });

  describe('snapshot', () => {
    it('matches snapshot for a fully populated email', async () => {
      const html = await renderEmail({
        title: 'Weekly Security Digest',
        totalHits: 7,
        frequency: 'weekly',
        emailType: 'normal',
        countsEnabled: true,
        counts: { last24h: 2, last7d: 7, last30d: 25 },
        linksEnabled: true,
        documents: [
          { id: 'd1', title: 'CVE-2025-1234', url: 'https://app.example.com/documents/d1' },
          { id: 'd2', title: 'Patch Tuesday Report', url: 'https://app.example.com/documents/d2' },
        ],
      });
      expect(html).toMatchSnapshot();
    });
  });
});
