import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scanUrl, getDetectionHistory, getDetectionStats, ApiError } from '../services/api';
import type { DetectionResponse, DetectionHistoryItem, DetectionStats } from '../types/api';
import { RiskMeter } from '../components/RiskMeter';

const QUICK_CHECKS = [
  { label: 'Official Site', url: 'https://www.google.com' },
  { label: 'Brand Impersonation', url: 'http://paypal-security-update.com/login' },
  { label: 'Suspicious TLD', url: 'http://secure-banking-alert.tk/verify' },
  { label: 'URL Shortener', url: 'https://bit.ly/3xQ9Z7' },
];

export function ScannerPage() {
  const { user } = useAuth();
  const effectiveUserId = user?.userid || 1;

  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [selectedScan, setSelectedScan] = useState<DetectionHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [stats, setStats] = useState<DetectionStats | null>(null);

  useEffect(() => {
    loadData();
  }, [effectiveUserId]);

  async function loadData() {
    try {
      const [historyData, statsData] = await Promise.all([
        getDetectionHistory(effectiveUserId),
        getDetectionStats(effectiveUserId),
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch {
      // Ignore
    }
  }

  const handleScan = async (targetUrl?: string) => {
    const urlToTest = (targetUrl || inputUrl).trim();
    if (!urlToTest) {
      setError('Please provide a URL to analyze.');
      return;
    }

    if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const scanResult = await scanUrl(urlToTest, effectiveUserId);
      setResult(scanResult);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to analyze URL. Verify backend server is running on http://localhost:8080');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCheck = (url: string) => {
    setInputUrl(url);
    handleScan(url);
  };

  const totalScanned = stats?.totalScans || 0;
  const threatsDetected = stats?.suspicious || 0;
  const safeUrls = stats?.safe || 0;

  const getVerdictColor = (verdict: string) => {
    const v = (verdict || '').toUpperCase();
    if (v === 'SUSPICIOUS' || v === 'MALICIOUS') return '#b91c1c';
    if (v === 'REVIEW') return '#b45309';
    if (v === 'SAFE') return '#15803d';
    return '#4b5563';
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '48px 24px' }}>
      {/* Title & Tagline */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '2.4rem',
          fontWeight: 700,
          color: '#000000',
          letterSpacing: '0.01em',
          margin: 0,
        }}>
          URL Scanner & Phishing Telemetry
        </h1>
        <p style={{ fontSize: '1rem', color: '#4b5563', fontStyle: 'italic', marginTop: '6px' }}>
          Evaluate suspicious links through machine learning analysis and heuristic regex indicators
        </p>
      </div>

      {/* Search Bar Panel — Frameless */}
      <div style={{
        padding: '0 0 24px 0',
        marginBottom: '32px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="Enter a URL to analyze (e.g. https://example.com)"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              color: '#111827',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          />
          <button
            onClick={() => handleScan()}
            disabled={isLoading}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: '1px solid #000000',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Quick Checks */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          color: '#6b7280',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, color: '#374151' }}>Quick checks:</span>
          {QUICK_CHECKS.map((item, idx) => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => handleQuickCheck(item.url)}
                style={{
                  color: '#111827',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                {item.label}
              </button>
              {idx < QUICK_CHECKS.length - 1 && <span style={{ color: '#d1d5db' }}>|</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '14px 18px',
          marginBottom: '28px',
          borderRadius: '8px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          fontSize: '0.92rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontWeight: 700 }}>Notice:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Generated Scan Result Card with Pie Chart Score Display */}
      {result && (
        <div style={{
          padding: '24px 0',
          marginBottom: '36px',
          borderBottom: '1px solid #e5e7eb',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <span style={{
                fontSize: '0.78rem',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 700,
              }}>
                Live Security Evaluation
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', wordBreak: 'break-all', marginTop: '2px' }}>
                {result.url}
              </div>
            </div>
            <button
              onClick={() => setResult(null)}
              style={{
                color: '#6b7280',
                fontSize: '1.2rem',
                padding: '4px 8px',
                lineHeight: 1,
                cursor: 'pointer',
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '36px',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #f3f4f6',
          }}>
            {/* Pie Chart Radial Score Display */}
            <div style={{ padding: '8px 16px' }}>
              <RiskMeter
                score={result.risckscore}
                verdict={result.finalresult}
                riskLevel={result.risklevel}
                size={170}
              />
            </div>

            {/* Evaluation Breakdown Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Verdict</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: getVerdictColor(result.finalresult), marginTop: '3px' }}>
                    {result.finalresult}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>ML Classification</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: result.mlresult === 'PHISHING' ? '#b91c1c' : '#15803d', marginTop: '3px' }}>
                    {result.mlresult}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Action Taken</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginTop: '3px' }}>
                    {result.actiontaken}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Regex Rules</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: result.regexresult === 'PASS' ? '#15803d' : '#b45309', marginTop: '3px' }}>
                    {result.regexresult}
                  </div>
                </div>
              </div>

              {result.message && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  color: '#374151',
                }}>
                  <strong style={{ color: '#111827' }}>Recommendation:</strong> {result.message}
                </div>
              )}

              {/* Official Alternative Banner */}
              {result.officialAlternative && (
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Verified Official Alternative
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1e3a8a', marginTop: '2px' }}>
                      Looking for the genuine service? Access the official domain instead:
                    </div>
                  </div>
                  <a
                    href={result.officialAlternative}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Go to Official Website ↗
                  </a>
                </div>
              )}

              {/* Tailored User Guidance & Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Security Guidance & User Suggestions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.suggestions.map((sugg, idx) => (
                      <div key={idx} style={{ fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.45' }}>
                        {sugg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Stats Row — Open Editorial */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '36px',
        padding: '0 0 24px 0',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>URLs Scanned</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#000000', marginTop: '4px' }}>{totalScanned}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Threats Detected</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>{threatsDetected}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Safe URLs</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>{safeUrls}</div>
        </div>
      </div>

      {/* Recent Scans Table Section — Frameless */}
      <div style={{
        padding: '8px 0 0 0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '14px',
        }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#000000', margin: 0 }}>
              Recent Security Evaluations
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', marginTop: '2px' }}>
              Click any risk score or entry to inspect the pie chart risk distribution
            </p>
          </div>
          <a
            href="/history"
            style={{
              fontSize: '0.88rem',
              color: '#000000',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            View Full Log
          </a>
        </div>

        {history.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.95rem',
            fontStyle: 'italic',
          }}>
            No security evaluations recorded yet. Analyze a URL above to log entries.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.92rem',
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  color: '#6b7280',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>URL Destination</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Verdict</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Risk Score (Click to view)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((item, index) => (
                  <tr
                    key={item.did}
                    onClick={() => setSelectedScan(item)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 8px', color: '#6b7280', fontWeight: 600 }}>
                      {index + 1}
                    </td>
                    <td style={{
                      padding: '14px 16px',
                      color: '#111827',
                      fontWeight: 500,
                      maxWidth: '340px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.url || `Website #${item.wid}`}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        color: getVerdictColor(item.fresult),
                        fontWeight: 700,
                      }}>
                        {item.fresult === 'SAFE' ? 'Safe' :
                         item.fresult === 'SUSPICIOUS' ? 'Malicious' :
                         'Suspicious'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {/* Clickable Score Pill */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScan(item);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          border: `1px solid ${getVerdictColor(item.fresult)}60`,
                          color: getVerdictColor(item.fresult),
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}
                        title="Click to view pie chart score breakdown"
                      >
                        <span>{item.riskscore} / 100</span>
                      </button>
                    </td>
                    <td style={{
                      padding: '14px 16px',
                      color: '#6b7280',
                      whiteSpace: 'nowrap',
                    }}>
                      {getTimeAgo(item.detectedat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pie Chart Score Breakdown Modal */}
      {selectedScan && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          padding: '20px',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.15)',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedScan(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                color: '#6b7280',
                fontSize: '1.2rem',
                padding: '4px 8px',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              title="Close"
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <span style={{
                fontSize: '0.74rem',
                color: '#6b7280',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Telemetry Risk Breakdown
              </span>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#111827',
                marginTop: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedScan.url || `Website #${selectedScan.wid}`}
              </h3>
            </div>

            {/* Circular Pie Chart Radial Score Display */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '16px 0 24px',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <RiskMeter
                score={selectedScan.riskscore}
                verdict={selectedScan.fresult}
                size={180}
              />
            </div>

            {/* Metrics Breakdown Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '20px',
            }}>
              <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>Verdict</span>
                <span style={{ color: getVerdictColor(selectedScan.fresult), fontWeight: 700, fontSize: '1rem' }}>
                  {selectedScan.fresult}
                </span>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>ML Classification</span>
                <span style={{ color: selectedScan.mlresult === 'PHISHING' ? '#b91c1c' : '#15803d', fontWeight: 700, fontSize: '1rem' }}>
                  {selectedScan.mlresult || 'N/A'}
                </span>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>Action Applied</span>
                <span style={{ color: '#111827', fontWeight: 700, fontSize: '0.95rem' }}>
                  {selectedScan.actiontaken || 'ALLOWED'}
                </span>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 600 }}>Regex Rules</span>
                <span style={{ color: selectedScan.rresult === 'PASS' ? '#15803d' : '#b45309', fontWeight: 700, fontSize: '0.95rem' }}>
                  {selectedScan.rresult || 'PASS'}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid #f3f4f6',
            }}>
              {selectedScan.url && (
                <button
                  onClick={() => {
                    setInputUrl(selectedScan.url || '');
                    setSelectedScan(null);
                    handleScan(selectedScan.url);
                  }}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                  }}
                >
                  Re-Scan URL
                </button>
              )}
              <button
                onClick={() => setSelectedScan(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  fontWeight: 600,
                  fontSize: '0.92rem',
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
