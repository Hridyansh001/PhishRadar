import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDetectionHistory, ApiError } from '../services/api';
import type { DetectionHistoryItem } from '../types/api';
import { RiskMeter } from '../components/RiskMeter';

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
            Export Audit Log (JSON)
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#b91c1c',
          marginBottom: '20px',
        }}>
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* Controls Bar: Search + Filters — Open & Frameless */}
      <div
        style={{
          padding: '0 0 20px 0',
          marginBottom: '28px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by domain, URL, or detection ID..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              color: '#111827',
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
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: verdictFilter === verdict ? '#000000' : 'transparent',
                color: verdictFilter === verdict ? '#ffffff' : '#374151',
                border: verdictFilter === verdict ? '1px solid #000000' : '1px solid #d1d5db',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {verdict}
            </button>
          ))}
        </div>
      </div>

      {/* History Table — Frameless */}
      <div style={{ overflowX: 'auto', padding: '0' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <div>Loading detection history from MySQL repository...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#111827' }}>No matching records found</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
              {history.length === 0 ? 'No scan history exists yet for this user.' : 'Try adjusting your search query or verdict filter.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  color: '#6b7280',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: 'transparent',
                }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Destination Domain / URL</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Final Verdict</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Risk Score</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ML Classifier</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Regex Verdict</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Logged At</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.did}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#6b7280' }}>
                      #{item.did}
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: '340px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {item.domain || 'Domain'}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.url || `Website Record #${item.wid}`}
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
                        color: item.riskscore > 60 ? 'var(--danger-crimson)' :
                          item.riskscore >= 20 ? 'var(--warning-amber)' : 'var(--safe-green)'
                      }}>
                        {item.riskscore} / 100
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                      <span style={{ color: item.mlresult === 'PHISHING' ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                        {item.mlresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                      <span style={{ color: item.rresult === 'SUSPICIOUS' ? '#b45309' : '#6b7280', fontWeight: 500 }}>
                        {item.rresult}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {item.actiontaken}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {item.detectedat ? new Date(item.detectedat).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
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
                            style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#111827' }}
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
              maxWidth: '560px',
              padding: '30px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSelectedItem(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', color: '#6b7280', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <RiskMeter
                score={selectedItem.riskscore}
                verdict={selectedItem.fresult}
                size={150}
              />
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
                  Detection Record #{selectedItem.did}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DESTINATION URL:</span>
                <span style={{ color: '#111827', wordBreak: 'break-all', fontWeight: 600 }}>
                  {selectedItem.url || 'Not recorded'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COMBINED RISK SCORE:</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: selectedItem.riskscore >= 60 ? '#b91c1c' : '#15803d' }}>
                    {selectedItem.riskscore} / 100
                  </span>
                </div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTION APPLIED:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{selectedItem.actiontaken}</span>
                </div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ML CLASSIFICATION:</span>
                  <span style={{ fontWeight: 600, color: selectedItem.mlresult === 'PHISHING' ? '#b91c1c' : '#15803d' }}>{selectedItem.mlresult}</span>
                </div>
                <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>REGEX VERDICT:</span>
                  <span style={{ fontWeight: 600, color: selectedItem.rresult === 'SUSPICIOUS' ? '#b45309' : '#15803d' }}>{selectedItem.rresult}</span>
                </div>
              </div>

              <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DATABASE TIMESTAMP:</span>
                <span style={{ color: '#111827' }}>{selectedItem.detectedat || 'N/A'}</span>
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
