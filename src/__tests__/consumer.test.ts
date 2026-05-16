import { describe, expect, it, vi } from 'vitest';
import { processResult } from '../consumer.js';
import type { ConsumerDeps } from '../consumer.js';
import type { NotificationResult } from '../types.js';

vi.mock('../emailBuilder.js', () => ({
  buildNotificationEmail: vi.fn().mockResolvedValue('<html><body>Mock Email</body></html>'),
}));

function makeResult(overrides: Partial<NotificationResult> = {}): NotificationResult {
  return {
    requestId: 'req-1',
    notificationConfigId: 42,
    tenantId: 'tenant-1',
    frequency: 'daily',
    title: 'Test Notification',
    linksEnabled: false,
    countsEnabled: false,
    resultLinkBaseUrl: 'https://app.example.com/documents',
    recipientEmail: 'user@example.com',
    ccEmails: [],
    failureCount: 0,
    totalHits: 5,
    hits: [],
    counts: { last24h: 5, last7d: 20, last30d: 80 },
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ConsumerDeps> = {}): ConsumerDeps {
  return {
    statePublisher: { publish: vi.fn(async () => undefined) },
    envelopePublisher: { publish: vi.fn(async () => undefined) },
    notificationSettingsUrl: 'https://app.example.com/settings/notifications',
    ...overrides,
  };
}

describe('processResult', () => {
  describe('envelope publishing', () => {
    it('publishes an envelope for every result', async () => {
      const deps = makeDeps();
      await processResult(makeResult(), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('sets the recipient as the to address', async () => {
      const deps = makeDeps();
      await processResult(makeResult({ recipientEmail: 'alice@example.com' }), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ to: ['alice@example.com'] }),
      );
    });

    it('includes cc when ccEmails is non-empty', async () => {
      const deps = makeDeps();
      await processResult(makeResult({ ccEmails: ['mgr@example.com'] }), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ cc: ['mgr@example.com'] }),
      );
    });

    it('omits cc when ccEmails is empty', async () => {
      const deps = makeDeps();
      await processResult(makeResult({ ccEmails: [] }), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.not.objectContaining({ cc: expect.anything() }),
      );
    });

    it('sets metadata.source to "notification"', async () => {
      const deps = makeDeps();
      await processResult(makeResult(), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ source: 'notification' }) }),
      );
    });

    it('sets metadata.sourceId to stringified notificationConfigId', async () => {
      const deps = makeDeps();
      await processResult(makeResult({ notificationConfigId: 99 }), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ sourceId: '99' }) }),
      );
    });
  });

  describe('state publishing', () => {
    it('publishes no state actions when validation passes and failureCount is 0', async () => {
      const deps = makeDeps();
      await processResult(makeResult(), deps);
      expect(deps.statePublisher.publish).not.toHaveBeenCalled();
    });

    it('publishes increment_failure when validation fails on first strike', async () => {
      const deps = makeDeps();
      await processResult(
        makeResult({ counts: { last24h: 200, last7d: 20, last30d: 80 }, failureCount: 0 }),
        deps,
      );
      expect(deps.statePublisher.publish).toHaveBeenCalledWith(
        expect.anything(),
        'increment_failure',
      );
    });

    it('publishes increment_failure and disable on third strike', async () => {
      const deps = makeDeps();
      await processResult(
        makeResult({ counts: { last24h: 200, last7d: 20, last30d: 80 }, failureCount: 2 }),
        deps,
      );
      expect(deps.statePublisher.publish).toHaveBeenCalledWith(
        expect.anything(),
        'increment_failure',
      );
      expect(deps.statePublisher.publish).toHaveBeenCalledWith(expect.anything(), 'disable');
    });

    it('publishes decrement_failure when validation passes and failureCount > 0', async () => {
      const deps = makeDeps();
      await processResult(makeResult({ failureCount: 1 }), deps);
      expect(deps.statePublisher.publish).toHaveBeenCalledWith(
        expect.anything(),
        'decrement_failure',
      );
    });
  });

  describe('subject line', () => {
    it('uses disabled subject when on third strike', async () => {
      const deps = makeDeps();
      await processResult(
        makeResult({
          counts: { last24h: 200, last7d: 20, last30d: 80 },
          failureCount: 2,
          title: 'My Alert',
        }),
        deps,
      );
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'My Alert — Notification Disabled' }),
      );
    });

    it('uses normal subject for passing validation', async () => {
      const deps = makeDeps();
      await processResult(makeResult({ title: 'My Alert', totalHits: 3 }), deps);
      expect(deps.envelopePublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'My Alert — 3 results found' }),
      );
    });
  });
});
