import type { JSX } from 'react';
import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from 'react-email';
import { CountsTable } from './components/CountsTable.js';
import { DisabledNotice } from './components/DisabledNotice.js';
import { DocumentLinks } from './components/DocumentLinks.js';
import { ResultsSummary } from './components/ResultsSummary.js';
import { WarningBanner } from './components/WarningBanner.js';
import type { Counts, DocumentDetails, EmailType, ExceededWindow, Frequency } from '../types.js';

export interface NotificationEmailProps {
  title: string;
  totalHits: number;
  frequency: Frequency;
  viewResultsUrl: string;
  emailType: EmailType;
  /** Current strike count after this run's decision has been applied. */
  effectiveFailureCount: number;
  /** Time windows where result counts exceeded thresholds, shown in warning/disabled banners. */
  exceededWindows: ExceededWindow[];
  notificationSettingsUrl: string;
  linksEnabled: boolean;
  documents: DocumentDetails[];
  countsEnabled: boolean;
  counts: Counts;
  /** URL for the "User Guide" link in the email footer. Defaults to '#' if omitted. */
  userGuideUrl?: string;
  /** Email address for the "Feedback" mailto link in the footer. */
  feedbackEmail?: string;
}

/**
 * Root email template. Layout:
 *   - Title (left-aligned, above the white card)
 *   - White card: result summary → optional counts → optional document links
 *     → optional warning/disabled banners → logo
 *   - Footer with User Guide and Feedback links (outside the card)
 */
export function NotificationEmail({
  title,
  totalHits,
  frequency,
  viewResultsUrl,
  emailType,
  effectiveFailureCount,
  exceededWindows,
  notificationSettingsUrl,
  linksEnabled,
  documents,
  countsEnabled,
  counts,
  userGuideUrl = '#',
  feedbackEmail,
}: NotificationEmailProps): JSX.Element {
  const previewText =
    emailType === 'disabled'
      ? `${title} — notification has been disabled`
      : `${totalHits.toLocaleString()} new result${totalHits === 1 ? '' : 's'} for ${title}`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={outerStyle}>

          {/* Title — left-aligned, above the card */}
          <Section style={titleSectionStyle}>
            <Text style={titleStyle}>{title}</Text>
          </Section>

          {/* White card */}
          <Container style={cardStyle}>
            <ResultsSummary
              totalHits={totalHits}
              frequency={frequency}
              viewResultsUrl={viewResultsUrl}
            />

            {countsEnabled && (
              <>
                <Hr style={hrStyle} />
                <CountsTable counts={counts} />
              </>
            )}

            {linksEnabled && documents.length > 0 && (
              <>
                <Hr style={hrStyle} />
                <DocumentLinks documents={documents} />
              </>
            )}

            {emailType === 'warning' && (
              <WarningBanner
                effectiveFailureCount={effectiveFailureCount}
                exceededWindows={exceededWindows}
              />
            )}

            {emailType === 'disabled' && (
              <>
                <WarningBanner
                  effectiveFailureCount={effectiveFailureCount}
                  exceededWindows={exceededWindows}
                />
                <DisabledNotice notificationSettingsUrl={notificationSettingsUrl} />
              </>
            )}

            {/* Brand logo — swap src for the real hosted logo asset */}
            <Hr style={hrStyle} />
            <Section style={logoSectionStyle}>
              <Img
                src="https://placehold.co/48x48/4285F4/ffffff?text=G&font=inter"
                width={48}
                height={48}
                alt="Company logo"
                style={logoImgStyle}
              />
            </Section>
          </Container>

          {/* Footer — outside the card */}
          <Section style={footerSectionStyle}>
            <Text style={footerTextStyle}>
              Need help? Visit the{' '}
              <Link href={userGuideUrl} style={footerLinkStyle}>User Guide</Link>
              {' '}or send an email to{' '}
              <Link
                href={feedbackEmail ? `mailto:${feedbackEmail}` : '#'}
                style={footerLinkStyle}
              >
                Feedback
              </Link>.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '40px 0',
};

const outerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
};

const titleSectionStyle = {
  padding: '0 0 8px 4px',
};

const titleStyle = {
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#111827',
  margin: '0',
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '32px',
};

const hrStyle = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const logoSectionStyle = {
  padding: '24px 0 8px',
  textAlign: 'center' as const,
};

const logoImgStyle = {
  display: 'block',
  margin: '0 auto',
};

const footerSectionStyle = {
  padding: '16px 4px 0',
};

const footerTextStyle = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
  textAlign: 'center' as const,
};

const footerLinkStyle = {
  color: '#6b7280',
  textDecoration: 'underline',
};
