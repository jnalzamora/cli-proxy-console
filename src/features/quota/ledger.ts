import type { TFunction } from 'i18next';
import type {
  ClaudeQuotaState,
  CodexQuotaState,
  KimiQuotaState,
  XaiQuotaState,
  AntigravityQuotaState,
  DevinQuotaState,
  MetaQuotaState,
} from '@/types';
import type { QuotaCardState } from './providers';
import type { QuotaProviderType } from './providers/types';

export interface LedgerMetric {
  id: string;
  label: string;
  remaining: number | null;
  resetAtMs?: number | null;
  resetLabel?: string;
  periodHours?: number | null;
}
const remaining = (used: number | null): number | null =>
  used === null || !Number.isFinite(used) ? null : Math.max(0, Math.min(100, 100 - used));

/** Read normalized provider observations; never infer missing quota as zero. */
export function ledgerMetrics(
  type: QuotaProviderType,
  quota: QuotaCardState | undefined,
  t: TFunction
): LedgerMetric[] {
  if (quota?.status !== 'success') return [];
  if (type === 'claude' || type === 'codex') {
    return (quota as ClaudeQuotaState | CodexQuotaState).windows.map((window) => ({
      id: window.id,
      label: window.labelKey
        ? t(window.labelKey, ('labelParams' in window ? window.labelParams : {}) ?? {})
        : window.label,
      remaining: remaining(window.usedPercent),
      periodHours: window.periodHours,
      resetAtMs: window.resetAtMs,
      resetLabel: window.resetLabel,
    }));
  }
  if (type === 'kimi')
    return (quota as KimiQuotaState).rows.map((row) => ({
      id: row.id,
      label: row.labelKey ? t(row.labelKey, row.labelParams ?? {}) : (row.label ?? row.id),
      remaining: row.limit > 0 ? remaining((row.used / row.limit) * 100) : row.used > 0 ? 0 : null,
      resetAtMs: row.resetAtMs,
      resetLabel: row.resetHint,
    }));
  if (type === 'xai') {
    const billing = (quota as XaiQuotaState).billing;
    if (!billing || billing.mode === 'paid-health' || billing.periodType === 'unknown') return [];
    return [
      {
        id: billing.periodType,
        label: t(
          billing.periodType === 'weekly' ? 'xai_quota.weekly_limit' : 'quota_ledger.monthly'
        ),
        remaining: remaining(
          billing.periodType === 'weekly' ? billing.usagePercent : billing.usedPercent
        ),
        resetAtMs: billing.resetAtMs,
      },
    ];
  }
  if (type === 'antigravity')
    return (quota as AntigravityQuotaState).groups.flatMap((group) =>
      group.buckets.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        remaining: remaining((1 - bucket.remainingFraction) * 100),
        resetAtMs: bucket.resetAtMs,
      }))
    );
  if (type === 'devin')
    return (quota as DevinQuotaState).windows.map((window) => ({
      id: window.id,
      label: window.label ?? t(`devin_quota.${window.id}`),
      remaining: window.remainingPercent,
      periodHours: window.periodHours,
      resetAtMs: window.resetAtMs,
    }));
  return ((quota as MetaQuotaState).data?.windows ?? []).map((window) => ({
    id: window.id,
    label: t(window.id === 'weekly' ? 'quota_ledger.weekly' : 'quota_ledger.window'),
    remaining: remaining(window.usedPercent),
    resetAtMs: window.resetAt ? window.resetAt * 1000 : null,
  }));
}

export function summarizeMetrics(metrics: LedgerMetric[]) {
  const known = metrics.filter((metric) => metric.remaining !== null);
  return {
    remaining: known.length
      ? Math.round(known.reduce((sum, metric) => sum + (metric.remaining ?? 0), 0))
      : null,
    capacity: known.length * 100,
    resetAtMs: metrics.reduce<number | null>(
      (earliest, metric) =>
        metric.resetAtMs != null && (earliest === null || metric.resetAtMs < earliest)
          ? metric.resetAtMs
          : earliest,
      null
    ),
  };
}

export function maskIdentity(value: string): string {
  return value.replace(
    /([^@\s]+)@([^@\s.]+)(\.[^\s]+)/g,
    (_, local: string, host: string, suffix: string) =>
      `${local.slice(0, local.includes('-') ? local.lastIndexOf('-') + 2 : 1)}•••@${host.slice(0, 1)}•••${suffix}`
  );
}

export function summaryMetric(metrics: LedgerMetric[]): LedgerMetric | undefined {
  return (
    metrics.find((metric) => /fable/.test(metric.id)) ??
    metrics.find((metric) => metric.periodHours === 168 || /weekly|seven.day/.test(metric.id)) ??
    metrics[0]
  );
}
