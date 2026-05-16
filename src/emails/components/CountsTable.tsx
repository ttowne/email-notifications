import type { JSX } from 'react';
import { Column, Row, Section, Text } from 'react-email';
import type { Counts } from '../../types.js';

interface CountsTableProps {
  counts: Counts;
}

/**
 * Three equal-width stat boxes displayed side by side.
 * Each box shows the time window label (uppercase) above the result count.
 *
 * Column widths use the gap-column pattern (32% stat / 2% gap / 32% / 2% / 32%)
 * because email table cells don't support CSS gap or margin between them.
 */
export function CountsTable({ counts }: CountsTableProps): JSX.Element {
  return (
    <Section style={sectionStyle}>
      <Row>
        <Column style={colStyle}>
          <Text style={labelStyle}>Last 24 hours</Text>
          <Text style={valueStyle}>{counts.last24h.toLocaleString()}</Text>
        </Column>
        <Column style={gapStyle} />
        <Column style={colStyle}>
          <Text style={labelStyle}>Last 7 days</Text>
          <Text style={valueStyle}>{counts.last7d.toLocaleString()}</Text>
        </Column>
        <Column style={gapStyle} />
        <Column style={colStyle}>
          <Text style={labelStyle}>Last 30 days</Text>
          <Text style={valueStyle}>{counts.last30d.toLocaleString()}</Text>
        </Column>
      </Row>
    </Section>
  );
}

const sectionStyle = {
  padding: '16px 0',
};

const colStyle = {
  width: '32%',
  textAlign: 'center' as const,
  padding: '14px 8px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
};

const gapStyle = {
  width: '2%',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#374151',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const valueStyle = {
  fontSize: '26px',
  fontWeight: '700' as const,
  color: '#111827',
  margin: '0',
  lineHeight: '1',
};
