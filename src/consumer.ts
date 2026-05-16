import type { Consumer } from 'kafkajs';
import { decodeCbor } from './cbor.js';
import { getDocumentDetails } from './documentService.js';
import { buildNotificationEmail } from './emailBuilder.js';
import type { EnvelopePublisher } from './envelopePublisher.js';
import type { StatePublisher } from './statePublisher.js';
import {
  buildSubjectLine,
  resolveFailureDecision,
  validateCounts,
} from './validator.js';
import type {
  EmailEnvelope,
  NotificationResult,
  NotificationResultWire,
} from './types.js';

/** Runtime dependencies injected into the consumer at startup. */
export interface ConsumerDeps {
  statePublisher: StatePublisher;
  envelopePublisher: EnvelopePublisher;
  notificationSettingsUrl: string;
}

/** Converts a CBOR wire message (snake_case) to the internal camelCase type. */
function fromWire(wire: NotificationResultWire): NotificationResult {
  return {
    requestId: wire.request_id,
    notificationConfigId: wire.notification_config_id,
    tenantId: wire.tenant_id,
    frequency: wire.frequency,
    title: wire.title,
    linksEnabled: wire.links_enabled,
    countsEnabled: wire.counts_enabled,
    resultLinkBaseUrl: wire.result_link_base_url,
    recipientEmail: wire.recipient_email,
    ccEmails: wire.cc_emails,
    failureCount: wire.failure_count,
    totalHits: wire.total_hits,
    hits: wire.hits.map((h) => ({ id: h.id, score: h.score })),
    counts: {
      last24h: wire.counts.last_24h,
      last7d: wire.counts.last_7d,
      last30d: wire.counts.last_30d,
    },
  };
}

/**
 * Core processing pipeline for a single notification result.
 * Validates counts → resolves failure decision → resolves documents →
 * renders email HTML → publishes envelope and state updates in parallel.
 *
 * Exported separately from startConsumer so it can be unit-tested without
 * a live Kafka connection.
 */
export async function processResult(
  result: NotificationResult,
  deps: ConsumerDeps,
): Promise<void> {
  const { failed, exceededWindows } = validateCounts(result.counts);
  const decision = resolveFailureDecision(failed, result.failureCount);

  const documents = result.linksEnabled
    ? await Promise.all(
        result.hits.map((hit) => getDocumentDetails(hit.id, result.resultLinkBaseUrl)),
      )
    : [];

  const html = await buildNotificationEmail({
    title: result.title,
    totalHits: result.totalHits,
    frequency: result.frequency,
    viewResultsUrl: result.resultLinkBaseUrl,
    emailType: decision.emailType,
    effectiveFailureCount: decision.effectiveFailureCount,
    exceededWindows,
    notificationSettingsUrl: deps.notificationSettingsUrl,
    linksEnabled: result.linksEnabled,
    documents,
    countsEnabled: result.countsEnabled,
    counts: result.counts,
  });

  const envelope: EmailEnvelope = {
    to: [result.recipientEmail],
    ...(result.ccEmails.length > 0 && { cc: result.ccEmails }),
    subject: buildSubjectLine(result.title, result.totalHits, decision.emailType),
    html,
    metadata: {
      source: 'notification',
      sourceId: String(result.notificationConfigId),
      tenantId: result.tenantId,
      timestampMs: Date.now(),
    },
  };

  await Promise.all([
    deps.envelopePublisher.publish(envelope),
    ...decision.stateActions.map((action) =>
      deps.statePublisher.publish(result.notificationConfigId, action),
    ),
  ]);
}

/**
 * Subscribes to the input topic and starts the consumer loop.
 *
 * Uses eachBatch (not eachMessage) so we can call heartbeat() after each
 * message and check isRunning()/isStale() to exit cleanly on rebalance or
 * shutdown without waiting for the whole batch to finish.
 *
 * Bad messages are logged and skipped rather than retrying inline. A DLQ
 * can be wired in here if poison-pill handling becomes necessary.
 */
export async function startConsumer(
  consumer: Consumer,
  inputTopic: string,
  deps: ConsumerDeps,
): Promise<void> {
  await consumer.subscribe({ topic: inputTopic, fromBeginning: false });

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
      for (const message of batch.messages) {
        if (!isRunning() || isStale()) break;

        if (message.value === null) {
          resolveOffset(message.offset);
          continue;
        }

        try {
          const wire = decodeCbor<NotificationResultWire>(message.value);
          const result = fromWire(wire);
          await processResult(result, deps);
        } catch (err) {
          // Log and skip — do not block the partition on a single bad message.
          // A DLQ can be added here when retry/poison-pill handling is needed.
          console.error(
            `Failed to process notification result at offset ${message.offset}:`,
            err,
          );
        }

        resolveOffset(message.offset);
        await heartbeat();
      }
    },
  });
}
