interface FindingMeta {
  label: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  score: number;
}

const FINDING_MAP: Record<string, FindingMeta> = {
  IP_ADDRESS_IN_URL: {
    label: 'Raw IP Host',
    description: 'Host uses an IP address instead of a registered domain name',
    severity: 'high',
    score: 25,
  },
  HIGHLY_SUSPICIOUS_DOMAIN: {
    label: 'Suspicious Domain Name',
    description: 'Domain mimics sensitive brand or banking institutions',
    severity: 'high',
    score: 30,
  },
  URL_SHORTENER_DETECTED: {
    label: 'URL Shortener',
    description: 'Hides true destination using an obfuscating redirect service',
    severity: 'medium',
    score: 10,
  },
  UNUSUALLY_LONG_URL: {
    label: 'Excessive URL Length',
    description: 'URL length exceeds standard safety thresholds (>75 chars)',
    severity: 'medium',
    score: 10,
  },
  SUSPICIOUS_KEYWORD: {
    label: 'Security Keywords in Path',
    description: 'Contains credential-harvesting tokens (login, verify, update)',
    severity: 'medium',
    score: 10,
  },
  SUSPICIOUS_TLD: {
    label: 'High-Risk TLD',
    description: 'Uses top-level domain frequently abused for phishing (.tk, .cf, etc.)',
    severity: 'medium',
    score: 10,
  },
  NOT_HTTPS: {
    label: 'Insecure Protocol (HTTP)',
    description: 'Traffic is transmitted unencrypted without TLS certificate',
    severity: 'low',
    score: 5,
  },
  PERCENT_ENCODING_PRESENT: {
    label: 'Obfuscated Hex Characters',
    description: 'Percent-encoding found masking parts of URL structure',
    severity: 'low',
    score: 5,
  },
};

export function FindingsBadge({ findingKey }: { findingKey: string }) {
  const meta = FINDING_MAP[findingKey] || {
    label: findingKey.replace(/_/g, ' '),
    description: 'Heuristic anomaly flagged during URL lexical breakdown',
    severity: 'medium',
    score: 10,
  };

  const getSeverityStyle = () => {
    switch (meta.severity) {
      case 'high':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          icon: '🛑',
        };
      case 'medium':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          icon: '⚠️',
        };
      case 'low':
      default:
        return {
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.25)',
          color: '#38bdf8',
          icon: 'ℹ️',
        };
    }
  };

  const style = getSeverityStyle();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        transition: 'transform 0.15s ease',
      }}
      title={meta.description}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{style.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: style.color }}>
            {meta.label}
          </span>
          <span style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'var(--text-muted)',
          }}>
            +{meta.score} pts
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {meta.description}
        </p>
      </div>
    </div>
  );
}
