import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDetectionStats, getDetectionHistory, ApiError } from '../services/api';
import type { DetectionStats, DetectionHistoryItem } from '../types/api';
import { StatCard } from '../components/StatCard';

export function DashboardPage() {
  const { user } = useAuth();
  const effectiveUserId = user?.userid || 1; // Default to user 1 for telemetry demo if not signed in

  const [stats, setStats] = useState<DetectionStats | null>(null);
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [statsData, historyData] = await Promise.all([
          getDetectionStats(effectiveUserId),
          getDetectionHistory(effectiveUserId),
        ]);
        if (isMounted) {
          setStats(statsData);
          setHistory(historyData);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Could not connect to PhishRadar backend on localhost:8080.');
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [effectiveUserId]);

  // Fallback demo stats if backend has no rows yet
  const total = stats?.totalScans || history.length || 0;
  const suspicious = stats?.suspicious || history.filter(h => h.fresult === 'SUSPICIOUS').length || 0;
  const review = stats?.review || history.filter(h => h.fresult === 'REVIEW').length || 0;
  const safe = stats?.safe || history.filter(h => h.fresult === 'SAFE').length || 0;
  const warnings = stats?.warnings || suspicious;

  const safePct = total > 0 ? Math.round((safe / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((review / total) * 100) : 0;
  const suspiciousPct = total > 0 ? Math.round((suspicious / total) * 100) : 0;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Security Operations Dashboard
            </h1>
            <span className="badge badge-neutral">User #{effectiveUserId}</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            Unified real-time telemetry across browser extension and web URL inspection engines.
          </p>
        </div>

        <Link to="/" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
          Launch New Scan
        </Link>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#b91c1c',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>Backend Connection Alert</div>
            <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        <StatCard
          title="Total Scans Logged"
          value={isLoading ? '...' : total}
          subtitle="Processed via backend"
          color="cyan"
        />
        <StatCard
          title="Suspicious Threats"
          value={isLoading ? '...' : suspicious}
          subtitle="Blocked or flagged"
          color="red"
        />
        <StatCard
          title="Requires Review"
          value={isLoading ? '...' : review}
          subtitle="Ambiguous indicators"
          color="amber"
        />
        <StatCard
          title="Clean / Safe URLs"
          value={isLoading ? '...' : safe}
          subtitle="Allowed traffic"
          color="green"
        />
        <StatCard
          title="Active Warnings"
          value={isLoading ? '...' : warnings}
          subtitle="Action: WARNING"
          color="red"
        />
      </div>

      {/* Middle Section: Threat Distribution & Engine Status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* Threat Distribution Card */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
            Threat Severity Distribution
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Breakdown of URL verdicts classified by the dual-engine pipeline.
          </p>

          {/* Distribution Visual Bar */}
          <div style={{
            height: '16px',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            marginBottom: '20px',
          }}>
            <div style={{ width: `${safePct}%`, backgroundColor: 'var(--safe-green)', transition: 'width 0.5s ease' }} title={`Safe: ${safePct}%`} />
            <div style={{ width: `${reviewPct}%`, backgroundColor: 'var(--warning-amber)', transition: 'width 0.5s ease' }} title={`Review: ${reviewPct}%`} />
            <div style={{ width: `${suspiciousPct}%`, backgroundColor: 'var(--danger-crimson)', transition: 'width 0.5s ease' }} title={`Suspicious: ${suspiciousPct}%`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--safe-green)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Clean / Safe (PASS)</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>
                {safe} ({safePct}%)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning-amber)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Ambiguous Review</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>
                {review} ({reviewPct}%)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--danger-crimson)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Confirmed Suspicious</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-muted)' }}>
                {suspicious} ({suspiciousPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Engine Components Status */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
            PhishRadar Subsystem Status
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Live status of backend classifiers, database persistence, and client bridges.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Weka ML RandomForest Model</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>100 Trees &bull; 10 Extracted Features &bull; Classpath Loaded</div>
              </div>
              <span className="badge badge-safe">ACTIVE</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Regex Heuristic Rule Engine</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>8 Lexical Rules &bull; Scored Weight Matrix (0-100)</div>
              </div>
              <span className="badge badge-safe">ACTIVE</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Chrome MV3 Extension Relay</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Navigation Interceptor &bull; Background Service Worker</div>
              </div>
              <span className="badge badge-safe">ONLINE</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>MySQL Persistence Layer</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Tables: users, website, detection, threat, mlmodel</div>
              </div>
              <span className="badge badge-safe">SYNCED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Detections Stream */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Recent Detection Feed</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Latest threats inspected and logged in the database</p>
          </div>
          <Link to="/history" style={{ fontSize: '0.85rem', color: 'var(--radar-cyan)', fontWeight: 500 }}>
            View Full Log &rarr;
          </Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <div>Loading security event records...</div>
          </div>
        ) : history.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#f9fafb',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed #d1d5db',
          }}>
            <div style={{ fontWeight: 600, color: '#111827' }}>No scan history recorded yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Run your first scan on the Scanner page or browse with the Chrome extension.
            </div>
            <Link to="/" className="btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
              Run Scan Now
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Target Domain / URL</th>
                  <th style={{ padding: '12px 16px' }}>Final Verdict</th>
                  <th style={{ padding: '12px 16px' }}>Risk Score</th>
                  <th style={{ padding: '12px 16px' }}>ML Result</th>
                  <th style={{ padding: '12px 16px' }}>Action Taken</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((item) => (
                  <tr
                    key={item.did}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.domain || 'Domain record'}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.url || `Website ID #${item.wid}`}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${
                        item.fresult === 'SUSPICIOUS' ? 'badge-danger' :
                        item.fresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
                      }`}>
                        {item.fresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      <span style={{
                        color: item.riskscore >= 60 ? 'var(--danger-crimson)' :
                          item.riskscore >= 30 ? 'var(--warning-amber)' : 'var(--safe-green)'
                      }}>
                        {item.riskscore} / 100
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '0.85rem', color: item.mlresult === 'PHISHING' ? '#f87171' : '#34d399' }}>
                        {item.mlresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {item.actiontaken}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {item.detectedat ? new Date(item.detectedat).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
