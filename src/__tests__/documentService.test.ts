import { describe, expect, it } from 'vitest';
import { getDocumentDetails } from '../documentService.js';

describe('getDocumentDetails', () => {
  const BASE_URL = 'https://app.example.com/documents';

  it('returns a title with the document ID', async () => {
    const doc = await getDocumentDetails('abc-123', BASE_URL);
    expect(doc.title).toBe('Document ID: abc-123');
  });

  it('constructs the URL from baseUrl and id', async () => {
    const doc = await getDocumentDetails('abc-123', BASE_URL);
    expect(doc.url).toBe(`${BASE_URL}/abc-123`);
  });

  it('echoes the id on the returned object', async () => {
    const doc = await getDocumentDetails('xyz-789', BASE_URL);
    expect(doc.id).toBe('xyz-789');
  });

  it('handles an empty base URL gracefully', async () => {
    const doc = await getDocumentDetails('abc-123', '');
    expect(doc.url).toBe('/abc-123');
  });
});
