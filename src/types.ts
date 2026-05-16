// ---------------------------------------------------------------------------
// Wire types — snake_case, matches CBOR fields produced by the Go Orchestrator.
// Never use these types inside the service; convert via fromWire() in consumer.ts.
// ---------------------------------------------------------------------------

export interface NotificationResultWire {
  request_id: string;
  notification_config_id: number;
  tenant_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  title: string;
  links_enabled: boolean;
  counts_enabled: boolean;
  result_link_base_url: string;
  recipient_email: string;
  cc_emails: string[];
  failure_count: number;
  total_hits: number;
  hits: HitWire[];
  counts: CountsWire;
}

export interface HitWire {
  id: string;
  score: number;
}

export interface CountsWire {
  last_24h: number;
  last_7d: number;
  last_30d: number;
}

// ---------------------------------------------------------------------------
// Internal types — camelCase, used throughout the service after wire conversion.
// ---------------------------------------------------------------------------

export type Frequency = 'daily' | 'weekly' | 'monthly';
export type EmailType = 'normal' | 'warning' | 'disabled';

/** Action emitted to the Go Scheduler to update persistent failure state. */
export type StateAction = 'increment_failure' | 'decrement_failure' | 'disable';

export interface Counts {
  last24h: number;
  last7d: number;
  last30d: number;
}

export interface Hit {
  id: string;
  score: number;
}

export interface NotificationResult {
  requestId: string;
  notificationConfigId: number;
  tenantId: string;
  frequency: Frequency;
  title: string;
  linksEnabled: boolean;
  countsEnabled: boolean;
  resultLinkBaseUrl: string;
  recipientEmail: string;
  ccEmails: string[];
  /** Current consecutive failure count as recorded by the Go Scheduler. */
  failureCount: number;
  totalHits: number;
  hits: Hit[];
  counts: Counts;
}

/** Display-ready document details resolved from a hit ID. */
export interface DocumentDetails {
  id: string;
  title: string;
  url: string;
}

export interface ValidationResult {
  failed: boolean;
  exceededWindows: ExceededWindow[];
}

/** Describes a single time window where the result count exceeded its threshold. */
export interface ExceededWindow {
  window: '24h' | '7d' | '30d';
  count: number;
  threshold: number;
}

/**
 * Output of resolveFailureDecision(). Drives which email template variant to
 * render and which state actions to publish back to the Go Scheduler.
 */
export interface FailureDecision {
  emailType: EmailType;
  stateActions: StateAction[];
  /** Failure count after applying this decision (used for display in the email). */
  effectiveFailureCount: number;
}

// ---------------------------------------------------------------------------
// Output types — published to Kafka after processing.
// ---------------------------------------------------------------------------

export interface EmailEnvelopeMetadata {
  source: string;
  sourceId: string;
  tenantId: string;
  timestampMs: number;
}

/** Generic email envelope published to email.outbound (CBOR + gzip encoded). */
export interface EmailEnvelope {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  metadata: EmailEnvelopeMetadata;
}

/**
 * Failure state update published to notification.state.updates (snake_case
 * wire format consumed by the Go Scheduler to update its MariaDB records).
 */
export interface StateUpdateEvent {
  notification_config_id: number;
  action: StateAction;
  timestamp_ms: number;
}
