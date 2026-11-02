import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getDetectionStats,
  getDetectionHistory,
  scanUrl,
  checkBackendStatus,
  ApiError,
  type DateRangeFilter,
} from '../services/api';
import type {
  DetectionStats,
  DetectionHistoryItem,
  DetectionResponse,
} from '../types/api';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveUserId = user?.userid || 1;

  // Telemetry & Records state (100% backend driven)
  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // System Health state
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [isExtensionActive, setIsExtensionActive] = useState<boolean>(false);

  // Date Range Filter state
  const [dateRange, setDateRange] = useState<DateRangeFilter>('7d');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Quick URL Scanner state
  const [quickUrl, setQuickUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DetectionResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Check extension activity on mount and when DOM attributes change
  useEffect(() => {
    const checkExt = () => {
      const active =
        document.documentElement.getAttribute('data-phishradar-extension-active') === 'true' ||
        Boolean((window as unknown as { __PHISHRADAR_EXT__?: boolean }).__PHISHRADAR_EXT__);
      setIsExtensionActive(active);
    };

    checkExt();
    const interval = setInterval(checkExt, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real backend data and status
  const loadDashboardData = async (range: DateRangeFilter = dateRange) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Probe backend health
      const health = await checkBackendStatus();
      setIsBackendOnline(health.online);

      // 2. Fetch real stats and scan telemetry
      const [statsData, historyData] = await Promise.all([
        getDetectionStats(effectiveUserId, range),
        getDetectionHistory(effectiveUserId, range),
      ]);

      setStats(statsData);
      setHistory(historyData);
    } catch (err) {
      setIsBackendOnline(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to load telemetry. Please verify the Spring Boot backend on localhost:8080.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(dateRange);
  }, [effectiveUserId, dateRange]);

  // Handle Quick URL Scan submission directly to Spring Boot backend
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

      // Submit actual scan request to POST /api/detect
      const result = await scanUrl(formattedUrl, effectiveUserId);
      setScanResult(result);
      setQuickUrl('');

      // Refresh telemetry using the actual new record
      await loadDashboardData(dateRange);
    } catch (err) {
      if (err instanceof ApiError) {
        setScanError(err.message);
      } else {
        setScanError('Failed to inspect URL. Verify the backend connection on port 8080.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Extract strict backend-driven metrics
  const total = stats?.totalScans ?? history.length ?? 0;
  const safe = stats?.safe ?? history.filter((h) => h.fresult === 'SAFE').length ?? 0;
  const review = stats?.review ?? history.filter((h) => h.fresult === 'REVIEW').length ?? 0;
  const suspicious = stats?.suspicious ?? history.filter((h) => h.fresult === 'SUSPICIOUS').length ?? 0;

  const safePct = total > 0 ? Math.round((safe / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((review / total) * 100) : 0;
  const suspiciousPct = total > 0 ? Math.round((suspicious / total) * 100) : 0;

  // Donut chart math (Radius 50, Circumference = 314.159)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const safeStroke = (safePct / 100) * circumference;
  const reviewStroke = (reviewPct / 100) * circumference;
  const suspiciousStroke = (suspiciousPct / 100) * circumference;

  const safeOffset = 0;
  const reviewOffset = -safeStroke;
  const suspiciousOffset = -(safeStroke + reviewStroke);

  const formatTimestamp = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '—';
    }
  };

  const dateRangeLabels: Record<DateRangeFilter, string> = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    'all': 'All time',
  };

  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      {/* Decorative Pixel Stairs (Top Right Accent) */}
      <div style={{
        position: 'absolute',
        top: '-16px',
        right: '120px',
        opacity: 0.4,
        pointerEvents: 'none',
      }}>
        <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
          <rect x="0" y="24" width="8" height="8" fill="#15803D" />
          <rect x="8" y="16" width="8" height="8" fill="#16A34A" />
          <rect x="16" y="8" width="8" height="8" fill="#22C55E" />
          <rect x="24" y="0" width="8" height="8" fill="#86EFAC" />
        </svg>
      </div>

      {/* Top Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          {/* Breadcrumb / Section Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#15803D',
            marginBottom: '6px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#15803D',
              borderRadius: '1px',
              display: 'inline-block',
            }} />
            <span>Overview</span>
          </div>

          <h1 style={{
            fontSize: '2.05rem',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Security Dashboard
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '0.92rem',
            marginTop: '4px',
            marginBottom: 0,
          }}>
            Monitor threats, scan links, and keep your browsing safe.
          </p>
        </div>

        {/* Right Header Controls: Date Filter Dropdown & Full URL Scanner */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
          {/* Date Range Selector */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                color: '#374151',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{dateRangeLabels[dateRange]}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showDateDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                zIndex: 50,
                minWidth: '150px',
                overflow: 'hidden',
              }}>
                {(['24h', '7d', '30d', 'all'] as DateRangeFilter[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setDateRange(r);
                      setShowDateDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      textAlign: 'left',
                      fontSize: '0.84rem',
                      color: dateRange === r ? '#15803D' : '#374151',
                      fontWeight: dateRange === r ? 700 : 500,
                      backgroundColor: dateRange === r ? '#F0FDF4' : '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'block',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (dateRange !== r) e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      if (dateRange !== r) e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    {dateRangeLabels[r]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Full URL Scanner Button */}
          <Link
            to="/scanner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#111827',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          >
            <span>Full URL Scanner</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"/>
              <polyline points="7 7 17 7 17 17"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Error Notice with Retry */}
      {error && (
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#B91C1C',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.88rem',
        }}>
          <div>
            <strong>Backend Notice:</strong> {error}
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData(dateRange)}
            style={{
              padding: '5px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#B91C1C',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Open Quick URL Scan Workspace Bar (Frameless & Clean) */}
      <div style={{ marginBottom: '32px' }}>
        <form
          onSubmit={handleQuickScan}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            width: '100%',
          }}
        >
          {/* Left Title with Scan Icon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            paddingRight: '12px',
            borderRight: '1px solid #E5E7EB',
            color: '#111827',
            fontWeight: 700,
            fontSize: '0.94rem',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Quick URL Scan</span>
          </div>

          {/* Clean Framed Input Field Only */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1,
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            padding: '9px 14px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste or type any URL to inspect..."
              disabled={isScanning}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '0.92rem',
                color: '#111827',
                backgroundColor: 'transparent',
              }}
            />
          </div>

          {/* Scan Action Button */}
          <button
            type="submit"
            disabled={isScanning || !quickUrl.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: isScanning || !quickUrl.trim() ? '#9CA3AF' : '#111827',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              fontWeight: 600,
              border: 'none',
              cursor: isScanning || !quickUrl.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {isScanning ? (
              <>
                <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }} />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span>Scan URL</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Scan Error Message */}
        {scanError && (
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            fontSize: '0.84rem',
            borderRadius: '6px',
          }}>
            {scanError}
          </div>
        )}

        {/* Real Scan Result Feedback Card */}
        {scanResult && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            backgroundColor: scanResult.finalresult === 'SAFE' ? '#F0FDF4' : scanResult.finalresult === 'REVIEW' ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${scanResult.finalresult === 'SAFE' ? '#BBF7D0' : scanResult.finalresult === 'REVIEW' ? '#FDE68A' : '#FECACA'}`,
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.78rem',
                backgroundColor: scanResult.finalresult === 'SAFE' ? '#DCFCE7' : scanResult.finalresult === 'REVIEW' ? '#FEF3C7' : '#FEE2E2',
                color: scanResult.finalresult === 'SAFE' ? '#15803D' : scanResult.finalresult === 'REVIEW' ? '#B45309' : '#B91C1C',
              }}>
                {scanResult.finalresult}
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827' }}>
                {scanResult.domain || scanResult.url}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Risk Score: <strong>{scanResult.risckscore ?? scanResult.riskscore ?? 0} / 100</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/scanner')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#111827',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Inspect in Scanner &rarr;
              </button>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Summary Row — Open & Editorial (No Box Outlines) */}
      <div style={{
        padding: '8px 0 32px 0',
        marginBottom: '36px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.1fr 1.4fr',
          gap: '32px',
          alignItems: 'center',
        }}>
          {/* Part 1: Total Scans and Legend Breakdown */}
          <div>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#6B7280',
              marginBottom: '4px',
            }}>
              Total Scans
            </div>

            <div style={{
              fontSize: '2.8rem',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1,
              marginBottom: '10px',
            }}>
              {isLoading ? '—' : total}
            </div>

            {/* Dynamic Trend Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: total > 0 ? '#16A34A' : '#6B7280',
              marginBottom: '18px',
            }}>
              {total > 0 ? (
                <>
                  <span>↗</span>
                  <span>
                    {stats?.trendPercentage !== undefined
                      ? `+${stats.trendPercentage}% from ${dateRangeLabels[dateRange].toLowerCase()}`
                      : `Active telemetry for ${dateRangeLabels[dateRange].toLowerCase()}`}
                  </span>
                </>
              ) : (
                <span>No scans recorded in this window</span>
              )}
            </div>

            {/* Breakdown Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: '#16A34A', borderRadius: '2px' }} />
                  <span style={{ color: '#374151', fontWeight: 500 }}>Safe & Clean</span>
                </div>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  {safe} ({safePct}%)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: '#F59E0B', borderRadius: '2px' }} />
                  <span style={{ color: '#374151', fontWeight: 500 }}>Requires Review</span>
                </div>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  {review} ({reviewPct}%)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '9px', height: '9px', backgroundColor: '#DC2626', borderRadius: '2px' }} />
                  <span style={{ color: '#374151', fontWeight: 500 }}>Threats & Blocked</span>
                </div>
                <span style={{ fontWeight: 700, color: '#111827' }}>
                  {suspicious} ({suspiciousPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Part 2: Center SVG Donut Chart */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg width="150" height="150" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={total === 0 ? '#E5E7EB' : '#F3F4F6'}
                  strokeWidth="18"
                />

                {total > 0 && (
                  <g transform="rotate(-90 70 70)">
                    {/* Safe Ring Segment (Green) */}
                    {safePct > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="none"
                        stroke="#16A34A"
                        strokeWidth="18"
                        strokeDasharray={`${safeStroke} ${circumference}`}
                        strokeDashoffset={safeOffset}
                      />
                    )}

                    {/* Review Ring Segment (Amber) */}
                    {reviewPct > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="18"
                        strokeDasharray={`${reviewStroke} ${circumference}`}
                        strokeDashoffset={reviewOffset}
                      />
                    )}

                    {/* Suspicious / Blocked Ring Segment (Red) */}
                    {suspiciousPct > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="none"
                        stroke="#DC2626"
                        strokeWidth="18"
                        strokeDasharray={`${suspiciousStroke} ${circumference}`}
                        strokeDashoffset={suspiciousOffset}
                      />
                    )}
                  </g>
                )}
              </svg>

              {/* Inside Donut Center Metrics */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: '#111827',
                  lineHeight: 1.1,
                }}>
                  {isLoading ? '…' : total}
                </div>
                <div style={{
                  fontSize: '0.78rem',
                  color: '#6B7280',
                  fontWeight: 600,
                }}>
                  Scans
                </div>
              </div>
            </div>
          </div>

          {/* Part 3: Active Defense System Statuses */}
          <div style={{
            borderLeft: '1px solid #E5E7EB',
            paddingLeft: '28px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <h2 style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#111827',
                margin: 0,
              }}>
                Active Defense
              </h2>
              <span style={{
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                backgroundColor: isBackendOnline ? '#DCFCE7' : '#FEE2E2',
                color: isBackendOnline ? '#15803D' : '#B91C1C',
              }}>
                {isBackendOnline ? 'PROTECTED' : 'OFFLINE'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Row 1: Chrome Extension Relay */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19.439 7.85c-.049-.322-.24-.602-.519-.757L14.39 4.417a1.455 1.455 0 0 0-1.42 0L8.44 6.96c-.28.155-.47.435-.52.757l-.99 6.467c-.07.457.14 0.916.53 1.17l5.24 3.42c.43.28 1 .28 1.43 0l5.24-3.42c.39-.254.6-.713.53-1.17l-.99-6.467z"/>
                  </svg>
                  <span style={{ fontSize: '0.86rem', color: '#374151', fontWeight: 600 }}>
                    Chrome MV3 Extension Relay
                  </span>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: isExtensionActive ? '#16A34A' : '#9CA3AF',
                }}>
                  {isExtensionActive ? 'Online' : 'Not Detected'}
                </span>
              </div>

              {/* Row 2: Weka Random Forest Classifier */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span style={{ fontSize: '0.86rem', color: '#374151', fontWeight: 600 }}>
                    Weka Random Forest Classifier
                  </span>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: isBackendOnline ? '#16A34A' : '#9CA3AF',
                }}>
                  {isBackendOnline ? 'Active' : 'Status unavailable'}
                </span>
              </div>

              {/* Row 3: Heuristic & Lexical Rule Engine */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span style={{ fontSize: '0.86rem', color: '#374151', fontWeight: 600 }}>
                    Heuristic & Lexical Rule Engine
                  </span>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: isBackendOnline ? '#16A34A' : '#9CA3AF',
                }}>
                  {isBackendOnline ? 'Active' : 'Status unavailable'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Detection Activity Section (Frameless Open Table) */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '16px',
        }}>
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
            }}>
              Recent Detection Activity
            </h2>
            <p style={{
              fontSize: '0.84rem',
              color: '#6B7280',
              margin: '3px 0 0 0',
            }}>
              Latest scanned URLs and their security verdicts.
            </p>
          </div>

          <Link
            to="/detections"
            style={{
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#111827',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View Full Log</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Real Detections Table — Open on Page (No Outer Box Outline) */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid #E5E7EB',
              }}>
                <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  DOMAIN / TARGET URL
                </th>
                <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  VERDICT
                </th>
                <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  RISK SCORE
                </th>
                <th style={{ padding: '12px 10px', fontSize: '0.74rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ML CLASSIFIER
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
                // Loading Skeleton Rows
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td colSpan={6} style={{ padding: '16px 10px' }}>
                      <div style={{
                        height: '14px',
                        backgroundColor: '#E5E7EB',
                        borderRadius: '4px',
                        animation: 'pulse 1.5s infinite ease-in-out',
                      }} />
                    </td>
                  </tr>
                ))
              ) : history.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} style={{ padding: '48px 10px', textAlign: 'center' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9CA3AF',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#111827' }}>
                        No detection records found
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#6B7280', maxWidth: '380px' }}>
                        No scans recorded for the selected time window. Use the Quick URL Scan bar above to inspect your first link.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                // Real Scan Records (Take the first 6 for dashboard preview)
                history.slice(0, 6).map((item) => {
                  const isBlocked = item.fresult === 'SUSPICIOUS';
                  const isReview = item.fresult === 'REVIEW';

                  const verdictLabel = isBlocked ? 'Phishing' : isReview ? 'Review' : 'Safe';
                  const verdictBg = isBlocked ? '#FEE2E2' : isReview ? '#FEF3C7' : '#DCFCE7';
                  const verdictColor = isBlocked ? '#B91C1C' : isReview ? '#B45309' : '#15803D';

                  const score = item.riskscore ?? 0;
                  const scoreColor = score >= 70 ? '#DC2626' : score >= 30 ? '#D97706' : '#15803D';

                  const actionLabel =
                    item.actiontaken === 'WARNING' || item.actiontaken === 'BLOCKED'
                      ? 'Blocked'
                      : item.actiontaken === 'REVIEW'
                      ? 'Flagged'
                      : 'Allowed';

                  const isMlPhishing =
                    item.mlresult?.toUpperCase() === 'PHISHING' ||
                    item.fresult === 'SUSPICIOUS';
                  const mlVerdict = isMlPhishing ? 'Phishing' : 'Legit';

                  return (
                    <tr
                      key={item.did}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F4')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Target Domain / URL */}
                      <td style={{ padding: '14px 10px', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          <span style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: '#111827',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }} title={item.url || item.domain}>
                            {item.url || item.domain || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Verdict Badge */}
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: verdictBg,
                          color: verdictColor,
                          display: 'inline-block',
                        }}>
                          {verdictLabel}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{
                          fontSize: '0.92rem',
                          fontWeight: 800,
                          color: scoreColor,
                        }}>
                          {score}
                        </span>
                      </td>

                      {/* ML Classifier */}
                      <td style={{ padding: '14px 10px', fontSize: '0.85rem', color: isMlPhishing ? '#DC2626' : '#4B5563', fontWeight: 500 }}>
                        {mlVerdict}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                          {actionLabel}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontSize: '0.84rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {formatTimestamp(item.detectedat)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decorative Pixel Stairs (Bottom Right Corner) */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '28px',
        opacity: 0.35,
        pointerEvents: 'none',
      }}>
        <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
          <rect x="10" y="20" width="8" height="8" fill="#15803D" />
          <rect x="20" y="12" width="8" height="8" fill="#16A34A" />
          <rect x="30" y="4" width="8" height="8" fill="#22C55E" />
          <rect x="40" y="12" width="8" height="8" fill="#86EFAC" />
        </svg>
      </div>
    </div>
  );
}
