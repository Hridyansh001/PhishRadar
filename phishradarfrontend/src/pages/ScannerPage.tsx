import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { scanUrl, ApiError } from '../services/api';
import type { DetectionResponse } from '../types/api';
import { RiskMeter } from '../components/RiskMeter';
import { FindingsBadge } from '../components/FindingsBadge';

const SAMPLE_URLS = [
  { label: 'Safe Official Site', url: 'https://github.com', type: 'safe' },
  { label: 'Brand Impersonation', url: 'http://paypal-security-update.com/login', type: 'phish' },
  { label: 'Raw IP Host', url: 'http://192.168.1.100/admin/auth.php', type: 'phish' },
  { label: 'Suspicious TLD (.tk)', url: 'http://secure-banking-alert.tk/verify', type: 'phish' },
  { label: 'URL Shortener', url: 'https://bit.ly/crypto-giveaway-claim', type: 'suspicious' },
];

export function ScannerPage() {
  const { user } = useAuth();
  const [inputUrl, setInputUrl] = useState('');
  const [userIdInput, setUserIdInput] = useState<number>(user?.userid || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const handleScan = async (targetUrl?: string) => {
    const urlToTest = (targetUrl || inputUrl).trim();
    if (!urlToTest) {
      setError('Please provide a URL to analyze');
      return;
    }

    // Basic URL validation
    if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const effectiveUserId = userIdInput || user?.userid || 1;
      const scanResult = await scanUrl(urlToTest, effectiveUserId);
      setResult(scanResult);
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

  const handleSelectSample = (sampleUrl: string) => {
    setInputUrl(sampleUrl);
    handleScan(sampleUrl);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Hero Banner */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(0, 242, 254, 0.1)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          color: 'var(--radar-cyan)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '16px',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--radar-cyan)' }} className="radar-pulse" />
          Enterprise Dual-Engine Phishing Detection
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 3.2rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          background: 'linear-gradient(180deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '14px',
        }}>
          Real-Time URL Threat Inspection
        </h1>
        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          maxWidth: '680px',
          margin: '0 auto',
        }}>
          Evaluate URLs instantly across machine learning RandomForest classification and 8-point regex heuristics to uncover deceptive links and credential theft traps.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}
        >
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
              fontSize: '1.2rem',
            }}>
              🔍
            </span>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter full URL to analyze (e.g. https://www.google.com or http://192.168.1.1/login)"
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <div style={{ width: '130px', position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              UID:
            </span>
            <input
              type="number"
              min="1"
              value={userIdInput}
              onChange={(e) => setUserIdInput(parseInt(e.target.value, 10) || 1)}
              title="Database user ID (required by POST /api/detect)"
              placeholder="1"
              style={{
                width: '100%',
                padding: '14px 14px 14px 44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            {isLoading ? (
              <>
                <span className="radar-sweep-icon">🔄</span>
                Analyzing URL...
              </>
            ) : (
              <>
                <span>🎯</span>
                Analyze Threat
              </>
            )}
          </button>
        </form>

        {/* Sample URLs */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
            Quick Test Cases:
          </span>
          {SAMPLE_URLS.map((sample) => (
            <button
              key={sample.url}
              onClick={() => handleSelectSample(sample.url)}
              style={{
                fontSize: '0.82rem',
                padding: '5px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: sample.type === 'phish' ? '#f87171' : sample.type === 'safe' ? '#34d399' : '#fbbf24',
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Results Display */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Banner Alert */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
              borderLeft: `6px solid ${
                result.finalresult === 'SUSPICIOUS' ? 'var(--danger-crimson)' :
                result.finalresult === 'REVIEW' ? 'var(--warning-amber)' : 'var(--safe-green)'
              }`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: result.finalresult === 'SUSPICIOUS' ? 'var(--danger-bg)' :
                  result.finalresult === 'REVIEW' ? 'var(--warning-bg)' : 'var(--safe-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
              }}>
                {result.finalresult === 'SUSPICIOUS' ? '🚨' :
                 result.finalresult === 'REVIEW' ? '⚠️' : '🛡️'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    {result.finalresult === 'SUSPICIOUS' ? 'Phishing Threat Flagged' :
                     result.finalresult === 'REVIEW' ? 'Suspicious Indicators Found' : 'Clean & Legitimate URL'}
                  </h2>
                  <span className={`badge ${
                    result.finalresult === 'SUSPICIOUS' ? 'badge-danger' :
                    result.finalresult === 'REVIEW' ? 'badge-review' : 'badge-safe'
                  }`}>
                    Action: {result.actiontaken}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
                  {result.message}
                </p>
                <div style={{
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--radar-blue)',
                  marginTop: '6px',
                  wordBreak: 'break-all',
                }}>
                  Target: {result.url}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowJson(!showJson)}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                {showJson ? 'Hide JSON' : 'Inspect Raw Telemetry'}
              </button>
            </div>
          </div>

          {/* Core Telemetry Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}>
            {/* Risk Score Gauge Card */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '20px' }}>
                Aggregate Security Risk
              </h3>
              <RiskMeter
                score={result.risckscore}
                verdict={result.finalresult}
                riskLevel={result.risklevel}
                size={200}
              />
              <div style={{
                marginTop: '20px',
                fontSize: '0.8rem',
                color: 'var(--text-dim)',
                textAlign: 'center',
                maxWidth: '260px',
              }}>
                Formula: Round(50% Regex + 50% ML Probability)
              </div>
            </div>

            {/* Dual Engine Analysis Breakdown */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡</span> Dual-Engine Inspector
              </h3>

              {/* Machine Learning Model */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🤖</span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Weka ML RandomForest</span>
                  </div>
                  <span className={`badge ${result.mlresult === 'PHISHING' ? 'badge-danger' : 'badge-safe'}`}>
                    {result.mlresult}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Phishing Probability:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                    {result.mlProbability}%
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.08)', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${result.mlProbability}%`,
                    height: '100%',
                    backgroundColor: result.mlProbability >= 60 ? 'var(--danger-crimson)' : result.mlProbability >= 30 ? 'var(--warning-amber)' : 'var(--safe-green)',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              {/* Regex Heuristics */}
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📐</span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Lexical Regex Engine</span>
                  </div>
                  <span className={`badge ${result.regexresult === 'SUSPICIOUS' ? 'badge-danger' : 'badge-safe'}`}>
                    {result.regexresult}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Lexical Risk Score:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                    {result.regexRiskScore} / 100
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255, 255, 255, 0.08)', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${result.regexRiskScore}%`,
                    height: '100%',
                    backgroundColor: result.regexRiskScore >= 60 ? 'var(--danger-crimson)' : result.regexRiskScore >= 30 ? 'var(--warning-amber)' : 'var(--safe-green)',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              {/* Host and Domain Details */}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                <span>Domain Target: <strong>{result.domain || 'N/A'}</strong></span>
                <span>Findings Count: <strong>{result.findings?.length || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Heuristic Findings Breakdown */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔎</span> Lexical Heuristic Triggers
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Pattern matching rules triggered based on character entropy, security keywords, and structural anomalies:
            </p>

            {result.findings && result.findings.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {result.findings.map((finding) => (
                  <FindingsBadge key={finding} findingKey={finding} />
                ))}
              </div>
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                border: '1px dashed rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#34d399',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>✨</div>
                <div style={{ fontWeight: 600 }}>Zero Lexical Anomalies Detected</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  No high-risk keywords, IP hostings, shortened links, or suspicious TLDs found.
                </div>
              </div>
            )}
          </div>

          {/* Raw JSON Modal/Inspector */}
          {showJson && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  Backend Response Payload (/api/detect)
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Copy JSON
                </button>
              </div>
              <pre style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                overflowX: 'auto',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--radar-cyan)',
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
