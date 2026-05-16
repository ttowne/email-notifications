import type { JSX } from 'react';
import { Heading, Link, Section, Text } from 'react-email';
import type { DocumentDetails } from '../../types.js';

interface DocumentLinksProps {
  documents: DocumentDetails[];
}

/** Numbered list of the most relevant document links, capped at 10 items. */
export function DocumentLinks({ documents }: DocumentLinksProps): JSX.Element {
  const items = documents.slice(0, 10);

  return (
    <Section style={sectionStyle}>
      <Heading style={headingStyle}>
        Most Relevant Results Found
      </Heading>
      {items.map((doc, index) => (
        <Text key={doc.id} style={itemStyle}>
          <Text style={indexStyle}>{index + 1}.</Text>{' '}
          <Link href={doc.url} style={linkStyle}>
            {doc.title}
          </Link>
        </Text>
      ))}
    </Section>
  );
}

const sectionStyle = { padding: '16px 0', borderTop: '1px solid #e5e7eb' };
const headingStyle = { fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 12px' };
const itemStyle = { fontSize: '14px', color: '#374151', margin: '0 0 8px', lineHeight: '1.5' };
const indexStyle = { color: '#9ca3af', display: 'inline' };
const linkStyle = { color: '#2563eb', textDecoration: 'underline' };
