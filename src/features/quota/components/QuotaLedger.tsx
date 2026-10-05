import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResolvedTheme } from '@/types';
import { IconRefreshCw, IconChevronDown } from '@/components/ui/icons';
import { getAuthFileIcon, getTypeLabel } from '@/features/authFiles/constants';
import { getQuotaDisplayName, getQuotaCacheKey } from '@/utils/quota/identity';
import { buildResetDisplay } from '@/utils/quota';
import { useNow } from '@/hooks/useNow';
import type { QuotaFileEntry } from '../logic';
import type { QuotaCardState } from '../providers';
import { QUOTA_TAB_ORDER } from '../constants';
import {
  ledgerMetrics,
  maskIdentity,
  summarizeMetrics,
  summaryMetric,
  type LedgerMetric,
} from '../ledger';
import styles from './QuotaLedger.module.scss';

function Meter({ percent }: { percent: number | null }) {
  return (
    <div className={styles.track}>
      <span
        className={
          percent === null
            ? ''
            : percent >= 70
              ? styles.green
              : percent >= 30
                ? styles.yellow
                : styles.red
        }
        style={{ width: `${Math.max(0, Math.min(100, percent ?? 0))}%` }}
      />
    </div>
  );
}
function Reset({ metric }: { metric?: LedgerMetric }) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const display = buildResetDisplay(
    metric?.resetLabel ?? null,
    metric?.resetAtMs,
    now,
    i18n.resolvedLanguage
  );
  return (
    <div className={styles.reset}>
      {display ? (
        <>
          <span>{display.relative}</span>
          {display.relative && ' · '}
          <span className={styles.absolute}>{display.absolute}</span>
        </>
      ) : (
        t('quota_ledger.no_reset')
      )}
    </div>
  );
}

