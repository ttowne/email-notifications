import { render } from 'react-email';
import { NotificationEmail } from './emails/NotificationEmail.js';
import type { Counts, DocumentDetails, EmailType, ExceededWindow, Frequency } from './types.js';

/** Parameters accepted by buildNotificationEmail, mirroring NotificationEmailProps. */
export interface BuildEmailParams {
  title: string;
  totalHits: number;
  frequency: Frequency;
  viewResultsUrl: string;
  emailType: EmailType;
  effectiveFailureCount: number;
  exceededWindows: ExceededWindow[];
  notificationSettingsUrl: string;
  linksEnabled: boolean;
  documents: DocumentDetails[];
  countsEnabled: boolean;
  counts: Counts;
}

/**
 * Renders the NotificationEmail template to an HTML string.
 *
 * Note: react-email's render() injects <!-- --> comment markers between
 * adjacent text nodes in React 19. These are harmless in real email clients
 * but must be stripped in tests that check for specific text content — see
 * the renderEmail() helper in NotificationEmail.test.tsx.
 */
export async function buildNotificationEmail(params: BuildEmailParams): Promise<string> {
  return render(
    <NotificationEmail
      title={params.title}
      totalHits={params.totalHits}
      frequency={params.frequency}
      viewResultsUrl={params.viewResultsUrl}
      emailType={params.emailType}
      effectiveFailureCount={params.effectiveFailureCount}
      exceededWindows={params.exceededWindows}
      notificationSettingsUrl={params.notificationSettingsUrl}
      linksEnabled={params.linksEnabled}
      documents={params.documents}
      countsEnabled={params.countsEnabled}
      counts={params.counts}
    />,
  );
}
