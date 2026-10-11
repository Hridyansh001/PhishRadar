export function ArchitecturePage() {
  const heuristics = [
    { rule: 'HIGHLY_SUSPICIOUS_DOMAIN', weight: '+30 pts', desc: 'Domain matches high-priority financial or credential interception impersonations.' },
    { rule: 'IP_ADDRESS_IN_URL', weight: '+25 pts', desc: 'Direct IPv4/IPv6 numerical host bypassing DNS resolution reputation systems.' },
    { rule: 'URL_SHORTENER_DETECTED', weight: '+10 pts', desc: 'Obfuscation redirects (bit.ly, tinyurl, t.co) concealing true landing endpoint.' },
    { rule: 'UNUSUALLY_LONG_URL', weight: '+10 pts', desc: 'String length exceeding 75 characters common in token poisoning and padding.' },
    { rule: 'SUSPICIOUS_KEYWORD', weight: '+10 pts', desc: 'Contains credential bait keywords (login, auth, secure, banking, verify, update).' },
    { rule: 'SUSPICIOUS_TLD', weight: '+10 pts', desc: 'Free or untrusted Top Level Domains historically correlated with phishing abuse (.tk, .cf, .gq).' },
    { rule: 'NOT_HTTPS', weight: '+5 pts', desc: 'Plaintext unencrypted HTTP transport missing TLS certificate verification.' },
    { rule: 'PERCENT_ENCODING_PRESENT', weight: '+5 pts', desc: 'Hexadecimal percent-encoding used to evade lexical signature filters.' },
  ];

  const mlFeatures = [
    { id: 1, name: 'url_length', type: 'Numeric', desc: 'Character count across the entire raw URI string' },
    { id: 2, name: 'domain_length', type: 'Numeric', desc: 'Character count of the isolated host authority' },
    { id: 3, name: 'count_dots', type: 'Numeric', desc: 'Frequency of period (.) delimiters indicating subdomain spoofing' },
    { id: 4, name: 'count_hyphens', type: 'Numeric', desc: 'Frequency of hyphens (-) used in typosquatting brand names' },
    { id: 5, name: 'count_digits', type: 'Numeric', desc: 'Total digits present across authority and resource path' },
    { id: 6, name: 'count_special_chars', type: 'Numeric', desc: 'Count of symbols (@, _, ?, =, &, %) used in deceptive URIs' },
    { id: 7, name: 'has_ip', type: 'Binary [0,1]', desc: 'Boolean flag indicating raw IPv4 dot-decimal or hexadecimal octets' },
    { id: 8, name: 'is_https', type: 'Binary [0,1]', desc: 'Boolean flag confirming TLS transport protocol security' },
    { id: 9, name: 'has_suspicious_words', type: 'Binary [0,1]', desc: 'Presence of credential-theft tokens in URI path or parameters' },
    { id: 10, name: 'count_subdomains', type: 'Numeric', desc: 'Depth of DNS subdomain hierarchy above public suffix' },
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
          <span>⚡</span> Architectural Whitepaper
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(180deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '12px',
        }}>
          PhishRadar Dual-Engine Pipeline
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '720px', margin: '0 auto' }}>
          How PhishRadar fuses Weka Random Forest classification with 8-point lexical heuristic scoring to yield high-fidelity threat verdicts.
        </p>
      </div>

      {/* Pipeline Diagram Grid */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔄</span> Multi-Stage Detection Pipeline
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          position: 'relative',
        }}>
          {/* Step 1 */}
          <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--radar-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>STAGE 01</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Ingestion & Normalization</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Target URI parsed into domain, protocol, host, and path tokens. Website entity created or fetched from MySQL.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--radar-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>STAGE 02</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Feature Vectorization</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              10 numeric and binary lexical signals extracted by <code>urlfeatureextractor</code> and compiled into Weka Instances.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--radar-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>STAGE 03</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Dual Inference</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              RandomForest (100 trees) predicts phishing probability; Regex engine executes 8 heuristic checks for cumulative risk.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--radar-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>STAGE 04</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Score Fusion & Policy</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Weights blended (50% ML + 50% Heuristics). Verdict categorized into SAFE, REVIEW, or SUSPICIOUS with DB persistence.
            </p>
          </div>
        </div>

        {/* Fusion Formula Callout */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--radar-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Mathematical Scoring Fusion Formula
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
              Combined Risk Score = Math.round( 0.5 &times; RegexScore + 0.5 &times; MLProbability )
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Clamped to range [0, 100] &bull; Stored in DB as <code>risckscore</code>
          </div>
        </div>
      </div>

      {/* Decision Thresholds Matrix */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⚖️</span> Decision Matrix & Threshold Rules
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Condition Trigger</th>
                <th style={{ padding: '12px 16px' }}>Final Verdict</th>
                <th style={{ padding: '12px 16px' }}>Action Taken</th>
                <th style={{ padding: '12px 16px' }}>Risk Level</th>
                <th style={{ padding: '12px 16px' }}>Browser Action</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                  ML Prob &ge; 80% OR Combined Score &ge; 60
                </td>
                <td style={{ padding: '14px 16px' }}><span className="badge badge-danger">SUSPICIOUS</span></td>
                <td style={{ padding: '14px 16px' }}>WARNING</td>
                <td style={{ padding: '14px 16px', color: '#f87171', fontWeight: 600 }}>HIGH</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>Block navigation &bull; Display warning interstitial page</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                  ML Prob &ge; 50% OR Combined Score &ge; 30
                </td>
                <td style={{ padding: '14px 16px' }}><span className="badge badge-review">REVIEW</span></td>
                <td style={{ padding: '14px 16px' }}>REVIEW</td>
                <td style={{ padding: '14px 16px', color: '#fbbf24', fontWeight: 600 }}>MEDIUM</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>Allow access &bull; Badge icon amber &bull; Prompt user caution</td>
              </tr>
              <tr>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                  ML Prob &lt; 50% AND Combined Score &lt; 30
                </td>
                <td style={{ padding: '14px 16px' }}><span className="badge badge-safe">SAFE</span></td>
                <td style={{ padding: '14px 16px' }}>ALLOWED</td>
                <td style={{ padding: '14px 16px', color: '#34d399', fontWeight: 600 }}>LOW</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>Transparent pass-through &bull; Badge icon emerald</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Columns: 10 ML Features and 8 Regex Rules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* ML Features */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              🤖 10 URL Machine Learning Features
            </h3>
            <span className="badge badge-neutral">RandomForest</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mlFeatures.map((f) => (
              <div
                key={f.id}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--radar-cyan)' }}>
                    #{f.id} {f.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {f.type}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regex Rules */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              📐 8 Lexical Heuristic Rules
            </h3>
            <span className="badge badge-neutral">Max Score: 100</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {heuristics.map((h) => (
              <div
                key={h.rule}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                    {h.rule}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    fontWeight: 700,
                  }}>
                    {h.weight}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {h.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
