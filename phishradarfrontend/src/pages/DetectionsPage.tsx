import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDetectionHistory,
  exportDetectionsToCsv,
  type DateRangeFilter,
} from '../services/api';
import type { DetectionHistoryItem } from '../types/api';

export function DetectionsPage() {
  const { user } = useAuth();
  const effectiveUserId = user?.userid || 1;

  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DetectionHistoryItem | null>(null);

  const density = (localStorage.getItem('phishradar_density') as 'comfortable' | 'compact') || 'comfortable';
  const rowPadding = density === 'compact' ? '8px 10px' : '14px 10px';

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getDetectionHistory(effectiveUserId, dateRange);
        if (isMounted) setHistory(data);
      } catch {
        if (isMounted) setError('Failed to retrieve detection history from backend records.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();

    const handleRefresh = () => {
      if (document.visibilityState === 'visible') {
        getDetectionHistory(effectiveUserId, dateRange)
          .then((data) => {
            if (isMounted) setHistory(data);
          })
          .catch(() => {});
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
      isMounted = false;
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
      window.removeEventListener('phishradar_scan_recorded', handleRefresh);
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [effectiveUserId, dateRange]);

  // Client-side search & filtering over real records
  const filteredItems = history.filter((item) => {
    const matchesSearch =
      (item.url && item.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.domain && item.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.did.toString().includes(searchTerm);

    const matchesVerdict =
      verdictFilter === 'ALL' || item.fresult === verdictFilter;

    return matchesSearch && matchesVerdict;
  });

  const handleExportCsv = () => {
    if (filteredItems.length === 0) return;
    const csvContent = exportDetectionsToCsv(filteredItems);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phishradar_detections_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '—';
    }
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
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
            <span>Detection Logs</span>
          </div>

          <h1 style={{
            fontSize: '2.05rem',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Detection Audit Log
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.92rem', marginTop: '4px', marginBottom: 0 }}>
            Auditable log of evaluated domains, classification outputs, and policy actions.
          </p>
        </div>

        {/* Export CSV Only (JSON Removed) */}
        <div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
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
              cursor: filteredItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: filteredItems.length === 0 ? 0.5 : 1,
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

      {/* Open Filter and Search Bar (No Box Outlines) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Clean Input Only */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flex: 1,
          minWidth: '240px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          padding: '8px 14px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search domain, URL, or scan ID..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.9rem',
              color: '#111827',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Verdict Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F3F4F6', padding: '3px', borderRadius: '7px' }}>
          {['ALL', 'SAFE', 'REVIEW', 'SUSPICIOUS'].map((v) => {
            const active = verdictFilter === v;
            const label = v === 'ALL' ? 'All' : v === 'SAFE' ? 'Safe' : v === 'REVIEW' ? 'Review' : 'Threats';
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVerdictFilter(v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: active ? 700 : 500,
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#111827' : '#6B7280',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['24h', '7d', '30d', 'all'] as DateRangeFilter[]).map((r) => {
            const active = dateRange === r;
            const label = r === '24h' ? '24h' : r === '7d' ? '7d' : r === '30d' ? '30d' : 'All time';
            return (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: active ? 700 : 500,
                  backgroundColor: active ? '#111827' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#4B5563',
                  border: active ? 'none' : '1px solid #D1D5DB',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#B91C1C',
          marginBottom: '20px',
          fontSize: '0.88rem',
        }}>
          {error}
        </div>
      )}

      {/* Main Table — Open on Page (No Outer Card Box) */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TARGET DOMAIN / URL
              </th>
              <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                VERDICT
              </th>
              <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                RISK SCORE
              </th>
              <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ML CLASSIFICATION
              </th>
              <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ACTION
              </th>
              <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TIMESTAMP
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td colSpan={6} style={{ padding: '16px 10px' }}>
                    <div style={{ height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
                  </td>
                </tr>
              ))
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                    No detection records match your criteria
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#6B7280' }}>
                    Try clearing search queries or switching the verdict filter.
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isBlocked = item.fresult === 'SUSPICIOUS';
                const isReview = item.fresult === 'REVIEW';
                const verdictBg = isBlocked ? '#FEE2E2' : isReview ? '#FEF3C7' : '#DCFCE7';
                const verdictColor = isBlocked ? '#B91C1C' : isReview ? '#B45309' : '#15803D';
                const score = item.riskscore ?? 0;
                const scoreColor = score >= 70 ? '#DC2626' : score >= 30 ? '#D97706' : '#15803D';

                return (
                  <tr
                    key={item.did}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: rowPadding, maxWidth: '320px' }}>
                      <div style={{
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#111827',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={item.url || item.domain}>
                        {item.url || item.domain || '—'}
                      </div>
                    </td>
                    <td style={{ padding: rowPadding }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '5px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        backgroundColor: verdictBg,
                        color: verdictColor,
                      }}>
                        {item.fresult}
                      </span>
                    </td>
                    <td style={{ padding: rowPadding }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: scoreColor }}>
                        {score}
                      </span>
                    </td>
                    <td style={{
                      padding: rowPadding,
                      fontSize: '0.85rem',
                      color: item.mlresult?.toUpperCase() === 'PHISHING' || item.fresult === 'SUSPICIOUS' ? '#DC2626' : '#4B5563',
                      fontWeight: 500,
                    }}>
                      {item.mlresult?.toUpperCase() === 'PHISHING' || item.fresult === 'SUSPICIOUS' ? 'Phishing' : 'Legit'}
                    </td>
                    <td style={{ padding: rowPadding, fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                      {item.actiontaken}
                    </td>
                    <td style={{ padding: rowPadding, fontSize: '0.84rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(item.detectedat)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }} onClick={() => setSelectedItem(null)}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '620px',
            width: '100%',
            padding: '24px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, color: '#6B7280' }}>
                  Detection Record #{selectedItem.did}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: '3px 0 0 0', wordBreak: 'break-all' }}>
                  {selectedItem.url || selectedItem.domain}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#9CA3AF', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '10px', backgroundColor: '#FAFAF9', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>Verdict</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>{selectedItem.fresult}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#FAFAF9', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>Risk Score</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: selectedItem.riskscore >= 70 ? '#DC2626' : '#15803D', marginTop: '2px' }}>
                  {selectedItem.riskscore} / 100
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#FAFAF9', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>Action Taken</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>{selectedItem.actiontaken}</div>
              </div>
            </div>

            {selectedItem.findings && selectedItem.findings.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Rule & ML Findings
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedItem.findings.map((f, i) => (
                    <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.76rem', fontWeight: 600 }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedItem.suggestions && selectedItem.suggestions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Security Guidance
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedItem.suggestions.map((s, i) => (
                    <div key={i} style={{ fontSize: '0.84rem', color: '#334155', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#111827',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
