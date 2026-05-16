import type { Counts, ExceededWindow, FailureDecision, StateAction, ValidationResult } from './types.js';

/**
 * Maximum result counts per time window before a notification is considered
 * unhealthy. These are intentionally conservative — a search returning tens of
 * thousands of results per day is unlikely to be a useful saved search alert.
 */
const THRESHOLDS = {
  last24h: 100,
  last7d: 500,
  last30d: 2000,
} as const;

/** Checks result counts against thresholds and returns which windows, if any, were exceeded. */
export function validateCounts(counts: Counts): ValidationResult {
  const exceededWindows: ExceededWindow[] = [];

  if (counts.last24h > THRESHOLDS.last24h) {
    exceededWindows.push({ window: '24h', count: counts.last24h, threshold: THRESHOLDS.last24h });
  }
  if (counts.last7d > THRESHOLDS.last7d) {
    exceededWindows.push({ window: '7d', count: counts.last7d, threshold: THRESHOLDS.last7d });
  }
  if (counts.last30d > THRESHOLDS.last30d) {
    exceededWindows.push({ window: '30d', count: counts.last30d, threshold: THRESHOLDS.last30d });
  }

  return { failed: exceededWindows.length > 0, exceededWindows };
}

/**
 * Determines the email variant and state actions for this notification run.
 *
 * 3-strike model:
 * - Failure:  increment strike count; send warning at strikes 1–2, disable at strike 3.
 * - Success:  decrement strike count by 1 (self-healing — a healthy run cancels one prior failure).
 * - Clean:    no state change needed, send a normal email.
 *
 * The strike count is persisted by the Go Scheduler; this function only decides
 * what to do with the *current* count passed in from the wire message.
 */
export function resolveFailureDecision(
  validationFailed: boolean,
  currentFailureCount: number,
): FailureDecision {
  if (validationFailed) {
    const effectiveFailureCount = currentFailureCount + 1;

    if (effectiveFailureCount >= 3) {
      return {
        emailType: 'disabled',
        stateActions: ['increment_failure', 'disable'],
        effectiveFailureCount,
      };
    }

    return {
      emailType: 'warning',
      stateActions: ['increment_failure'],
      effectiveFailureCount,
    };
  }

  if (currentFailureCount > 0) {
    const stateActions: StateAction[] = ['decrement_failure'];
    return {
      emailType: 'normal',
      stateActions,
      effectiveFailureCount: currentFailureCount - 1,
    };
  }

  return {
    emailType: 'normal',
    stateActions: [],
    effectiveFailureCount: 0,
  };
}

/** Builds the email subject line. Disabled emails suppress the hit count to avoid confusion. */
export function buildSubjectLine(
  title: string,
  totalHits: number,
  emailType: 'normal' | 'warning' | 'disabled',
): string {
  if (emailType === 'disabled') {
    return `${title} — Notification Disabled`;
  }
  const noun = totalHits === 1 ? 'result' : 'results';
  return `${title} — ${totalHits.toLocaleString()} ${noun} found`;
}
