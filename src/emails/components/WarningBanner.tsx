import type { JSX } from 'react';
import { Section, Text } from 'react-email';
import type { ExceededWindow } from '../../types.js';

interface WarningBannerProps {
  effectiveFailureCount: number;
  exceededWindows: ExceededWindow[];
}

const WINDOW_LABELS: Record<ExceededWindow['window'], string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

/**
 * Yellow warning banner shown on strike 1 and 2 of 3.
 * Also rendered on disabled emails (alongside DisabledNotice) to show the
 * final exceeded window that triggered the disable action.
 */
export function WarningBanner({
  effectiveFailureCount,
  exceededWindows,
}: WarningBannerProps): JSX.Element {
  const windowDescriptions = exceededWindows
    .map((w) => `${w.count.toLocaleString()} in the last ${WINDOW_LABELS[w.window]} (limit: ${w.threshold.toLocaleString()})`)
    .join(', ');

  return (
    <Section style={sectionStyle}>
      <Text style={titleStyle}>{`⚠ Result Limit Exceeded — Strike ${effectiveFailureCount} of 3`}</Text>
      <Text style={bodyStyle}>
        This notification returned more results than recommended: {windowDescriptions}. If this
        continues, the notification will be automatically disabled after 3 strikes.
      </Text>
    </Section>
  );
}

const sectionStyle = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
};

const titleStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#92400e',
  margin: '0 0 8px',
};

const bodyStyle = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
  lineHeight: '1.5',
};
