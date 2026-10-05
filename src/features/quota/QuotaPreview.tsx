import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { INLINE_LOGO_JPEG } from '@/assets/logoInline';
import {
  IconSidebarDashboard,
  IconSidebarQuickStart,
  IconSidebarProviders,
  IconSidebarAuthFiles,
  IconSidebarOauth,
  IconSidebarQuota,
  IconSidebarLogs,
  IconSidebarConfig,
  IconSidebarPlugins,
  IconSidebarStore,
  IconSidebarSystem,
  IconChevronLeft,
  IconChevronDown,
  IconSidebarDashboard as IconMenu,
  IconX,
} from '@/components/ui/icons';
import { ProviderTabs } from '@/features/authFiles/components/ProviderTabs';
import { QuotaHeader } from './components/QuotaHeader';
import { QuotaLedger, QuotaSummary } from './components/QuotaLedger';
import { QUOTA_ADAPTERS } from './providers';
import { bindQuotaClasses } from './types';
import {
  buildTabCounts,
  filterEntriesBySearch,
  filterEntriesByTab,
  type QuotaFileEntry,
} from './logic';
import { getQuotaDisplayName } from '@/utils/quota/identity';
import { maskIdentity } from './ledger';
import { createPreviewData } from './previewData';
import bodyStyles from './components/QuotaBody.module.scss';
import cardStyles from './components/QuotaCard.module.scss';
import pageStyles from './QuotaPage.module.scss';
import styles from './QuotaPreview.module.scss';

const classes = bindQuotaClasses(bodyStyles, 'QuotaBody.module.scss');
const nav = [
  {
    group: 'nav_groups.operate',
    items: [
      ['nav.dashboard', IconSidebarDashboard],
      ['nav.quick_start', IconSidebarQuickStart],
    ],
  },
  {
    group: 'nav_groups.gateway',
    items: [
      ['nav.ai_providers', IconSidebarProviders],
      ['nav.auth_files', IconSidebarAuthFiles],
      ['nav.oauth', IconSidebarOauth],
    ],
  },
  {
    group: 'nav_groups.observe',
    items: [
      ['nav.quota_management', IconSidebarQuota],
      ['nav.logs', IconSidebarLogs],
    ],
  },
  {
    group: 'nav_groups.control',
    items: [
      ['nav.config_management', IconSidebarConfig],
      ['nav.plugins', IconSidebarPlugins],
      ['nav.plugin_store', IconSidebarStore],
      ['nav.system_info', IconSidebarSystem],
    ],
  },
] as const;

export function QuotaPreview() {
  const { t } = useTranslation();
  const [data, setData] = useState(createPreviewData);
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('ledger');
  const [showEmails, setShowEmails] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const entries = filterEntriesBySearch(filterEntriesByTab(data.entries, tab as 'all'), search);
  const quotaFor = (entry: QuotaFileEntry) => data.quotas[entry.file.name];
  const refresh = async () => {
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setData(createPreviewData());
    setBusy(false);
    setNotice(t('quota_ledger.preview_refreshed'));
  };
  return (
    <div
      data-theme="dark"
      className={`${styles.preview} app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}
    >
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={t('sidebar.expand')}
      >
        {mobileOpen ? <IconX /> : <IconMenu />}
      </button>
      <div className="main-body">
        {mobileOpen && (
          <button
            className={styles.backdrop}
            onClick={() => setMobileOpen(false)}
            aria-label={t('common.close')}
          />
        )}
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <img src={INLINE_LOGO_JPEG} alt="CPAMC" className="sidebar-brand-logo" />
              {!collapsed && (
                <span className="sidebar-brand-text">
                  <span className="sidebar-brand-title">CPAMC</span>
                  <span className="sidebar-brand-subtitle">{t('sidebar.subtitle')}</span>
                </span>
              )}
            </div>
          </div>
          <nav className="nav-section">
            {nav.map((group) => (
              <div className="nav-group" key={group.group}>
                {!collapsed && <div className="nav-group-label">{t(group.group)}</div>}
                {group.items.map(([label, Icon]) => (
                  <Link
                    key={label}
                    to={label === 'nav.quota_management' ? '/preview' : '/login'}
                    className={`nav-item ${label === 'nav.quota_management' ? 'active' : ''}`}
                    title={t(label)}
                  >
                    <span className="nav-icon">
                      <Icon size={19} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="nav-text">
                          <span className="nav-label">{t(label)}</span>
                        </span>
                        {label === 'nav.auth_files' && <span className="nav-badge">10</span>}
                      </>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          {!collapsed && (
            <div className={styles.previewBadge}>
              <span>{t('quota_ledger.sample_data')}</span>
              <Link to="/login">{t('quota_ledger.connect')}</Link>
            </div>
          )}
        </aside>
        <button
          className={styles.collapse}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
        >
          {collapsed ? (
            <IconChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
          ) : (
            <IconChevronLeft size={14} />
          )}
        </button>
        <div className="content">
          <main className="main-content">
            <div className={pageStyles.page}>
              <QuotaHeader
                totalCount={10}
                loadedCount={10}
                attentionCount={0}
                refreshing={busy}
                disableControls={false}
                onRefreshAll={() => void refresh()}
                showEmails={showEmails}
                onToggleEmails={() => setShowEmails(!showEmails)}
              />
              <section className={pageStyles.workbench}>
                <div className={styles.controls}>
                  <ProviderTabs
                    types={['all', 'claude', 'antigravity', 'codex', 'xai', 'kimi']}
                    counts={buildTabCounts(data.entries)}
                    active={tab}
                    resolvedTheme="dark"
                    onChange={setTab}
                  />
                  <select
                    className={pageStyles.viewSelect}
                    value={view}
                    onChange={(event) => setView(event.target.value)}
                    aria-label={t('quota_ledger.view')}
                  >
                    <option value="ledger">{t('quota_ledger.ledger')}</option>
                    <option value="cards">{t('quota_ledger.cards')}</option>
                  </select>
                </div>
                {entries.length > 0 && (
                  <QuotaSummary entries={entries} quotaFor={quotaFor} resolvedTheme="dark" />
                )}
                <div className={styles.searchRow}>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('quota_management.search_placeholder')}
                    aria-label={t('quota_management.search_label')}
                  />
                  <span role="status">{notice}</span>
                </div>
                {entries.length === 0 ? (
                  <div className={styles.empty}>
                    {t(
                      search
                        ? 'quota_management.search_empty_title'
                        : 'quota_management.empty_title'
                    )}
                    <button
                      onClick={() => {
                        setTab('all');
                        setSearch('');
                      }}
                    >
                      {t('auth_files.filter_all')}
                    </button>
                  </div>
                ) : view === 'ledger' ? (
                  <QuotaLedger
                    entries={entries}
                    quotaFor={quotaFor}
                    resolvedTheme="dark"
                    showEmails={showEmails}
                    canRefresh={!busy}
                    onRefresh={() => void refresh()}
                  />
                ) : (
                  <div className={pageStyles.grid}>
                    {entries.map((entry) => {
                      const Body = QUOTA_ADAPTERS[entry.type].Body;
                      return (
                        <article className={cardStyles.card} key={entry.file.name}>
                          <header className={cardStyles.head}>
                            <strong className={cardStyles.fileName}>
                              {showEmails
                                ? getQuotaDisplayName(entry.file)
                                : maskIdentity(getQuotaDisplayName(entry.file))}
                            </strong>
                          </header>
                          <div className={cardStyles.body}>
                            <Body quota={quotaFor(entry)} classes={classes} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
