import type { JSX } from 'react';
import { Button, Section, Text } from 'react-email';
import type { Frequency } from '../../types.js';

interface ResultsSummaryProps {
  totalHits: number;
  frequency: Frequency;
  viewResultsUrl: string;
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'last 24 hours',
  weekly: 'last 7 days',
  monthly: 'last 30 days',
};

/** Centered summary section showing hit count, frequency period, and the primary CTA button. */
export function ResultsSummary({
  totalHits,
  frequency,
  viewResultsUrl,
}: ResultsSummaryProps): JSX.Element {
  const noun = totalHits === 1 ? 'result' : 'results';
  const period = FREQUENCY_LABELS[frequency];

  return (
    <Section style={sectionStyle}>
      <Text style={summaryStyle}>
        <strong>{totalHits.toLocaleString()}</strong> {noun} found in the {period}.
      </Text>
      <Button href={viewResultsUrl} style={buttonStyle}>
        View Results
      </Button>
    </Section>
  );
}

const sectionStyle = { padding: '24px 0 16px', textAlign: 'center' as const };

const summaryStyle = {
  fontSize: '16px',
  color: '#374151',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const buttonStyle = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
};
