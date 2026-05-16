import type { DocumentDetails } from './types.js';

/**
 * Resolves a document ID to display-ready details.
 *
 * Placeholder implementation — replace the body with a Cassandra client call
 * once the document schema and connection config are finalized. The function
 * signature and return shape are the stable contract used by emailBuilder.
 */
export async function getDocumentDetails(id: string, baseUrl: string): Promise<DocumentDetails> {
  return {
    id,
    title: `Document ID: ${id}`,
    url: `${baseUrl}/${id}`,
  };
}
