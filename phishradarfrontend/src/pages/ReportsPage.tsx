import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getDetectionHistory,
  getDetectionStats,
  exportDetectionsToCsv,
  type DateRangeFilter,
} from '../services/api';
import type { DetectionHistoryItem, DetectionStats } from '../types/api';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('7d');
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Safe domain extraction that never throws on malformed or protocol-less URLs
  const extractDomain = (urlOrDomain?: string): string => {
    if (!urlOrDomain) return 'Unknown';
    try {
      const u = urlOrDomain.startsWith('http://') || urlOrDomain.startsWith('https://')
        ? urlOrDomain
        : `https://${urlOrDomain}`;
      return new URL(u).hostname || urlOrDomain;
    } catch {
      return urlOrDomain;
    }
  };

  useEffect(() => {
    async function loadReportData() {
      setIsLoading(true);
      try {
        const [hist, st] = await Promise.all([
          getDetectionHistory(undefined, dateRange),
          getDetectionStats(undefined, dateRange),
        ]);
        setHistory(hist);
        setStats(st);
      } catch {
        // Handled via empty state
      } finally {
        setIsLoading(false);
      }
    }
    loadReportData();

    // Auto-refresh when tab gains focus or extension broadcasts new block
    const handleRefresh = () => {
      if (document.visibilityState === 'visible') {
        getDetectionHistory(undefined, dateRange).then(setHistory).catch(() => {});
        getDetectionStats(undefined, dateRange).then(setStats).catch(() => {});
      }
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);
    window.addEventListener('phishradar_scan_recorded', handleRefresh);

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PHISHRADAR_THREAT_BLOCKED') {
        handleRefresh();
      }
    };
    window.addEventListener('message', handleMessage);

    const interval = setInterval(handleRefresh, 6000);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('phishradar_scan_recorded', handleRefresh);
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [dateRange]);

  const total = stats?.totalScans ?? history.length;
  const safe = stats?.safe ?? history.filter((i) => i.fresult === 'SAFE').length;
  const review = stats?.review ?? history.filter((i) => i.fresult === 'REVIEW').length;
  const suspicious = stats?.suspicious ?? history.filter((i) => i.fresult === 'SUSPICIOUS').length;

  const safePct = total > 0 ? Math.round((safe / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((review / total) * 100) : 0;
  const suspiciousPct = total > 0 ? Math.round((suspicious / total) * 100) : 0;

  // Real Risk score histogram tiers
  const lowRiskCount = history.filter((i) => (i.riskscore ?? 0) < 30).length;
  const modRiskCount = history.filter((i) => (i.riskscore ?? 0) >= 30 && (i.riskscore ?? 0) < 70).length;
  const highRiskCount = history.filter((i) => (i.riskscore ?? 0) >= 70).length;

  const avgRiskScore =
    total > 0
      ? Math.round(history.reduce((acc, curr) => acc + (curr.riskscore ?? 0), 0) / total)
      : 0;

  // Real domain-level aggregations
  const domainMap = new Map<string, { domain: string; count: number; maxScore: number; latestVerdict: string; lastSeen: string }>();
  for (const item of history) {
    const d = item.domain || extractDomain(item.url);
    const existing = domainMap.get(d);
    if (!existing) {
      domainMap.set(d, {
        domain: d,
        count: 1,
        maxScore: item.riskscore ?? 0,
        latestVerdict: item.fresult,
        lastSeen: item.detectedat || '',
      });
    } else {
      existing.count += 1;
      if ((item.riskscore ?? 0) > existing.maxScore) {
        existing.maxScore = item.riskscore ?? 0;
        existing.latestVerdict = item.fresult;
      }
      if (item.detectedat && item.detectedat > existing.lastSeen) {
        existing.lastSeen = item.detectedat;
      }
    }
  }

  const domainSummaries = Array.from(domainMap.values()).sort((a, b) => b.maxScore - a.maxScore);

  // Filter threats blocked by extension or policy
  const blockedItems = history.filter(
    (i) => i.fresult === 'SUSPICIOUS' || i.actiontaken === 'WARNING' || i.actiontaken === 'BLOCKED'
  );

  const handleExportCsv = () => {
    if (history.length === 0) return;
    const csvContent = exportDetectionsToCsv(history);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phishradar_threat_report_${dateRange}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#15803D',
            marginBottom: '6px',
          }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#15803D', borderRadius: '1px' }} />
            <span>Reports & Analytics</span>
          </div>

          <h1 style={{
            fontSize: '2.05rem',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Threat Intelligence Reports
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.92rem', marginTop: '4px', marginBottom: 0 }}>
            Audit analytics derived strictly from backend detection telemetry and classification outputs.
          </p>
        </div>

        {/* Date Filters & Export Action (Export CSV Only — JSON removed) */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date Selector Pills */}
          <div style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            padding: '3px',
          }}>
            {(['24h', '7d', '30d', 'all'] as DateRangeFilter[]).map((r) => {
              const label = r === '24h' ? '24h' : r === '7d' ? '7d' : r === '30d' ? '30d' : 'All';
              const active = dateRange === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRange(r)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? '#111827' : 'transparent',
                    color: active ? '#FFFFFF' : '#4B5563',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Export CSV Only */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={history.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#111827',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: history.length === 0 ? 'not-allowed' : 'pointer',
              opacity: history.length === 0 ? 0.5 : 1,
              transition: 'background 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{
          padding: '40px 0',
          textAlign: 'center',
          color: '#6B7280',
        }}>
          Loading threat reports from backend telemetry...
        </div>
      ) : total === 0 ? (
        /* Empty State */
        <div style={{
          padding: '60px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#9CA3AF',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
            No Telemetry Data Available
          </h3>
          <p style={{ color: '#6B7280', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            Reports are computed exclusively from real URL evaluations recorded by the system. No scans have been recorded in this time window.
          </p>
          <Link
            to="/scanner"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '7px',
              backgroundColor: '#111827',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Launch URL Scanner &rarr;
          </Link>
        </div>
      ) : (
        /* Real Report Content — Open Frameless Editorial Layout (No Box Outlines) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {/* Frameless KPI Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
            paddingBottom: '28px',
            borderBottom: '1px solid #E5E7EB',
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Evaluations
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', marginTop: '4px', lineHeight: 1.1 }}>
                {total}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
                In selected period
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Safe & Legitimate
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#15803D', marginTop: '4px', lineHeight: 1.1 }}>
                {safe} <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>({safePct}%)</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#15803D', marginTop: '4px' }}>
                Verified clean domains
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Threats Blocked
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#DC2626', marginTop: '4px', lineHeight: 1.1 }}>
                {suspicious} <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>({suspiciousPct}%)</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#DC2626', marginTop: '4px' }}>
                High-confidence phishing
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Average Risk Score
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', marginTop: '4px', lineHeight: 1.1 }}>
                {avgRiskScore} <span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500 }}>/ 100</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
                Mean evaluation score
              </div>
            </div>
          </div>

          {/* 2-Column Analytics Distribution (Frameless & Open) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            paddingBottom: '32px',
            borderBottom: '1px solid #E5E7EB',
          }}>
            {/* Verdict Distribution */}
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>
                Verdict Breakdown
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 20px 0' }}>
                Distribution across safe, suspicious, and review verdicts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#15803D' }}>Safe ({safe})</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{safePct}%</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${safePct}%`, height: '100%', backgroundColor: '#16A34A', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#F59E0B' }}>Requires Review ({review})</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{reviewPct}%</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${reviewPct}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#DC2626' }}>Threats Blocked ({suspicious})</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{suspiciousPct}%</span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${suspiciousPct}%`, height: '100%', backgroundColor: '#DC2626', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Score Histogram */}
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 4px 0' }}>
                Risk Score Distribution
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 20px 0' }}>
                Categorization based on the backend ML + regex scoring engine.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Low Risk (0 - 29 Score)</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>
                      {lowRiskCount} ({total > 0 ? Math.round((lowRiskCount / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${total > 0 ? (lowRiskCount / total) * 100 : 0}%`, height: '100%', backgroundColor: '#16A34A', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Moderate Risk (30 - 69 Score)</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>
                      {modRiskCount} ({total > 0 ? Math.round((modRiskCount / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${total > 0 ? (modRiskCount / total) * 100 : 0}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '4px' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Critical Threat (70 - 100 Score)</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>
                      {highRiskCount} ({total > 0 ? Math.round((highRiskCount / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${total > 0 ? (highRiskCount / total) * 100 : 0}%`, height: '100%', backgroundColor: '#DC2626', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Domain-Level Threat Summary Table (Open on Page — No Box Outlines) */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Domain-Level Threat Summaries
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '3px 0 0 0' }}>
                Aggregate domain assessments ranked by peak risk score.
              </p>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      DOMAIN
                    </th>
                    <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      SCANS
                    </th>
                    <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      PEAK RISK SCORE
                    </th>
                    <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      LATEST VERDICT
                    </th>
                    <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      LAST EVALUATED
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {domainSummaries.map((ds) => {
                    const isBlocked = ds.latestVerdict === 'SUSPICIOUS';
                    const isReview = ds.latestVerdict === 'REVIEW';
                    const badgeBg = isBlocked ? '#FEE2E2' : isReview ? '#FEF3C7' : '#DCFCE7';
                    const badgeColor = isBlocked ? '#B91C1C' : isReview ? '#B45309' : '#15803D';

                    return (
                      <tr
                        key={ds.domain}
                        style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: '#111827', fontSize: '0.88rem' }}>
                          {ds.domain}
                        </td>
                        <td style={{ padding: '12px 10px', color: '#4B5563', fontSize: '0.86rem' }}>
                          {ds.count}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: ds.maxScore >= 70 ? '#DC2626' : ds.maxScore >= 30 ? '#D97706' : '#15803D', fontSize: '0.9rem' }}>
                          {ds.maxScore}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: badgeBg,
                            color: badgeColor,
                          }}>
                            {ds.latestVerdict}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#6B7280', fontSize: '0.84rem' }}>
                          {ds.lastSeen ? new Date(ds.lastSeen).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Extension Shield - Real-Time Intercepted Threats Section */}
          <div style={{ paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '5px',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    flexShrink: 0,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Extension Shield — Blocked Threats Log
                  </h2>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: 0 }}>
                  Live attacks, malicious domains, and credential-harvesting pages blocked by the browser extension.
                </p>
              </div>

              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: blockedItems.length > 0 ? '#DC2626' : '#15803D',
                backgroundColor: blockedItems.length > 0 ? '#FEE2E2' : '#DCFCE7',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                {blockedItems.length} {blockedItems.length === 1 ? 'Threat Intercepted' : 'Threats Intercepted'}
              </span>
            </div>

            {blockedItems.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px dashed #D1D5DB'
              }}>
                <div style={{ color: '#15803D', fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>
                  Shield Active — No Threats Blocked in Selected Period
                </div>
                <div style={{ color: '#6B7280', fontSize: '0.82rem' }}>
                  Any dangerous websites or credential theft links blocked by the browser extension will immediately show up in this log.
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        BLOCKED TARGET URL
                      </th>
                      <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        PROTECTION SOURCE
                      </th>
                      <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        RISK SCORE
                      </th>
                      <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        ACTION
                      </th>
                      <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        INTERCEPTED AT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedItems.map((item) => (
                      <tr
                        key={item.did}
                        style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '12px 10px', maxWidth: '380px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center' }}>
                              ⚠️
                            </span>
                            <span style={{
                              fontWeight: 700,
                              color: '#111827',
                              fontSize: '0.88rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={item.url || item.domain}>
                              {item.url || item.domain}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#374151'
                          }}>
                            {item.source || 'Extension Shield'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#DC2626', fontSize: '0.92rem' }}>
                          {item.riskscore ?? 100} / 100
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            backgroundColor: '#FEE2E2',
                            color: '#B91C1C'
                          }}>
                            Blocked
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#6B7280', fontSize: '0.84rem' }}>
                          {item.detectedat ? new Date(item.detectedat).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
