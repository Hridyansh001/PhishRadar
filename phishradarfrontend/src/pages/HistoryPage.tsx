import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDetectionHistory, ApiError } from '../services/api';
import type { DetectionHistoryItem } from '../types/api';

export function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveUserId = user?.userid || 1;

  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DetectionHistoryItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getDetectionHistory(effectiveUserId);
        if (isMounted) setHistory(data);
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Could not connect to backend on localhost:8080');
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [effectiveUserId]);

  const filteredItems = history.filter((item) => {
    const matchesSearch =
      (item.url && item.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.domain && item.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.did.toString().includes(searchTerm);

    const matchesVerdict =
      verdictFilter === 'ALL' || item.fresult === verdictFilter;

    return matchesSearch && matchesVerdict;
  });

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `phishradar_detections_user_${effectiveUserId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Historical Scan Registry
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Auditable log of all security evaluations recorded in the MySQL database.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportToJson}
            disabled={history.length === 0}
            className="btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            📥 Export Audit Log (JSON)
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
          marginBottom: '20px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Controls Bar: Search + Filters */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by domain, URL, or detection ID..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Verdict Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'SAFE', 'REVIEW', 'SUSPICIOUS'].map((verdict) => (
            <button
              key={verdict}
              onClick={() => setVerdictFilter(verdict)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: verdictFilter === verdict ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: verdictFilter === verdict ? 'var(--radar-cyan)' : 'var(--text-muted)',
                border: verdictFilter === verdict ? '1px solid rgba(0, 242, 254, 0.35)' : '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}
            >
              {verdict}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
            <span className="radar-sweep-icon" style={{ display: 'inline-block', fontSize: '1.8rem', marginBottom: '12px' }}>🔄</span>
            <div>Loading detection history from MySQL repository...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>No matching records found</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              {history.length === 0 ? 'No scan history exists yet for this user.' : 'Try adjusting your search query or verdict filter.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-dim)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <th style={{ padding: '14px 20px' }}>ID</th>
                  <th style={{ padding: '14px 20px' }}>Destination Domain / URL</th>
                  <th style={{ padding: '14px 20px' }}>Final Verdict</th>
                  <th style={{ padding: '14px 20px' }}>Risk Score</th>
                  <th style={{ padding: '14px 20px' }}>ML Classifier</th>
                  <th style={{ padding: '14px 20px' }}>Regex Verdict</th>
                  <th style={{ padding: '14px 20px' }}>Action</th>
                  <th style={{ padding: '14px 20px' }}>Logged At</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.did}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      #{item.did}
                    </td>
                    <td style={{ padding: '14px 20px', maxWidth: '340px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.domain || 'Domain'}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.url || `Website Record #${item.wid}`}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${
                        item.fresult === 'SUSPICIOUS' ? 'badge-danger' :
                        item.fresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
                      }`}>
                        {item.fresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      <span style={{
                        color: item.riskscore >= 60 ? 'var(--danger-crimson)' :
                          item.riskscore >= 30 ? 'var(--warning-amber)' : 'var(--safe-green)'
                      }}>
                        {item.riskscore} / 100
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.85rem' }}>
                      <span style={{ color: item.mlresult === 'PHISHING' ? '#f87171' : '#34d399', fontWeight: 500 }}>
                        {item.mlresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.85rem' }}>
                      <span style={{ color: item.rresult === 'SUSPICIOUS' ? '#fbbf24' : '#94a3b8' }}>
                        {item.rresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {item.actiontaken}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {item.detectedat ? new Date(item.detectedat).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Inspect
                        </button>
                        {item.url && (
                          <button
                            onClick={() => {
                              navigate(`/?url=${encodeURIComponent(item.url || '')}`);
                            }}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--radar-cyan)' }}
                            title="Run fresh scan on this URL"
                          >
                            Re-Scan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Item Modal */}
      {selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '30px',
              backgroundColor: '#0e131f',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSelectedItem(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--text-muted)', fontSize: '1.2rem' }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: selectedItem.fresult === 'SUSPICIOUS' ? 'var(--danger-bg)' :
                  selectedItem.fresult === 'REVIEW' ? 'var(--warning-bg)' : 'var(--safe-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
              }}>
                {selectedItem.fresult === 'SUSPICIOUS' ? '🚨' : selectedItem.fresult === 'REVIEW' ? '⚠️' : '🛡️'}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Detection Record #{selectedItem.did}
                </h3>
                <span className={`badge ${
                  selectedItem.fresult === 'SUSPICIOUS' ? 'badge-danger' :
                  selectedItem.fresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
                }`}>
                  Verdict: {selectedItem.fresult}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>DESTINATION URL:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--radar-blue)', wordBreak: 'break-all' }}>
                  {selectedItem.url || 'Not recorded'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>COMBINED RISK SCORE:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: selectedItem.riskscore >= 60 ? '#f87171' : '#34d399' }}>
                    {selectedItem.riskscore} / 100
                  </span>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>ACTION APPLIED:</span>
                  <span style={{ fontWeight: 600 }}>{selectedItem.actiontaken}</span>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>ML CLASSIFICATION:</span>
                  <span style={{ fontWeight: 600 }}>{selectedItem.mlresult}</span>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>REGEX VERDICT:</span>
                  <span style={{ fontWeight: 600 }}>{selectedItem.rresult}</span>
                </div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>DATABASE TIMESTAMP:</span>
                <span>{selectedItem.detectedat || 'N/A'}</span>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedItem(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
