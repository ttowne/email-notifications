import { describe, expect, it } from 'vitest';
import { buildSubjectLine, resolveFailureDecision, validateCounts } from '../validator.js';
import type { Counts } from '../types.js';

const PASSING_COUNTS: Counts = { last24h: 50, last7d: 200, last30d: 800 };
const EXCEEDING_ALL: Counts = { last24h: 101, last7d: 501, last30d: 2001 };

// ---------------------------------------------------------------------------
// validateCounts
// ---------------------------------------------------------------------------

describe('validateCounts', () => {
  it('passes when all windows are within threshold', () => {
    const result = validateCounts(PASSING_COUNTS);
    expect(result.failed).toBe(false);
    expect(result.exceededWindows).toHaveLength(0);
  });

  it('passes when counts exactly equal thresholds', () => {
    const result = validateCounts({ last24h: 100, last7d: 500, last30d: 2000 });
    expect(result.failed).toBe(false);
    expect(result.exceededWindows).toHaveLength(0);
  });

  it('fails when only 24h exceeds threshold', () => {
    const result = validateCounts({ ...PASSING_COUNTS, last24h: 101 });
    expect(result.failed).toBe(true);
    expect(result.exceededWindows).toHaveLength(1);
    expect(result.exceededWindows[0]?.window).toBe('24h');
    expect(result.exceededWindows[0]?.threshold).toBe(100);
  });

  it('fails when only 7d exceeds threshold', () => {
    const result = validateCounts({ ...PASSING_COUNTS, last7d: 501 });
    expect(result.failed).toBe(true);
    expect(result.exceededWindows).toHaveLength(1);
    expect(result.exceededWindows[0]?.window).toBe('7d');
  });

  it('fails when only 30d exceeds threshold', () => {
    const result = validateCounts({ ...PASSING_COUNTS, last30d: 2001 });
    expect(result.failed).toBe(true);
    expect(result.exceededWindows).toHaveLength(1);
    expect(result.exceededWindows[0]?.window).toBe('30d');
  });

  it('reports all exceeded windows when all fail', () => {
    const result = validateCounts(EXCEEDING_ALL);
    expect(result.failed).toBe(true);
    expect(result.exceededWindows).toHaveLength(3);
    const windows = result.exceededWindows.map((w) => w.window);
    expect(windows).toEqual(expect.arrayContaining(['24h', '7d', '30d']));
  });

  it('includes the actual count and threshold in the exceeded window', () => {
    const result = validateCounts({ last24h: 150, last7d: 200, last30d: 800 });
    const window = result.exceededWindows[0];
    expect(window?.count).toBe(150);
    expect(window?.threshold).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// resolveFailureDecision
// ---------------------------------------------------------------------------

describe('resolveFailureDecision', () => {
  describe('validation passes', () => {
    it('returns normal email with no state actions when failure_count is 0', () => {
      const decision = resolveFailureDecision(false, 0);
      expect(decision.emailType).toBe('normal');
      expect(decision.stateActions).toHaveLength(0);
      expect(decision.effectiveFailureCount).toBe(0);
    });

    it('decrements failure_count when it is above 0', () => {
      const decision = resolveFailureDecision(false, 2);
      expect(decision.emailType).toBe('normal');
      expect(decision.stateActions).toContain('decrement_failure');
      expect(decision.effectiveFailureCount).toBe(1);
    });

    it('decrements failure_count by exactly 1 regardless of current count', () => {
      const decision = resolveFailureDecision(false, 1);
      expect(decision.effectiveFailureCount).toBe(0);
      expect(decision.stateActions).toContain('decrement_failure');
    });
  });

  describe('validation fails', () => {
    it('returns warning on first failure (count 0 → 1)', () => {
      const decision = resolveFailureDecision(true, 0);
      expect(decision.emailType).toBe('warning');
      expect(decision.stateActions).toContain('increment_failure');
      expect(decision.stateActions).not.toContain('disable');
      expect(decision.effectiveFailureCount).toBe(1);
    });

    it('returns warning on second failure (count 1 → 2)', () => {
      const decision = resolveFailureDecision(true, 1);
      expect(decision.emailType).toBe('warning');
      expect(decision.stateActions).toContain('increment_failure');
      expect(decision.stateActions).not.toContain('disable');
      expect(decision.effectiveFailureCount).toBe(2);
    });

    it('returns disabled on third failure (count 2 → 3)', () => {
      const decision = resolveFailureDecision(true, 2);
      expect(decision.emailType).toBe('disabled');
      expect(decision.stateActions).toContain('increment_failure');
      expect(decision.stateActions).toContain('disable');
      expect(decision.effectiveFailureCount).toBe(3);
    });
  });
});

// ---------------------------------------------------------------------------
// buildSubjectLine
// ---------------------------------------------------------------------------

describe('buildSubjectLine', () => {
  it('uses singular "result" for 1 hit', () => {
    const subject = buildSubjectLine('My Alert', 1, 'normal');
    expect(subject).toBe('My Alert — 1 result found');
  });

  it('uses plural "results" for multiple hits', () => {
    const subject = buildSubjectLine('My Alert', 5, 'normal');
    expect(subject).toBe('My Alert — 5 results found');
  });

  it('uses plural "results" for zero hits', () => {
    const subject = buildSubjectLine('My Alert', 0, 'normal');
    expect(subject).toBe('My Alert — 0 results found');
  });

  it('uses the disabled subject when emailType is disabled', () => {
    const subject = buildSubjectLine('My Alert', 200, 'disabled');
    expect(subject).toBe('My Alert — Notification Disabled');
  });

  it('uses the normal subject when emailType is warning', () => {
    const subject = buildSubjectLine('My Alert', 200, 'warning');
    expect(subject).toBe('My Alert — 200 results found');
  });
});
