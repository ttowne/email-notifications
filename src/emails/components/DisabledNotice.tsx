import type { JSX } from 'react';
import { Link, Section, Text } from 'react-email';

interface DisabledNoticeProps {
  notificationSettingsUrl: string;
}

/**
 * Red notice shown on strike 3, rendered below WarningBanner.
 * The strike count resets after two consecutive successful runs — this is
 * mentioned in the body copy so users know the path back without manual action.
 */
export function DisabledNotice({ notificationSettingsUrl }: DisabledNoticeProps): JSX.Element {
  return (
    <Section style={sectionStyle}>
      <Text style={titleStyle}>🔕 Notification Automatically Disabled</Text>
      <Text style={bodyStyle}>
        This notification has been disabled because it exceeded the recommended result limit 3
        times. You can{' '}
        <Link href={notificationSettingsUrl} style={linkStyle}>
          re-enable it in your notification settings
        </Link>
        . The strike count will reset after two consecutive successful runs.
      </Text>
    </Section>
  );
}

const sectionStyle = {
  backgroundColor: '#fee2e2',
  border: '1px solid #ef4444',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
};

const titleStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#7f1d1d',
  margin: '0 0 8px',
};

const bodyStyle = {
  fontSize: '14px',
  color: '#7f1d1d',
  margin: '0',
  lineHeight: '1.5',
};

const linkStyle = {
  color: '#7f1d1d',
  fontWeight: '600',
  textDecoration: 'underline',
};
