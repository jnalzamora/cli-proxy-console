import { describe, expect, test } from 'bun:test';
import type { TFunction } from 'i18next';
import {
  ledgerMetrics,
  maskIdentity,
  summarizeMetrics,
  summaryMetric,
} from '../src/features/quota/ledger';
import type { ClaudeQuotaState, KimiQuotaState } from '../src/types';
const t = ((key: string) => key) as TFunction;

describe('quota ledger observations', () => {
  test('sums known capacity without treating unknown accounts as depleted', () => {
    expect(
      summarizeMetrics([
        { id: 'weekly', label: 'Weekly', remaining: 58, resetAtMs: 2000 },
        { id: 'weekly', label: 'Weekly', remaining: null },
        { id: 'weekly', label: 'Weekly', remaining: 100, resetAtMs: 1000 },
      ])
    ).toEqual({ remaining: 158, capacity: 200, resetAtMs: 1000 });
    expect(summarizeMetrics([{ id: 'weekly', label: 'Weekly', remaining: null }])).toEqual({
      remaining: null,
      capacity: 0,
      resetAtMs: null,
    });
  });
  test('converts provider usage to remaining and clamps out of range values', () => {
    const quota: ClaudeQuotaState = {
      status: 'success',
      windows: [
        { id: 'weekly', label: 'Weekly', usedPercent: 42, resetLabel: '' },
        { id: 'unknown', label: 'Unknown', usedPercent: null, resetLabel: '' },
        { id: 'exhausted', label: 'Exhausted', usedPercent: 120, resetLabel: '' },
      ],
    };
    expect(ledgerMetrics('claude', quota, t).map((metric) => metric.remaining)).toEqual([
      58,
      null,
      0,
    ]);
    expect(ledgerMetrics('claude', { status: 'error', error: 'Failed' }, t)).toEqual([]);
  });
  test('zero-limit Kimi accounts stay unknown unless usage is reported', () => {
    const quota: KimiQuotaState = {
      status: 'success',
      rows: [
        { id: 'a', used: 0, limit: 0 },
        { id: 'b', used: 10, limit: 0 },
        { id: 'c', used: 90, limit: 100 },
      ],
    };
    expect(ledgerMetrics('kimi', quota, t).map((metric) => metric.remaining)).toEqual([
      null,
      0,
      10,
    ]);
  });
  test('masks email identities while preserving the provider prefix', () => {
    expect(maskIdentity('claude-team@example.dev.json')).toBe('claude-t•••@e•••.dev.json');
    expect(maskIdentity('team@example.dev')).toBe('t•••@e•••.dev');
    expect(maskIdentity('credential.json')).toBe('credential.json');
  });
});

test('provider summaries prioritize Fable and weekly windows over rolling limits', () => {
  const hourly = { id: 'primary', label: '5 hours', remaining: 100, periodHours: 5 };
  const weekly = { id: 'secondary', label: '7 days', remaining: 30, periodHours: 168 };
  const fable = { id: 'seven-day-fable', label: 'Fable', remaining: 58 };
  expect(summaryMetric([hourly, weekly])).toEqual(weekly);
  expect(summaryMetric([hourly, weekly, fable])).toEqual(fable);
});
