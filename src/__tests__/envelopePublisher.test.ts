import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { createEnvelopePublisher } from '../envelopePublisher.js';
import { decodeCbor } from '../cbor.js';
import type { EmailEnvelope } from '../types.js';

const gunzipAsync = promisify(gunzip);

function makeEnvelope(overrides: Partial<EmailEnvelope> = {}): EmailEnvelope {
  return {
    to: ['user@example.com'],
    subject: 'Test Subject',
    html: '<p>Hello</p>',
    metadata: {
      source: 'notification',
      sourceId: '42',
      tenantId: 'tenant-1',
      timestampMs: 1700000000000,
    },
    ...overrides,
  };
}

describe('createEnvelopePublisher', () => {
  it('sends one message to the configured topic', async () => {
    const sentMessages: { topic: string; messages: unknown[] }[] = [];
    const mockProducer = {
      send: vi.fn(async (payload: { topic: string; messages: unknown[] }) => {
        sentMessages.push(payload);
      }),
    };

    const publisher = createEnvelopePublisher(mockProducer as never, 'email.outbound');
    await publisher.publish(makeEnvelope());

    expect(mockProducer.send).toHaveBeenCalledTimes(1);
    expect(sentMessages[0]?.topic).toBe('email.outbound');
    expect(sentMessages[0]?.messages).toHaveLength(1);
  });

  it('sets content-encoding header to gzip', async () => {
    const mockProducer = { send: vi.fn(async () => undefined) };
    const publisher = createEnvelopePublisher(mockProducer as never, 'email.outbound');
    await publisher.publish(makeEnvelope());

    expect(mockProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            headers: expect.objectContaining({ 'content-encoding': 'gzip' }),
          }),
        ]),
      }),
    );
  });

  it('round-trips: compressed payload decompresses to the original envelope', async () => {
    let capturedValue: Buffer | null = null;
    const mockProducer = {
      send: vi.fn(async (payload: { messages: Array<{ value: Buffer }> }) => {
        capturedValue = payload.messages[0]?.value ?? null;
      }),
    };

    const envelope = makeEnvelope({ to: ['alice@example.com'], subject: 'Round-trip test' });
    const publisher = createEnvelopePublisher(mockProducer as never, 'email.outbound');
    await publisher.publish(envelope);

    expect(capturedValue).not.toBeNull();
    const decompressed = await gunzipAsync(capturedValue!);
    const decoded = decodeCbor<EmailEnvelope>(decompressed);

    expect(decoded.to).toEqual(['alice@example.com']);
    expect(decoded.subject).toBe('Round-trip test');
    expect(decoded.metadata.source).toBe('notification');
  });

  it('includes optional cc when present', async () => {
    let capturedValue: Buffer | null = null;
    const mockProducer = {
      send: vi.fn(async (payload: { messages: Array<{ value: Buffer }> }) => {
        capturedValue = payload.messages[0]?.value ?? null;
      }),
    };

    const envelope = makeEnvelope({ cc: ['mgr@example.com'] });
    const publisher = createEnvelopePublisher(mockProducer as never, 'email.outbound');
    await publisher.publish(envelope);

    const decompressed = await gunzipAsync(capturedValue!);
    const decoded = decodeCbor<EmailEnvelope>(decompressed);
    expect(decoded.cc).toEqual(['mgr@example.com']);
  });
});
