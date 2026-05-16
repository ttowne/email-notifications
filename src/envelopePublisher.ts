import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import type { Producer } from 'kafkajs';
import { encodeCbor } from './cbor.js';
import type { EmailEnvelope } from './types.js';

const gzipAsync = promisify(gzip);

export interface EnvelopePublisher {
  publish(envelope: EmailEnvelope): Promise<void>;
}

/**
 * Creates a publisher that CBOR-encodes the envelope and then gzip-compresses
 * it before writing to Kafka. The `content-encoding: gzip` header signals to
 * the downstream Go email delivery service that it must decompress before
 * CBOR-decoding. Compression is worthwhile here because HTML payloads are
 * highly compressible and can exceed 50 KB for rich notification emails.
 */
export function createEnvelopePublisher(producer: Producer, topic: string): EnvelopePublisher {
  return {
    async publish(envelope: EmailEnvelope): Promise<void> {
      const cborBytes = encodeCbor(envelope);
      const compressed = await gzipAsync(cborBytes);

      await producer.send({
        topic,
        messages: [
          {
            value: compressed,
            headers: { 'content-encoding': 'gzip' },
          },
        ],
      });
    },
  };
}
