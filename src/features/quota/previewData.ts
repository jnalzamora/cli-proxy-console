import type { ClaudeQuotaState, CodexQuotaState, KimiQuotaState, XaiQuotaState } from '@/types';
import type { QuotaCardState } from './providers';
import type { QuotaFileEntry } from './logic';

/** Fictional observations isolated from authentication and the live quota store. */
export function createPreviewData() {
  const entries: QuotaFileEntry[] = [];
  const quotas: Record<string, QuotaCardState> = {};
  const reset = (hours: number) => Date.now() + hours * 3600000;
  [58, 100, 100, 51, 100].forEach((percent, index) => {
    const name = `claude-team${index + 1}@${['one.dev', 'proxy.gg', 'tools.gg', 'team.gg', 'studio.dev'][index]}.json`;
    entries.push({ type: 'claude', file: { name, type: 'claude', authIndex: index } });
    const state: ClaudeQuotaState = {
      status: 'success',
      planType: 'max',
      windows: [
        {
          id: 'fable',
          label: '7-day Fable 5',
          usedPercent: 100 - percent,
          resetLabel: '',
          resetAtMs: reset(index === 1 || index === 2 ? 96 : 24),
        },
        {
          id: 'five_hour',
          labelKey: 'claude_quota.five_hour',
          label: '5-hour limit',
          usedPercent: index === 3 ? 1 : 0,
          resetLabel: '',
          resetAtMs: index === 3 ? reset(3) : null,
        },
        {
          id: 'seven_day',
          labelKey: 'claude_quota.seven_day',
          label: '7-day limit',
          usedPercent: 100 - [79, 100, 100, 75, 100][index],
          resetLabel: '',
          resetAtMs: reset(index === 1 || index === 2 ? 96 : 24),
        },
      ],
    };
    quotas[name] = state;
  });
  [5, 8, 4].forEach((percent, index) => {
    const name = `codex-account${index + 1}@studio.dev.json`;
    entries.push({ type: 'codex', file: { name, type: 'codex', authIndex: 5 + index } });
    const state: CodexQuotaState = {
      status: 'success',
      planType: 'plus',
      windows: [
        {
          id: 'weekly',
          label: 'Weekly limit',
          usedPercent: 100 - percent,
          resetLabel: '',
          resetAtMs: reset(48 + index * 4),
        },
        {
          id: 'hourly',
          label: '5-hour limit',
          usedPercent: 50 + index * 10,
          resetLabel: '',
          resetAtMs: reset(2),
        },
      ],
    };
    quotas[name] = state;
  });
  const xaiName = 'xai-team@studio.dev.json';
  entries.push({ type: 'xai', file: { name: xaiName, type: 'xai', authIndex: 8 } });
  const xai: XaiQuotaState = {
    status: 'success',
    billing: {
      mode: 'billing',
      periodType: 'weekly',
      usedPercent: null,
      usagePercent: null,
      resetAtMs: reset(120),
      productUsage: [],
      monthlyLimitCents: null,
      usedCents: null,
      includedUsedCents: null,
      onDemandCapCents: null,
      onDemandUsedCents: null,
      onDemandUsedPercent: null,
    },
  };
  quotas[xaiName] = xai;
  const kimiName = 'kimi-team@studio.dev.json';
  entries.push({ type: 'kimi', file: { name: kimiName, type: 'kimi', authIndex: 9 } });
  const kimi: KimiQuotaState = {
    status: 'success',
    rows: [{ id: 'weekly', label: 'Weekly limit', used: 90, limit: 100, resetAtMs: reset(120) }],
  };
  quotas[kimiName] = kimi;
  return { entries, quotas };
}
