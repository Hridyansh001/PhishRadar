import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDetectionStats, getDetectionHistory, scanUrl, ApiError } from '../services/api';
import type { DetectionStats, DetectionHistoryItem, DetectionResponse } from '../types/api';
import { StatCard } from '../components/StatCard';
import { RiskMeter } from '../components/RiskMeter';

export function DashboardPage() {
  const { user } = useAuth();
  const effectiveUserId = user?.userid || 1;

  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick scanner state directly on dashboard
  const [quickUrl, setQuickUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DetectionResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Table filtering & search
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<DetectionHistoryItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, historyData] = await Promise.all([
        getDetectionStats(effectiveUserId),
        getDetectionHistory(effectiveUserId),
      ]);
      setStats(statsData);
      setHistory(historyData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not connect to PhishRadar backend on localhost:8080.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [effectiveUserId]);

  const handleQuickScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      let formattedUrl = quickUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const result = await scanUrl(formattedUrl, effectiveUserId);
      setScanResult(result);
      // Refresh local telemetry
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setScanError(err.message);
      } else {
        setScanError('Scan failed. Please verify the URL or backend connection.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // KPI Calculations
  const total = stats?.totalScans ?? history.length ?? 0;
  const safe = stats?.safe ?? history.filter((h) => h.fresult === 'SAFE').length ?? 0;
  const review = stats?.review ?? history.filter((h) => h.fresult === 'REVIEW').length ?? 0;
  const suspicious = stats?.suspicious ?? history.filter((h) => h.fresult === 'SUSPICIOUS').length ?? 0;

  const safePct = total > 0 ? Math.round((safe / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((review / total) * 100) : 0;
  const suspiciousPct = total > 0 ? Math.round((suspicious / total) * 100) : 0;

  // Filtered History
  const filteredHistory = history.filter((item) => {
    const matchesFilter = filterVerdict === 'ALL' || item.fresult === filterVerdict;
    const matchesSearch =
      searchTerm.trim() === '' ||
      (item.url && item.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.domain && item.domain.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px 64px' }}>
      {/* Top Header / Welcome Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: '1.95rem',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              Security Dashboard
            </h1>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803d' }} />
              Shield Active
            </span>
          </div>

          <p style={{ color: '#4b5563', fontSize: '0.95rem', marginTop: '6px', maxWidth: '650px' }}>
            {user?.uname ? `Welcome, ${user.uname}. ` : ''}
            Monitor evaluated domains, inspect unknown links, and review real-time threat verdicts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadData()}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.88rem' }}
            title="Refresh scan telemetry"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <Link to="/" className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.88rem' }}>
            Full URL Scanner &rarr;
          </Link>
        </div>
      </div>

      {/* Backend Alert (if any) */}
      {error && (
        <div style={{
          padding: '14px 18px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>Backend Notice</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, padding: '4px 8px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Inspection Section - Clean & Frameless */}
      <div style={{
        padding: '0 0 28px 0',
        marginBottom: '32px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
              Quick Link Inspection
            </span>
            <span style={{ fontSize: '0.82rem', color: '#6b7280', marginLeft: '10px' }}>
              Instant heuristic + ML analysis right from your dashboard
            </span>
          </div>

          {/* Quick test pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#6b7280' }}>
            <span>Try sample:</span>
            <button
              onClick={() => setQuickUrl('https://github.com')}
              style={{
                color: '#15803d',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              github.com (Safe)
            </button>
            <button
              onClick={() => setQuickUrl('http://paypal-security-update-login.com')}
              style={{
                color: '#b91c1c',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              paypal-fake.com (Phish)
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickScan} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              display: 'flex',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste or type any URL to inspect (e.g., https://example-bank.com)..."
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #d1d5db',
                fontSize: '0.92rem',
                color: '#111827',
                backgroundColor: '#ffffff',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isScanning || !quickUrl.trim()}
            className="btn-primary"
            style={{
              padding: '11px 24px',
              fontSize: '0.92rem',
              whiteSpace: 'nowrap',
            }}
          >
            {isScanning ? 'Analyzing...' : 'Scan URL'}
          </button>
        </form>

        {/* Quick Scan Error */}
        {scanError && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#b91c1c',
          }}>
            {scanError}
          </div>
        )}

        {/* Quick Scan Inline Result */}
        {scanResult && (
          <div style={{
            marginTop: '18px',
            padding: '16px 20px',
            borderRadius: '8px',
            backgroundColor: scanResult.finalresult === 'SUSPICIOUS' ? '#fef2f2' :
              scanResult.finalresult === 'REVIEW' ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${
              scanResult.finalresult === 'SUSPICIOUS' ? '#fecaca' :
              scanResult.finalresult === 'REVIEW' ? '#fde68a' : '#bbf7d0'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span className={`badge ${
                scanResult.finalresult === 'SUSPICIOUS' ? 'badge-danger' :
                scanResult.finalresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
              }`} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                {scanResult.finalresult}
              </span>

              <div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>
                  {scanResult.domain || scanResult.url}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#4b5563', marginTop: '2px' }}>
                  Risk Score: <strong>{scanResult.risckscore}/100</strong> ({scanResult.risklevel} Risk) &bull; ML: {scanResult.mlresult} &bull; Action: {scanResult.actiontaken}
                </div>
                {scanResult.officialAlternative && (
                  <div style={{ marginTop: '4px', fontSize: '0.82rem' }}>
                    <a
                      href={scanResult.officialAlternative}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Official Website: {scanResult.officialAlternative} ↗
                    </a>
                  </div>
                )}
                {scanResult.suggestions && scanResult.suggestions.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#374151' }}>
                    {scanResult.suggestions[0]}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link
                to={`/?url=${encodeURIComponent(scanResult.url)}`}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#111827',
                  textDecoration: 'underline',
                  padding: '6px 10px',
                }}
              >
                Deep Report &rarr;
              </Link>
              <button
                onClick={() => setScanResult(null)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.82rem',
                  color: '#6b7280',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Focused KPI Cards - Click to filter recent scans */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px',
      }}>
        <StatCard
          title="Total Scans Logged"
          value={isLoading ? '...' : total}
          subtitle="Click to view all activity"
          color="neutral"
          badge={total > 0 ? `${total} logs` : undefined}
          isActive={filterVerdict === 'ALL'}
          onClick={() => setFilterVerdict('ALL')}
          icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          )}
        />

        <StatCard
          title="Safe & Clean Domains"
          value={isLoading ? '...' : safe}
          subtitle={`${safePct}% of analyzed traffic`}
          color="green"
          badge={total > 0 ? `${safePct}%` : undefined}
          isActive={filterVerdict === 'SAFE'}
          onClick={() => setFilterVerdict('SAFE')}
          icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          )}
        />

        <StatCard
          title="Requires Review"
          value={isLoading ? '...' : review}
          subtitle={`${reviewPct}% ambiguous or flagged`}
          color="amber"
          badge={total > 0 ? `${reviewPct}%` : undefined}
          isActive={filterVerdict === 'REVIEW'}
          onClick={() => setFilterVerdict('REVIEW')}
          icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        />

        <StatCard
          title="Threats & Phishing Blocked"
          value={isLoading ? '...' : suspicious}
          subtitle={`${suspiciousPct}% confirmed malicious`}
          color="red"
          badge={total > 0 ? `${suspiciousPct}%` : undefined}
          isActive={filterVerdict === 'SUSPICIOUS'}
          onClick={() => setFilterVerdict('SUSPICIOUS')}
          icon={(
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        />
      </div>

      {/* Two Column Layout: Threat Distribution + Security Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '28px',
      }}>
        {/* Left: Threat Severity Breakdown */}
        <div style={{ padding: '0 0 24px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              Verdict Ratio & Threat Breakdown
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>
              {total} Scans Evaluated
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '20px' }}>
            Classification distribution between clean web traffic and flagged phishing threats.
          </p>

          {/* Clean Segmented Progress Bar */}
          <div style={{
            height: '14px',
            borderRadius: '9999px',
            overflow: 'hidden',
            display: 'flex',
            backgroundColor: '#f3f4f6',
            marginBottom: '20px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ width: `${safePct}%`, backgroundColor: '#15803d', transition: 'width 0.4s ease' }} title={`Safe: ${safePct}%`} />
            <div style={{ width: `${reviewPct}%`, backgroundColor: '#b45309', transition: 'width 0.4s ease' }} title={`Review: ${reviewPct}%`} />
            <div style={{ width: `${suspiciousPct}%`, backgroundColor: '#b91c1c', transition: 'width 0.4s ease' }} title={`Suspicious: ${suspiciousPct}%`} />
          </div>

          {/* Breakdown Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#15803d' }} />
                <span style={{ color: '#111827', fontWeight: 500 }}>Safe & Clean (&lt; 20 Score)</span>
              </div>
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {safe} ({safePct}%)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#b45309' }} />
                <span style={{ color: '#111827', fontWeight: 500 }}>Requires Review (20 – 60 Score)</span>
              </div>
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {review} ({reviewPct}%)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#b91c1c' }} />
                <span style={{ color: '#111827', fontWeight: 500 }}>Threats & Blocked (&gt; 60 Score)</span>
              </div>
              <span style={{ fontWeight: 600, color: '#374151' }}>
                {suspicious} ({suspiciousPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Security & Defense Overview */}
        <div style={{ padding: '0 0 24px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              Protection Summary & Active Defense
            </h2>
            <span className="badge badge-safe">PROTECTED</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '20px' }}>
            Autonomous protection mechanisms defending your web browsing experience.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                  Chrome MV3 Extension Relay
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  Intercepts high-risk tabs before sensitive credentials can be exposed.
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                ONLINE
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                  Weka Random Forest Classifier
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  100-tree supervised decision forest trained on verified phishing corpora.
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                ACTIVE
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                  Heuristic & Lexical Rule Engine
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  Inspects entropy, homoglyphs, IP hostnames, and subdomain nesting.
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Detections Feed — Frameless */}
      <div style={{ padding: '16px 0 0 0' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
                Recent Detection Activity
              </h2>
              {filterVerdict !== 'ALL' && (
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  Filter: {filterVerdict}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
              Verified logs of inspected domains from your browser and scanner
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <span style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                display: 'flex',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search domain or URL..."
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 30px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.85rem',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Verdict Filter Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'SAFE', 'REVIEW', 'SUSPICIOUS'].map((verdict) => (
                <button
                  key={verdict}
                  onClick={() => setFilterVerdict(verdict)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: filterVerdict === verdict ? '#000000' : '#ffffff',
                    color: filterVerdict === verdict ? '#ffffff' : '#374151',
                    border: filterVerdict === verdict ? '1px solid #000000' : '1px solid #d1d5db',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {verdict}
                </button>
              ))}
            </div>

            <Link
              to="/history"
              style={{
                fontSize: '0.85rem',
                color: '#111827',
                fontWeight: 600,
                padding: '6px 10px',
                textDecoration: 'underline',
              }}
            >
              Full Log &rarr;
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            <div>Loading security telemetry...</div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '44px 20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px dashed #d1d5db',
          }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
              {history.length === 0 ? 'No scans recorded yet' : 'No records match your filter'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
              {history.length === 0
                ? 'Use the Quick Link Inspection tool above or browse with the PhishRadar extension.'
                : 'Try clearing your search query or switching to the ALL filter.'}
            </div>

            {history.length > 0 && (
              <button
                onClick={() => { setFilterVerdict('ALL'); setSearchTerm(''); }}
                className="btn-secondary"
                style={{ marginTop: '16px', fontSize: '0.82rem', padding: '6px 14px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  color: '#6b7280',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <th style={{ padding: '12px 14px' }}>Domain / Target URL</th>
                  <th style={{ padding: '12px 14px' }}>Verdict</th>
                  <th style={{ padding: '12px 14px' }}>Risk Score</th>
                  <th style={{ padding: '12px 14px' }}>ML Classifier</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.slice(0, 10).map((item) => (
                  <tr
                    key={item.did}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {item.domain || 'Domain record'}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.url || `Website ID #${item.wid}`}
                      </div>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <span className={`badge ${
                        item.fresult === 'SUSPICIOUS' ? 'badge-danger' :
                        item.fresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
                      }`}>
                        {item.fresult}
                      </span>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: item.riskscore > 60 ? '#b91c1c' :
                            item.riskscore >= 20 ? '#b45309' : '#15803d',
                        }}>
                          {item.riskscore}
                        </span>
                        <div style={{
                          width: '40px',
                          height: '6px',
                          borderRadius: '3px',
                          backgroundColor: '#e5e7eb',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${Math.min(100, item.riskscore)}%`,
                            height: '100%',
                            backgroundColor: item.riskscore > 60 ? '#b91c1c' :
                              item.riskscore >= 20 ? '#b45309' : '#15803d',
                          }} />
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: item.mlresult === 'PHISHING' ? '#b91c1c' : '#15803d',
                      }}>
                        {item.mlresult}
                      </span>
                    </td>

                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {item.actiontaken}
                      </span>
                    </td>

                    <td style={{ padding: '14px', fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {item.detectedat
                        ? new Date(item.detectedat).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })
                        : 'Just now'}
                    </td>

                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Item Modal (Clean White Theme) */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '28px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                color: '#6b7280',
                fontSize: '1.2rem',
                cursor: 'pointer',
              }}
              aria-label="Close modal"
            >
              ✕
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px' }}>
              <RiskMeter
                score={selectedItem.riskscore}
                verdict={selectedItem.fresult}
                size={140}
              />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginTop: '10px' }}>
                Scan Record #{selectedItem.did}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Destination URL
                </span>
                <span style={{ color: '#111827', wordBreak: 'break-all', fontWeight: 600 }}>
                  {selectedItem.url || 'Not recorded'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    Final Verdict
                  </span>
                  <span className={`badge ${
                    selectedItem.fresult === 'SUSPICIOUS' ? 'badge-danger' :
                    selectedItem.fresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
                  }`} style={{ marginTop: '4px' }}>
                    {selectedItem.fresult}
                  </span>
                </div>

                <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    Action Taken
                  </span>
                  <span style={{ fontWeight: 600, color: '#111827', marginTop: '4px', display: 'block' }}>
                    {selectedItem.actiontaken}
                  </span>
                </div>

                <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    ML Random Forest
                  </span>
                  <span style={{ fontWeight: 600, color: selectedItem.mlresult === 'PHISHING' ? '#b91c1c' : '#15803d', marginTop: '4px', display: 'block' }}>
                    {selectedItem.mlresult}
                  </span>
                </div>

                <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    Regex Heuristic
                  </span>
                  <span style={{ fontWeight: 600, color: selectedItem.rresult === 'SUSPICIOUS' ? '#b45309' : '#15803d', marginTop: '4px', display: 'block' }}>
                    {selectedItem.rresult}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedItem.url && (
                <Link
                  to={`/?url=${encodeURIComponent(selectedItem.url)}`}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                >
                  Full Scanner Analysis
                </Link>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
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