type Props = {
  entries: QuotaFileEntry[];
  quotaFor: (entry: QuotaFileEntry) => QuotaCardState | undefined;
  resolvedTheme: ResolvedTheme;
};
export function QuotaSummary({ entries, quotaFor, resolvedTheme }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const groups = QUOTA_TAB_ORDER.filter((type) => entries.some((entry) => entry.type === type));
  return (
    <section className={styles.summary} aria-label={t('quota_ledger.summary')}>
      {groups.map((type) => {
        const accounts = entries.filter((entry) => entry.type === type);
        const allMetrics = accounts.map((entry) => ledgerMetrics(type, quotaFor(entry), t));
        const first = summaryMetric(allMetrics.flat());
        if (!first)
          return (
            <article className={styles.summaryCell} key={type}>
              <div className={styles.summaryHead}>
                <img src={getAuthFileIcon(type, resolvedTheme) ?? ''} alt="" />
                <strong>{getTypeLabel(t, type)}</strong>
                <span>{t('quota_management.meta_credentials', { count: accounts.length })}</span>
              </div>
              <div className={styles.windowLabel}>{t('quota_ledger.weekly')}</div>
              <div className={styles.total}>--</div>
              <Meter percent={null} />
              <p className={styles.reset}>{t('quota_ledger.not_loaded')}</p>
            </article>
          );
        const primary = allMetrics.map((metrics) =>
          metrics.find((metric) => metric.id === first.id)
        );
        const totals = summarizeMetrics(
          primary.filter((metric): metric is LedgerMetric => !!metric)
        );
        const secondary = allMetrics.map((metrics) =>
          metrics.find(
            (metric) =>
              metric.id !== first.id && /7.day|weekly|week/i.test(metric.label + metric.id)
          )
        );
        const secondTotals = summarizeMetrics(
          secondary.filter((metric): metric is LedgerMetric => !!metric)
        );
        return (
          <article className={styles.summaryCell} key={type}>
            <div className={styles.summaryHead}>
              <img src={getAuthFileIcon(type, resolvedTheme) ?? ''} alt="" />
              <strong>{getTypeLabel(t, type)}</strong>
              <span>{t('quota_management.meta_credentials', { count: accounts.length })}</span>
            </div>
            <div className={styles.windowLabel}>{first.label}</div>
            <div className={styles.total}>
              {totals.remaining === null ? '--' : `${totals.remaining}%`}
              <span>
                {totals.capacity > 0 &&
                  t('quota_ledger.of_capacity', { capacity: totals.capacity })}
              </span>
            </div>
            <div className={styles.segments}>
              {primary.map((metric, index) => (
                <Meter key={accounts[index].file.name} percent={metric?.remaining ?? null} />
              ))}
            </div>
            <Reset metric={{ ...first, resetLabel: undefined, resetAtMs: totals.resetAtMs }} />
            {secondary.some(Boolean) && (
              <div className={styles.secondary}>
                <span>
                  {t('quota_ledger.weekly')}{' '}
                  <strong>
                    {secondTotals.remaining === null ? '--' : `${secondTotals.remaining}%`}
                  </strong>
                </span>
                <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
                  {t(expanded ? 'quota_ledger.hide' : 'quota_ledger.show')}
                </button>
                {expanded && (
                  <div className={styles.secondaryMeters}>
                    {secondary.map((metric, index) => (
                      <Meter key={index} percent={metric?.remaining ?? null} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

export function QuotaLedger({
  entries,
  quotaFor,
  showEmails,
  canRefresh,
  onRefresh,
  renderDetails,
}: Props & {
  showEmails: boolean;
  canRefresh: boolean;
  onRefresh: (entry: QuotaFileEntry) => void;
  renderDetails?: (entry: QuotaFileEntry) => ReactNode;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className={styles.ledger}>
      {QUOTA_TAB_ORDER.map((type) => {
        const accounts = entries.filter((entry) => entry.type === type);
        if (!accounts.length) return null;
        return (
          <section className={styles.group} key={type}>
            <h2>
              {getTypeLabel(t, type)} <span>{accounts.length}</span>
            </h2>
            {accounts.map((entry) => {
              const key = getQuotaCacheKey(entry.file);
              const quota = quotaFor(entry);
              const metrics = ledgerMetrics(type, quota, t);
              const display = getQuotaDisplayName(entry.file);
              const plan =
                quota && 'planType' in quota && typeof quota.planType === 'string'
                  ? quota.planType
                  : '';
              const loading = quota?.status === 'loading';
              return (
                <div key={key} className={styles.account}>
                  <div className={styles.row} aria-busy={loading}>
                    <div className={styles.identity}>
                      <strong title={showEmails ? display : undefined}>
                        {showEmails ? display : maskIdentity(display)}
                      </strong>
                      <span>
                        {plan
                          ? plan.charAt(0).toUpperCase() + plan.slice(1)
                          : getTypeLabel(t, type)}
                      </span>
                    </div>
                    <div className={styles.metrics}>
                      {metrics.length ? (
                        metrics.map((metric) => (
                          <div key={metric.id} className={styles.metric}>
                            <div className={styles.metricHead}>
                              <span>{metric.label}</span>
                              <strong>
                                {metric.remaining === null
                                  ? '--'
                                  : `${Math.round(metric.remaining)}%`}
                              </strong>
                            </div>
                            <Meter percent={metric.remaining} />
                            <Reset metric={metric} />
                          </div>
                        ))
                      ) : (
                        <div
                          className={styles.status}
                          role={quota?.status === 'error' ? 'alert' : 'status'}
                        >
                          {loading
                            ? t('quota_ledger.loading')
                            : quota?.status === 'error'
                              ? quota.error || t('common.unknown_error')
                              : t('quota_ledger.not_loaded')}
                        </div>
                      )}
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        disabled={!canRefresh || loading || entry.file.disabled}
                        onClick={() => onRefresh(entry)}
                      >
                        <IconRefreshCw size={14} className={loading ? styles.spinning : ''} />
                        {t('auth_files.quota_refresh_single')}
                      </button>
                      {renderDetails && (
                        <button
                          className={styles.detailsButton}
                          onClick={() => setExpanded(expanded === key ? null : key)}
                          aria-expanded={expanded === key}
                          aria-label={t('quota_ledger.details_for', {
                            name: showEmails ? display : maskIdentity(display),
                          })}
                        >
                          <IconChevronDown size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded === key && renderDetails && (
                    <div className={styles.details}>{renderDetails(entry)}</div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
